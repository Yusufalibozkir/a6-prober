// Probe definitions and the small browser-side agent loop.
(() => {
  "use strict";
  if (globalThis.A6PProbes) return;
  const A6P = globalThis.A6P;
  const API = globalThis.A6PAPI;

  function artifactFromFile(file) {
    return {
      path: file.path,
      kind: file.kind,
      bytes: file.bytes,
      content: file.content,
      action: file.action || "write",
      modifiedAt: file.modifiedAt,
    };
  }

  function parseArguments(raw) {
    const text = String(raw || "").trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      const first = text.indexOf("{");
      const last = text.lastIndexOf("}");
      if (first >= 0 && last > first) {
        try {
          return JSON.parse(text.slice(first, last + 1));
        } catch {
          // Fall through.
        }
      }
      throw new Error("Tool arguments were not valid JSON.");
    }
  }

  function executeToolCall(call, scratch) {
    const rawName = String(call?.name || "");
    const nameAliases = {
      create_file: "write_file",
      writefile: "write_file",
      save_file: "write_file",
      write: "write_file",
      readfile: "read_file",
      open_file: "read_file",
      list_directory: "list_files",
      ls: "list_files",
    };
    const name = nameAliases[rawName.toLowerCase()] || rawName;
    let args;
    try {
      args = parseArguments(call?.arguments);
    } catch (error) {
      return {
        ok: false,
        result: `Error: ${error.message}`,
        event: { action: "error", tool: name, message: error.message },
      };
    }

    if (name === "write_file") {
      const path = String(args.path || "").trim();
      const content = String(args.content ?? "");
      if (!path || !content) {
        return { ok: false, result: "Error: write_file needs a path and complete content.", event: { action: "error", tool: name, message: "missing path or content" } };
      }
      try {
        const file = scratch.write(path, content, { action: "write" });
        return {
          ok: true,
          result: `Wrote ${file.path} (${file.bytes} bytes). It is now in the browser scratch directory.`,
          event: { action: "write", tool: name, artifact: artifactFromFile(file) },
        };
      } catch (error) {
        return { ok: false, result: `Error: ${error.message}`, event: { action: "error", tool: name, message: error.message } };
      }
    }

    if (name === "read_file") {
      const path = String(args.path || "").trim();
      const file = scratch.read(path);
      if (!file) {
        return { ok: false, result: `Error: no file named ${path || "(empty path)"} in the scratch directory.`, event: { action: "error", tool: name, message: `missing ${path}` } };
      }
      const limit = 60000;
      const content = file.content.length > limit ? `${file.content.slice(0, limit)}\n\n[truncated by A6 Prober]` : file.content;
      return {
        ok: true,
        result: `Contents of ${file.path}:\n\n${content}`,
        event: { action: "read", tool: name, artifact: artifactFromFile(file) },
      };
    }

    if (name === "list_files") {
      const files = scratch.list();
      const text = files.length ? files.map((file) => `${file.path} (${file.bytes} bytes)`).join("\n") : "(scratch directory is empty)";
      return {
        ok: true,
        result: text,
        event: { action: "list", tool: name, files: files.map(artifactFromFile) },
      };
    }

    return { ok: false, result: `Error: unknown tool ${name || "(empty)"}.`, event: { action: "error", tool: name || "unknown", message: "unknown tool" } };
  }

  function mergeUsage(current, next) {
    if (!next || typeof next !== "object") return current || null;
    if (!current) return { ...next };
    const merged = { ...current };
    for (const [key, value] of Object.entries(next)) {
      if (typeof value === "number" && typeof merged[key] === "number") merged[key] += value;
      else merged[key] = value;
    }
    return merged;
  }

  function cloneMessages(messages) {
    return (Array.isArray(messages) ? messages : []).map((message) => ({
      ...message,
      content: Array.isArray(message.content) ? message.content.map((part) => ({ ...part })) : message.content,
      ...(Array.isArray(message.tool_calls) ? { tool_calls: message.tool_calls.map((call) => ({ ...call, function: { ...call.function } })) } : {}),
    }));
  }

  function endpointUnsupported(error) {
    if (!(error instanceof API.ApiError)) return false;
    if ([404, 405, 501].includes(Number(error.status))) return true;
    return Number(error.status) === 400 && /endpoint|not found|unsupported|no route|unknown url/i.test(`${error.message} ${error.detail}`);
  }

  async function callProbeModel({ endpoint, ...args }) {
    // Chat Completions is the most widely supported path. Even rows that the
    // marketplace labels "responses" often accept chat; use it first and only
    // fall back to /v1/responses when the gateway says chat is unavailable.
    const preferred = endpoint === "responses" ? "responses" : "chat";
    try {
      return await API.callModel({ ...args, endpoint: "chat" });
    } catch (error) {
      if (preferred === "responses" && endpointUnsupported(error)) {
        args.onEvent?.({ type: "status", phase: "endpoint_fallback", text: "Chat endpoint unavailable; retrying the responses endpoint…" });
        return API.callModel({ ...args, endpoint: "responses" });
      }
      throw error;
    }
  }

  async function runAgentTurn({
    endpoint,
    tokenKey,
    channelId,
    model,
    messages,
    maxTokens,
    stream,
    useTools,
    scratch,
    signal,
    onEvent,
    maxTurns = 4,
    promptHint = "",
  }) {
    let conversation = cloneMessages(messages);
    let actualTools = useTools;
    let combinedText = "";
    let reasoningChars = 0;
    let allToolCalls = [];
    let usage = null;
    let mode = stream ? "stream" : "non_stream";
    let fellBack = false;
    let firstByteMs = null;
    let startedAt = performance.now();
    let turns = 0;
    let toolsUsed = 0;
    let toolFallback = false;

    if (actualTools) {
      const fallbackRemoved = conversation.some((message) => message.role === "system" && /tool/i.test(String(message.content || "")));
      // Not a real check; kept for clarity. Tools are attached below.
      void fallbackRemoved;
    }

    while (turns < maxTurns) {
      turns += 1;
      let result;
      try {
        result = await callProbeModel({
          endpoint,
          tokenKey,
          channelId,
          model,
          messages: conversation,
          maxTokens,
          stream,
          tools: actualTools ? API.buildTools() : null,
          signal,
          onEvent,
        });
      } catch (error) {
        if (actualTools && API.isToolsUnsupported(error)) {
          actualTools = false;
          toolFallback = true;
          onEvent?.({ type: "status", phase: "tools_fallback", text: "This channel rejected tools; continuing with text artifacts…" });
          continue;
        }
        throw error;
      }

      combinedText += result.text || "";
      reasoningChars += Number(result.reasoningChars) || 0;
      usage = mergeUsage(usage, result.usage);
      mode = result.mode || mode;
      fellBack = fellBack || !!result.fellBack;
      if (firstByteMs === null && Number.isFinite(result.firstByteMs)) firstByteMs = result.firstByteMs;
      if (Array.isArray(result.toolCalls) && result.toolCalls.length) allToolCalls = allToolCalls.concat(result.toolCalls);

      const calls = actualTools && Array.isArray(result.toolCalls) ? result.toolCalls : [];
      if (calls.length) {
        conversation.push({
          role: "assistant",
          content: result.text || null,
          tool_calls: calls.map((call) => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: call.arguments || "{}" },
          })),
        });
        for (const call of calls) {
          const executed = executeToolCall(call, scratch);
          toolsUsed += 1;
          onEvent?.({
            type: "tool",
            tool: call.name,
            action: executed.event.action,
            artifact: executed.event.artifact || null,
            files: executed.event.files || null,
            message: executed.event.message || "",
          });
          conversation.push({
            role: "tool",
            tool_call_id: call.id,
            content: executed.result,
          });
        }
        onEvent?.({ type: "status", phase: "agent", text: "Agent is working…" });
        continue;
      }

      // Some models ignore tools and return fenced artifacts instead.
      const artifacts = A6P.parseArtifacts(result.text, { hintText: `${promptHint}\n${combinedText}` });
      if (artifacts.length) {
        for (const artifact of artifacts) {
          const finalPath = artifact.path;
          if (!scratch.read(finalPath)) {
            try {
              const file = scratch.write(finalPath, artifact.content, { action: "write", hint: "parsed from reply" });
              onEvent?.({
                type: "tool",
                tool: "write_file",
                action: "write",
                artifact: artifactFromFile(file),
                parsed: true,
              });
            } catch {
              // Ignore files that cannot fit in the scratch directory.
            }
          }
        }
      }

      conversation.push({ role: "assistant", content: result.text || "" });
      return {
        conversation,
        text: combinedText.trim(),
        reasoningChars,
        toolCalls: allToolCalls,
        usage,
        mode,
        fellBack,
        firstByteMs,
        durationMs: Math.round(performance.now() - startedAt),
        turns,
        toolsUsed,
        toolFallback,
      };
    }

    conversation.push({
      role: "assistant",
      content: combinedText || "(The agent reached its turn limit before replying.)",
    });
    return {
      conversation,
      text: combinedText.trim(),
      reasoningChars,
      toolCalls: allToolCalls,
      usage,
      mode,
      fellBack,
      firstByteMs,
      durationMs: Math.round(performance.now() - startedAt),
      turns,
      toolsUsed,
      toolFallback,
      limitReached: true,
    };
  }

  function baseMessages(probe, systemOverride) {
    const system = systemOverride || probe.system;
    return system ? [{ role: "system", content: system }] : [];
  }

  async function runSingle(probe, context) {
    const { info, tokenKey, scratch, signal, onEvent, settings } = context;
    const messages = baseMessages(probe);
    onEvent?.({ type: "user", text: probe.prompt });
    messages.push({ role: "user", content: probe.prompt });
    const result = await runAgentTurn({
      endpoint: info.endpoint || "chat",
      tokenKey,
      channelId: info.channelId,
      model: info.model,
      messages,
      maxTokens: Math.min(Number(settings.maxTokens) || probe.maxTokens, probe.maxTokens),
      stream: settings.stream !== false,
      useTools: probe.tools === true,
      scratch,
      signal,
      onEvent,
      maxTurns: 4,
      promptHint: probe.prompt,
    });
    return {
      ...result,
      reply: A6P.stripArtifactsFromText(result.text),
      rawReply: result.text,
      messages: result.conversation,
      artifacts: scratch.toHistory(),
      modelCalls: result.turns || 1,
    };
  }

  async function runQuick(probe, context) {
    const { info, tokenKey, signal, onEvent, settings } = context;
    const messages = baseMessages(probe);
    onEvent?.({ type: "user", text: probe.prompt });
    messages.push({ role: "user", content: probe.prompt });
    const result = await callProbeModel({
      endpoint: info.endpoint || "chat",
      tokenKey,
      channelId: info.channelId,
      model: info.model,
      messages,
      maxTokens: Math.min(64, Number(settings.maxTokens) || 64),
      stream: settings.stream !== false,
      tools: null,
      signal,
      onEvent,
    });
    return {
      ...result,
      reply: result.text.trim(),
      rawReply: result.text,
      messages: [...messages, { role: "assistant", content: result.text }],
      artifacts: [],
      modelCalls: 1,
    };
  }

  async function runSteps(probe, context) {
    const { info, tokenKey, scratch, signal, onEvent, settings } = context;
    let conversation = baseMessages(probe);
    let combinedText = "";
    let usage = null;
    let mode = "stream";
    let fellBack = false;
    let firstByteMs = null;
    let reasoningChars = 0;
    let toolsUsed = 0;
    let modelCalls = 0;
    let startedAt = performance.now();
    let first = true;

    for (const step of probe.steps) {
      onEvent?.({ type: "user", text: step });
      conversation.push({ role: "user", content: step });
      const result = await runAgentTurn({
        endpoint: info.endpoint || "chat",
        tokenKey,
        channelId: info.channelId,
        model: info.model,
        messages: conversation,
        maxTokens: Math.min(Number(settings.maxTokens) || probe.maxTokens, probe.maxTokens),
        stream: settings.stream !== false,
        useTools: probe.tools === true,
        scratch,
        signal,
        onEvent,
        maxTurns: 4,
        promptHint: step,
      });
      combinedText += `${combinedText ? "\n\n" : ""}${result.text}`;
      reasoningChars += result.reasoningChars || 0;
      usage = mergeUsage(usage, result.usage);
      mode = result.mode || mode;
      fellBack = fellBack || result.fellBack;
      if (first && Number.isFinite(result.firstByteMs)) firstByteMs = result.firstByteMs;
      first = false;
      toolsUsed += result.toolsUsed || 0;
      modelCalls += result.turns || 1;
      conversation = result.conversation;
    }

    return {
      conversation,
      text: combinedText.trim(),
      reply: A6P.stripArtifactsFromText(combinedText),
      rawReply: combinedText,
      reasoningChars,
      usage,
      mode,
      fellBack,
      firstByteMs,
      durationMs: Math.round(performance.now() - startedAt),
      toolsUsed,
      modelCalls,
      artifacts: scratch.toHistory(),
      messages: conversation,
    };
  }

  async function runCustom(probe, context) {
    const { info, tokenKey, scratch, signal, onEvent, settings, prompt, promptContent, messages, emitUser = true } = context;
    let conversation = cloneMessages(messages || []);
    if (!conversation.length) conversation = baseMessages(probe);
    const rawOutput = A6P.prefersRawOutput(prompt);
    if (rawOutput) {
      conversation.push({
        role: "system",
        content:
          "The user explicitly asked for raw source output. Do not use tools for this turn; return the complete requested source directly, with no markdown fences or commentary.",
      });
      onEvent?.({ type: "status", phase: "raw_output", text: "Raw-source prompt detected; streaming without tools." });
    }
    if (emitUser) onEvent?.({ type: "user", text: prompt });
    conversation.push({ role: "user", content: promptContent || prompt });
    const result = await runAgentTurn({
      endpoint: info.endpoint || "chat",
      tokenKey,
      channelId: info.channelId,
      model: info.model,
      messages: conversation,
      maxTokens: Number(settings.maxTokens) || probe.maxTokens,
      stream: settings.stream !== false,
      useTools: rawOutput ? false : probe.tools === true && context.tools !== false,
      scratch,
      signal,
      onEvent,
      maxTurns: 5,
      promptHint: prompt,
    });
    return {
      ...result,
      reply: A6P.stripArtifactsFromText(result.text),
      rawReply: result.text,
      messages: result.conversation,
      artifacts: scratch.toHistory(),
      modelCalls: result.turns || 1,
    };
  }

  async function runProbe({ probeId, info, tokenKey, scratch, signal, onEvent, settings, prompt, promptContent, messages, tools, emitUser = true }) {
    const probe = A6P.getProbe(probeId);
    onEvent?.({ type: "run_start", probe, startedAt: Date.now() });
    const context = { info, tokenKey, scratch, signal, onEvent, settings, prompt, promptContent, messages, tools, emitUser };
    let result;
    if (probe.id === "pelican" || probe.id === "pelican-lite" || probe.id === "candy") result = await runSingle(probe, context);
    else if (probe.id === "flight") result = await runSteps(probe, context);
    else if (probe.id === "quick") result = await runQuick(probe, context);
    else result = await runCustom(probe, context);

    const score = A6P.scoreProbe(probe.id, {
      artifacts: result.artifacts || [],
      reply: result.reply || "",
      durationMs: result.durationMs || 0,
      error: "",
      streamed: result.mode === "stream",
    });
    return {
      ...result,
      probe,
      score,
      artifacts: result.artifacts || [],
    };
  }

  globalThis.A6PProbes = {
    runProbe,
    executeToolCall,
  };
})();
