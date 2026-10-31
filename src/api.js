// A6API client: session-token discovery, channel-pinned gateway calls and SSE.
(() => {
  "use strict";
  if (globalThis.A6PAPI) return;
  const A6P = globalThis.A6P;

  class ApiError extends Error {
    constructor(message, { status = 0, code = "", detail = "", retryAfter = "" } = {}) {
      super(message || code || "Request failed");
      this.name = "ApiError";
      this.status = status;
      this.code = code;
      this.detail = detail;
      this.retryAfter = retryAfter;
    }
  }


  function readSiteTokenId() {
    try {
      const fromUrl = Number(new URLSearchParams(window.location.search).get("token_id"));
      if (Number.isSafeInteger(fromUrl) && fromUrl > 0) return String(fromUrl);
      const value = Number(window.localStorage.getItem("supplier_marketplace_last_token_id"));
      return Number.isSafeInteger(value) && value > 0 ? String(value) : "";
    } catch {
      return "";
    }
  }

  function readUserId() {
    const keys = ["a6api_session_user_id"];
    for (const storage of [window.localStorage, window.sessionStorage]) {
      try {
        for (const key of keys) {
          const value = Number(storage.getItem(key));
          if (Number.isSafeInteger(value) && value > 0) return value;
        }
      } catch {
        // Storage can be unavailable in hardened profiles.
      }
    }
    return null;
  }

  function parseJson(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function errorMessage(status, payload, raw) {
    const candidates = [
      payload?.error?.message,
      payload?.message,
      payload?.msg,
      payload?.error,
      typeof payload?.data === "string" ? payload.data : "",
      typeof raw === "string" ? raw : "",
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        const value = candidate.trim();
        if (/^<!doctype|^<html/i.test(value)) return `HTTP ${status}: the server returned an HTML page`;
        return `HTTP ${status}: ${value.slice(0, 500)}`;
      }
    }
    return `HTTP ${status}`;
  }

  async function apiRequest(path, { method = "GET", body, query, signal } = {}) {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
      throw new ApiError("Refusing to call a non-A6API endpoint", { code: "bad_path" });
    }
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    const userId = readUserId();
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (userId) headers["New-Api-User"] = String(userId);
    let response;
    try {
      response = await fetch(url.pathname + url.search, {
        method,
        credentials: "same-origin",
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new ApiError("Network unavailable while contacting A6API", { code: "network", detail: String(error?.message || error) });
    }
    const text = await response.text();
    const payload = parseJson(text);
    if (!response.ok || payload?.success === false) {
      throw new ApiError(errorMessage(response.status, payload, text), {
        status: response.status,
        code: typeof payload?.code === "string" ? payload.code : "",
        detail: text.slice(0, 1000),
        retryAfter: response.headers.get("Retry-After") || "",
      });
    }
    return payload;
  }

  async function listTokens({ signal } = {}) {
    const all = [];
    const seen = new Set();
    for (let page = 1; page <= 5; page += 1) {
      const payload = await apiRequest("/api/token/", { query: { p: page, size: 100 }, signal });
      const items = A6P.extractItems(payload).map(A6P.normalizeToken).filter(Boolean);
      let added = 0;
      for (const token of items) {
        if (seen.has(token.id)) continue;
        seen.add(token.id);
        all.push(token);
        added += 1;
      }
      const total = Number(payload?.total ?? payload?.data?.total ?? 0);
      if (!added || items.length < 100 || (total > 0 && all.length >= total)) break;
    }
    return all;
  }

  async function discoverSession({ signal } = {}) {
    try {
      const tokens = await listTokens({ signal });
      return { loggedIn: true, tokens, error: "" };
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      const loggedIn = !(error instanceof ApiError && error.status === 401);
      return { loggedIn, tokens: [], error: error?.message || String(error) };
    }
  }

  async function getTokenKey(tokenId, { signal } = {}) {
    const payload = await apiRequest(`/api/token/${encodeURIComponent(String(tokenId))}/key`, {
      method: "POST",
      body: {},
      signal,
    });
    const key = A6P.extractTokenKey(payload);
    if (!key) throw new ApiError("A6API did not return a key for this token", { code: "token_key_failed" });
    return key;
  }

  function tokenSupportsModel(token, model) {
    if (!token) return false;
    const limits = String(token.modelLimits || "").trim();
    if (!limits) return true;
    if (limits === "all" || limits === "*") return true;
    const wanted = String(model || "").trim().toLowerCase();
    if (!wanted) return true;
    return limits
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
      .some((part) => part === wanted || part === "*" || (part.endsWith("*") && wanted.startsWith(part.slice(0, -1))));
  }

  function pickToken(tokens, preferredId, model) {
    const list = Array.isArray(tokens) ? tokens : [];
    if (!list.length) return null;
    const preferred = preferredId ? list.find((token) => String(token.id) === String(preferredId)) : null;
    if (preferred && A6P.isTokenUsable(preferred) && tokenSupportsModel(preferred, model)) return preferred;
    const usable = list.filter((token) => A6P.isTokenUsable(token));
    const supports = usable.filter((token) => tokenSupportsModel(token, model));
    return supports[0] || usable[0] || list.find((token) => String(token.id) === String(preferredId)) || list[0];
  }

  function channelAuthorization(tokenKey, channelId) {
    const raw = String(tokenKey || "").trim().replace(/^Bearer\s+/i, "");
    const key = raw.startsWith("sk-") ? raw.slice(3) : raw;
    const id = Number(channelId);
    if (!key) throw new ApiError("No A6API token key is available", { code: "no_key" });
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError("Missing channel id", { code: "no_channel" });
    return `Bearer sk-${key}-${id}`;
  }

  function contentText(value) {
    if (typeof value === "string") return value;
    if (!Array.isArray(value)) return "";
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        if (part && typeof part.content === "string") return part.content;
        return "";
      })
      .join("");
  }

  function normalizeToolCalls(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((call, index) => {
        const fn = call?.function || call || {};
        const id = String(call?.id || call?.call_id || `call_${index + 1}`);
        const name = String(fn.name || call?.name || "");
        const args = typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? call?.arguments ?? {});
        return { id, name, arguments: args || "{}", index };
      })
      .filter((call) => call.name);
  }

  function mergeToolCall(acc, call, index) {
    const i = Number.isSafeInteger(call?.index) ? call.index : Number.isSafeInteger(index) ? index : acc.toolCalls.length;
    if (!acc.toolCalls[i]) acc.toolCalls[i] = { id: "", name: "", arguments: "", index: i };
    const slot = acc.toolCalls[i];
    const fn = call?.function || call || {};
    if (call?.id) slot.id = String(call.id);
    if (fn.name) {
      if (!slot.name) slot.name = String(fn.name);
      else if (!slot.name.endsWith(String(fn.name))) slot.name += String(fn.name);
    }
    if (typeof fn.arguments === "string") slot.arguments += fn.arguments;
    else if (fn.arguments && typeof fn.arguments === "object") slot.arguments += JSON.stringify(fn.arguments);
  }

  function accumulateChat(payload, acc) {
    if (!payload || typeof payload !== "object") return false;
    if (payload.error) {
      acc.error = payload.error?.message || payload.error?.msg || String(payload.error);
      return false;
    }
    if (payload.usage) acc.usage = payload.usage;
    const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
    if (!choice) return false;
    const part = choice.delta || choice.message || {};
    let changed = false;
    const text = contentText(part.content);
    if (text) {
      acc.text += text;
      changed = true;
    }
    if (Array.isArray(part.tool_calls)) {
      part.tool_calls.forEach((call, index) => mergeToolCall(acc, call, index));
      changed = true;
    }
    if (part.function_call && typeof part.function_call === "object") {
      mergeToolCall(acc, { index: 0, id: "call_legacy", function: part.function_call }, 0);
      changed = true;
    }
    const reasoning = part.reasoning_content ?? part.reasoning ?? part.thinking;
    if (typeof reasoning === "string") acc.reasoningChars += reasoning.length;
    if (choice.finish_reason) acc.finishReason = String(choice.finish_reason);
    return changed;
  }

  function extractResponseOutput(payload, acc) {
    const response = payload.response || payload;
    if (response?.usage) acc.usage = response.usage;
    const data = response?.output_text ?? response?.outputText;
    if (typeof data === "string" && data) acc.text += data;
    const output = Array.isArray(response?.output) ? response.output : [];
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      if (item.type === "function_call" || item.type === "function_call_output") {
        const call = normalizeToolCalls([item])[0];
        if (call) acc.toolCalls.push(call);
      }
      const content = Array.isArray(item.content) ? item.content : [];
      for (const part of content) {
        if (part?.type === "output_text" && typeof part.text === "string") acc.text += part.text;
        if (part?.type === "text" && typeof part.text === "string") acc.text += part.text;
      }
    }
    if (response?.status === "incomplete") acc.finishReason = response?.incomplete_details?.reason || "incomplete";
    else if (response?.status) acc.finishReason = response.status;
  }

  function accumulateResponses(payload, acc) {
    if (!payload || typeof payload !== "object") return false;
    const type = String(payload.type || "");
    if (type === "response.output_text.delta" && typeof payload.delta === "string") {
      acc.text += payload.delta;
      return true;
    }
    if ((type === "response.reasoning_summary_text.delta" || type === "response.reasoning_text.delta") && typeof payload.delta === "string") {
      acc.reasoningChars += payload.delta.length;
      return false;
    }
    if (type === "response.output_item.done" && payload.item?.type === "function_call") {
      const call = normalizeToolCalls([payload.item])[0];
      if (call) acc.toolCalls.push(call);
      return true;
    }
    if (type === "response.completed" || type === "response.incomplete") {
      const response = payload.response || {};
      if (response.usage) acc.usage = response.usage;
      if (response.status === "incomplete") acc.finishReason = response?.incomplete_details?.reason || "incomplete";
      else acc.finishReason = acc.finishReason || "stop";
      if (!acc.text && !acc.toolCalls.length) extractResponseOutput(payload, acc);
      return false;
    }
    if (type === "response.failed" || type === "error") {
      acc.error = payload?.response?.error?.message || payload?.error?.message || payload?.message || "The upstream reported an error";
      return false;
    }
    if (!type && payload.object === "response") {
      extractResponseOutput(payload, acc);
      return true;
    }
    return false;
  }

  async function readSse(response, accumulate, acc, onEvent) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sawData = false;
    let lastTextLength = 0;
    let lastReasoningChars = 0;

    const handleLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith(":")) {
        onEvent?.({ type: "heartbeat" });
        return;
      }
      if (!trimmed.startsWith("data:")) return;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") return;
      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        return;
      }
      sawData = true;
      const changed = accumulate(payload, acc);
      if (acc.error) return;
      if (acc.reasoningChars > lastReasoningChars) {
        const shouldEmit = lastReasoningChars === 0 || acc.reasoningChars - lastReasoningChars >= 40;
        lastReasoningChars = acc.reasoningChars;
        if (shouldEmit) {
          onEvent?.({ type: "reasoning", chars: acc.reasoningChars, text: acc.text, toolCalls: acc.toolCalls });
        }
      }
      if (changed || acc.text.length !== lastTextLength) {
        lastTextLength = acc.text.length;
        onEvent?.({ type: "delta", text: acc.text, chars: acc.text.length, reasoningChars: acc.reasoningChars, toolCalls: acc.toolCalls });
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        handleLine(buffer.slice(0, newline).replace(/\r$/, ""));
        buffer = buffer.slice(newline + 1);
        if (acc.error) break;
      }
      if (acc.error) break;
    }
    buffer += decoder.decode();
    if (buffer.trim()) handleLine(buffer.trim());
    if (acc.error) throw new ApiError(acc.error, { code: "upstream_error" });
    return sawData;
  }

  function consumeSseText(raw, accumulate, acc, onEvent) {
    let sawData = false;
    for (const line of String(raw || "").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }
      sawData = true;
      accumulate(payload, acc);
      if (acc.error) throw new ApiError(acc.error, { code: "upstream_error" });
    }
    if (acc.reasoningChars > 0) {
      onEvent?.({ type: "reasoning", chars: acc.reasoningChars, text: acc.text, toolCalls: acc.toolCalls });
    }
    if (sawData) onEvent?.({ type: "delta", text: acc.text, chars: acc.text.length, reasoningChars: acc.reasoningChars, toolCalls: acc.toolCalls });
    return sawData;
  }

  function buildTools() {
    return [
      {
        type: "function",
        function: {
          name: "write_file",
          description:
            "Create or overwrite a text file in the browser scratch directory. Use this for complete SVG, HTML, CSS, JS or Markdown files. Do not paste the full file into chat when this tool is available.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "File name, for example pelican-riding-bicycle.svg" },
              content: { type: "string", description: "Complete file contents" },
            },
            required: ["path", "content"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read a file from the browser scratch directory.",
          parameters: {
            type: "object",
            properties: { path: { type: "string", description: "File name to read" } },
            required: ["path"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_files",
          description: "List files in the browser scratch directory.",
          parameters: { type: "object", properties: {} },
        },
      },
    ];
  }

  function chatBody({ model, messages, maxTokens, stream, tools }) {
    const body = {
      model,
      messages,
      max_tokens: maxTokens,
      stream: !!stream,
    };
    if (stream) body.stream_options = { include_usage: true };
    if (tools && tools.length) body.tools = tools;
    return body;
  }

  function responsesBody({ model, messages, maxTokens, stream, instructions }) {
    const system = instructions || messages.filter((message) => message.role === "system").map((message) => contentText(message.content)).join("\n");
    const conversation = messages.filter((message) => message.role !== "system");
    const input = conversation
      .map((message) => {
        const text = contentText(message.content);
        if (!text) return "";
        if (message.role === "assistant") return `Assistant: ${text}`;
        if (message.role === "tool") return `Tool result: ${text}`;
        return `User: ${text}`;
      })
      .filter(Boolean)
      .join("\n\n");
    const body = {
      model,
      input: input || "Hello",
      max_output_tokens: maxTokens,
      stream: !!stream,
    };
    if (system) body.instructions = system;
    return body;
  }

  async function postGateway(path, body, authorization, { signal, onEvent } = {}) {
    const started = performance.now();
    onEvent?.({ type: "status", phase: "requesting", text: "Sending request…" });
    let response;
    try {
      response = await fetch(path, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new ApiError("Network error while contacting the A6API gateway", { code: "network", detail: String(error?.message || error) });
    }
    const firstByteMs = Math.round(performance.now() - started);
    return { response, firstByteMs, started };
  }

  async function callChat({ tokenKey, channelId, model, messages, maxTokens, stream = true, tools = null, signal, onEvent }) {
    const authorization = channelAuthorization(tokenKey, channelId);
    let useStream = !!stream;
    let fellBack = false;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const body = chatBody({ model, messages, maxTokens, stream: useStream, tools });
      const { response, firstByteMs, started } = await postGateway("/v1/chat/completions", body, authorization, { signal, onEvent });
      const contentType = response.headers.get("content-type") || "";
      const acc = { text: "", reasoningChars: 0, toolCalls: [], finishReason: "", usage: null, error: "" };

      if (!response.ok) {
        const raw = await response.text();
        const payload = parseJson(raw);
        const message = errorMessage(response.status, payload, raw);
        const error = new ApiError(message, { status: response.status, code: codeFromPayload(payload), detail: raw.slice(0, 2000) });
        lastError = error;
        const canRetryStream =
          useStream &&
          !fellBack &&
          response.status >= 400 &&
          response.status < 500 &&
          /stream|sse|event-stream|not support.*stream/i.test(message);
        if (canRetryStream) {
          useStream = false;
          fellBack = true;
          onEvent?.({ type: "status", phase: "fallback", text: "Streaming was rejected; retrying without stream…" });
          continue;
        }
        throw error;
      }

      let mode = useStream ? "stream" : "non_stream";
      const isSse = contentType.includes("text/event-stream");
      if (useStream && isSse) {
        onEvent?.({ type: "status", phase: "streaming", text: "Connected. Waiting for upstream content…" });
        const sawData = await readSse(response, accumulateChat, acc, onEvent);
        if (!sawData && !acc.text && !acc.toolCalls.length) {
          // Do not silently retry a 200 response: that can bill the same probe twice.
          throw new ApiError("The stream contained no usable data", { code: "invalid_stream" });
        }
      } else {
        const raw = await response.text();
        if (useStream && /^\s*data:/m.test(raw)) {
          const sawData = consumeSseText(raw, accumulateChat, acc, onEvent);
          if (!sawData && !acc.text && !acc.toolCalls.length) {
            throw new ApiError("The stream contained no usable data", { code: "invalid_stream" });
          }
        } else {
          mode = "non_stream";
          const payload = parseJson(raw);
          if (payload === null && raw.trim()) {
            throw new ApiError("The gateway returned a non-JSON response", { code: "non_json", detail: raw.slice(0, 1000) });
          }
          accumulateChat(payload, acc);
          if (acc.error) throw new ApiError(acc.error, { code: "upstream_error" });
        }
      }

      const toolCalls = acc.toolCalls.filter((call) => call && call.name).map((call) => ({
        id: call.id || makeCallId(),
        name: call.name,
        arguments: call.arguments || "{}",
      }));
      return {
        text: acc.text,
        reasoningChars: acc.reasoningChars,
        toolCalls,
        finishReason: acc.finishReason,
        usage: acc.usage,
        mode,
        fellBack,
        firstByteMs,
        durationMs: Math.round(performance.now() - started),
      };
    }
    throw lastError || new ApiError("The request failed", { code: "unknown" });
  }

  async function callResponses({ tokenKey, channelId, model, messages, maxTokens, stream = true, signal, onEvent }) {
    const authorization = channelAuthorization(tokenKey, channelId);
    let useStream = !!stream;
    let fellBack = false;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const body = responsesBody({ model, messages, maxTokens, stream: useStream });
      const { response, firstByteMs, started } = await postGateway("/v1/responses", body, authorization, { signal, onEvent });
      const contentType = response.headers.get("content-type") || "";
      const acc = { text: "", reasoningChars: 0, toolCalls: [], finishReason: "", usage: null, error: "" };

      if (!response.ok) {
        const raw = await response.text();
        const payload = parseJson(raw);
        const message = errorMessage(response.status, payload, raw);
        const error = new ApiError(message, { status: response.status, code: codeFromPayload(payload), detail: raw.slice(0, 2000) });
        lastError = error;
        const canRetryStream =
          useStream &&
          !fellBack &&
          response.status >= 400 &&
          response.status < 500 &&
          /stream|sse|event-stream|not support.*stream/i.test(message);
        if (canRetryStream) {
          useStream = false;
          fellBack = true;
          onEvent?.({ type: "status", phase: "fallback", text: "Streaming was rejected; retrying without stream…" });
          continue;
        }
        throw error;
      }

      const isSse = contentType.includes("text/event-stream");
      if (useStream && isSse) {
        onEvent?.({ type: "status", phase: "streaming", text: "Connected. Waiting for upstream content…" });
        const sawData = await readSse(response, accumulateResponses, acc, onEvent);
        if (!sawData && !acc.text) {
          throw new ApiError("The stream contained no usable data", { code: "invalid_stream" });
        }
      } else {
        const raw = await response.text();
        if (useStream && /^\s*data:/m.test(raw)) {
          const sawData = consumeSseText(raw, accumulateResponses, acc, onEvent);
          if (!sawData && !acc.text) {
            throw new ApiError("The stream contained no usable data", { code: "invalid_stream" });
          }
        } else {
          const payload = parseJson(raw);
          if (payload === null && raw.trim()) {
            throw new ApiError("The gateway returned a non-JSON response", { code: "non_json", detail: raw.slice(0, 1000) });
          }
          accumulateResponses(payload, acc);
          if (acc.error) throw new ApiError(acc.error, { code: "upstream_error" });
        }
      }

      return {
        text: acc.text,
        reasoningChars: acc.reasoningChars,
        toolCalls: acc.toolCalls.filter((call) => call && call.name),
        finishReason: acc.finishReason,
        usage: acc.usage,
        mode: useStream ? "stream" : "non_stream",
        fellBack,
        firstByteMs,
        durationMs: Math.round(performance.now() - started),
      };
    }
    throw lastError || new ApiError("The request failed", { code: "unknown" });
  }

  function codeFromPayload(payload) {
    if (!payload || typeof payload !== "object") return "";
    if (typeof payload.code === "string") return payload.code;
    if (typeof payload.error?.code === "string") return payload.error.code;
    return "";
  }

  function makeCallId() {
    return `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function isToolsUnsupported(error) {
    if (!(error instanceof ApiError)) return false;
    if (![400, 404, 422, 501].includes(Number(error.status))) return false;
    return /tool|function|tool_choice|tools are not supported|unsupported parameter/i.test(`${error.message} ${error.detail}`);
  }

  function isStreamUnsupported(error) {
    if (!(error instanceof ApiError)) return false;
    return /stream|sse|event-stream/i.test(`${error.message} ${error.detail}`);
  }

  async function callModel({ endpoint, tokenKey, channelId, model, messages, maxTokens, stream, tools, signal, onEvent }) {
    if (endpoint === "responses") {
      return callResponses({ tokenKey, channelId, model, messages, maxTokens, stream, signal, onEvent });
    }
    return callChat({ tokenKey, channelId, model, messages, maxTokens, stream, tools, signal, onEvent });
  }

  globalThis.A6PAPI = {
    ApiError,
    readUserId,
    readSiteTokenId,
    apiRequest,
    listTokens,
    discoverSession,
    getTokenKey,
    tokenSupportsModel,
    pickToken,
    channelAuthorization,
    buildTools,
    callChat,
    callResponses,
    callModel,
    isToolsUnsupported,
    isStreamUnsupported,
    contentText,
  };
})();
