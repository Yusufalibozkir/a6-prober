(() => {
  "use strict";
  const A6P = globalThis.A6P;

  const $ = (id) => document.getElementById(id);
  const els = {
    tokenMode: () => document.querySelector('input[name="tokenMode"]:checked'),
    apiKey: $("apiKey"),
    keyField: $("keyField"),
    toggleKey: $("toggleKey"),
    saveConnection: $("saveConnection"),
    connectionNote: $("connectionNote"),
    timeoutSec: $("timeoutSec"),
    maxTokens: $("maxTokens"),
    historyLimit: $("historyLimit"),
    stream: $("stream"),
    saveDefaults: $("saveDefaults"),
    defaultsNote: $("defaultsNote"),
    historyFilter: $("historyFilter"),
    historySearch: $("historySearch"),
    historyList: $("historyList"),
    historyEmpty: $("historyEmpty"),
    exportHistory: $("exportHistory"),
    clearHistory: $("clearHistory"),
    detailModal: $("detailModal"),
    detailTitle: $("detailTitle"),
    detailSubtitle: $("detailSubtitle"),
    detailBody: $("detailBody"),
    version: $("version"),
  };

  let settings = null;
  let history = [];
  let keyVisible = false;

  function node(tag, className = "", text = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== "") el.textContent = text;
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function setNote(el, message, tone = "") {
    el.textContent = message;
    el.className = `save-note${tone ? ` is-${tone}` : ""}`;
    clearTimeout(el._timer);
    if (message) {
      el._timer = setTimeout(() => {
        el.textContent = "";
        el.className = "save-note";
      }, 3200);
    }
  }

  function renderKeyField() {
    const mode = els.tokenMode()?.value || "auto";
    els.keyField.classList.toggle("is-muted", mode !== "manual");
  }

  function toneFor(record) {
    if (record.verdict) return record.verdict;
    const score = Number(record.score) || 0;
    return score >= 85 ? "strong" : score >= 65 ? "fair" : score > 0 ? "weak" : "failed";
  }

  function formatUsage(usage) {
    if (!usage || typeof usage !== "object") return "—";
    const input = usage.input_tokens ?? usage.prompt_tokens;
    const output = usage.output_tokens ?? usage.completion_tokens;
    if (typeof input === "number" || typeof output === "number") {
      return `${typeof input === "number" ? input : "—"} in / ${typeof output === "number" ? output : "—"} out`;
    }
    if (typeof usage.total_tokens === "number") return `${usage.total_tokens} total`;
    return "—";
  }

  function modeLabel(mode) {
    if (mode === "stream") return "SSE stream";
    if (mode === "non_stream") return "JSON";
    return mode || "—";
  }

  function statusText(value) {
    const map = { success: "complete", failed: "failed", stopped: "stopped", timeout: "timeout" };
    return map[value] || value || "unknown";
  }

  async function load() {
    els.version.textContent = `v${chrome.runtime.getManifest().version}`;
    try {
      settings = await A6P.getSettings();
    } catch (error) {
      setNote(els.connectionNote, error.message, "bad");
      settings = { ...A6P.DEFAULT_SETTINGS };
    }
    const mode = settings.tokenMode === "manual" ? "manual" : "auto";
    const radio = document.querySelector(`input[name="tokenMode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    els.apiKey.value = settings.apiKey || "";
    els.timeoutSec.value = settings.timeoutSec;
    els.maxTokens.value = settings.maxTokens;
    els.historyLimit.value = settings.historyLimit;
    els.stream.checked = settings.stream !== false;
    renderKeyField();
    history = await A6P.getHistory();
    renderHistory();
  }

  els.saveConnection.addEventListener("click", async () => {
    const mode = els.tokenMode()?.value || "auto";
    const apiKey = els.apiKey.value.trim();
    if (mode === "manual" && !apiKey) {
      setNote(els.connectionNote, "Add a key or switch to automatic tokens.", "bad");
      return;
    }
    try {
      await A6P.saveSettings({ tokenMode: mode, apiKey });
      settings = { ...settings, tokenMode: mode, apiKey };
      renderKeyField();
      setNote(els.connectionNote, "Connection settings saved.", "good");
    } catch (error) {
      setNote(els.connectionNote, error.message, "bad");
    }
  });

  els.toggleKey.addEventListener("click", () => {
    keyVisible = !keyVisible;
    els.apiKey.type = keyVisible ? "text" : "password";
    els.toggleKey.textContent = keyVisible ? "Hide" : "Show";
  });

  for (const radio of document.querySelectorAll('input[name="tokenMode"]')) {
    radio.addEventListener("change", renderKeyField);
  }

  els.saveDefaults.addEventListener("click", async () => {
    const timeoutSec = A6P.clampInt(els.timeoutSec.value, 30, 900, A6P.DEFAULT_SETTINGS.timeoutSec);
    const maxTokens = A6P.clampInt(els.maxTokens.value, 256, 131072, A6P.DEFAULT_SETTINGS.maxTokens);
    const historyLimit = A6P.clampInt(els.historyLimit.value, 10, 500, A6P.DEFAULT_SETTINGS.historyLimit);
    els.timeoutSec.value = timeoutSec;
    els.maxTokens.value = maxTokens;
    els.historyLimit.value = historyLimit;
    try {
      await A6P.saveSettings({ timeoutSec, maxTokens, historyLimit, stream: els.stream.checked });
      settings = { ...settings, timeoutSec, maxTokens, historyLimit, stream: els.stream.checked };
      setNote(els.defaultsNote, "Probe defaults saved.", "good");
    } catch (error) {
      setNote(els.defaultsNote, error.message, "bad");
    }
  });

  function filteredHistory() {
    const filter = els.historyFilter.value;
    const query = els.historySearch.value.trim().toLowerCase();
    return history.filter((record) => {
      if (filter !== "all" && record.probeId !== filter) return false;
      if (!query) return true;
      return [record.model, record.channelName, record.supplier, record.probeName, String(record.channelId || "")]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }

  function renderHistory() {
    const list = filteredHistory();
    clear(els.historyList);
    els.historyEmpty.classList.toggle("hidden", list.length > 0);
    if (!list.length) {
      els.historyEmpty.querySelector("h3").textContent = history.length ? "No matching runs" : "No runs yet";
      els.historyEmpty.querySelector("p").textContent = history.length
        ? "Try another probe filter or search term."
        : "Open the A6API marketplace, click Probe on a channel row, and run a test.";
      return;
    }
    for (const record of list) {
      const item = node("div", "history-item");
      const score = node("div", `score-badge is-${toneFor(record)}`);
      score.appendChild(document.createTextNode(String(record.score ?? 0)));
      score.appendChild(node("small", "", "/100"));
      item.appendChild(score);

      const main = node("div", "history-main");
      const title = node("div", "history-title");
      title.appendChild(node("strong", "", record.model || "Unknown model"));
      title.appendChild(node("span", "probe-tag", record.probeName || record.probeId || "Probe"));
      main.appendChild(title);
      const bits = [record.supplier, `#${record.channelId}`, record.endpoint, record.status && record.status !== "success" ? statusText(record.status) : ""]
        .filter(Boolean)
        .join(" · ");
      main.appendChild(node("div", "history-sub", bits || "—"));
      if (record.summary) main.appendChild(node("div", "history-summary", record.summary));
      item.appendChild(main);

      const side = node("div", "history-side");
      side.appendChild(node("span", "history-time", A6P.timeAgo(record.ts) || A6P.formatTime(record.ts)));
      const detail = node("button", "detail-btn", "Details");
      detail.type = "button";
      detail.addEventListener("click", () => openDetail(record));
      side.appendChild(detail);
      item.appendChild(side);
      els.historyList.appendChild(item);
    }
  }

  els.historyFilter.addEventListener("change", renderHistory);
  els.historySearch.addEventListener("input", renderHistory);

  els.exportHistory.addEventListener("click", () => {
    if (!history.length) {
      setNote(els.defaultsNote, "There is no history to export.", "bad");
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
      records: history,
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `a6-prober-history-${Date.now()}.json`);
  });

  els.clearHistory.addEventListener("click", async () => {
    if (!history.length) return;
    if (!confirm(`Clear all ${history.length} run records? This cannot be undone.`)) return;
    await A6P.clearHistory();
    history = [];
    renderHistory();
  });

  function mimeFor(artifact) {
    if (artifact.kind === "svg") return "image/svg+xml";
    if (artifact.kind === "html") return "text/html";
    if (artifact.kind === "css") return "text/css";
    if (artifact.kind === "js") return "text/javascript";
    if (artifact.kind === "json") return "application/json";
    if (artifact.kind === "md") return "text/markdown";
    return "text/plain";
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  }

  function downloadArtifact(artifact) {
    const blob = new Blob([artifact.content || ""], { type: mimeFor(artifact) });
    downloadBlob(blob, A6P.safeFileName(String(artifact.path || "artifact").split("/").pop(), "artifact.txt"));
  }

  function openDetail(record) {
    els.detailTitle.textContent = record.model || "Run detail";
    els.detailSubtitle.textContent = [
      record.probeName || record.probeId,
      `#${record.listingId || "—"}`,
      `channel #${record.channelId || "—"}`,
      A6P.formatTime(record.ts),
    ]
      .filter(Boolean)
      .join(" · ");
    const body = els.detailBody;
    clear(body);

    const top = node("div", "detail-top");
    const score = node("div", "detail-score");
    score.appendChild(document.createTextNode(String(record.score ?? 0)));
    score.appendChild(node("small", "", "/100"));
    top.appendChild(score);
    const copy = node("div", "detail-score-copy");
    const verdict = node("span", `detail-verdict is-${toneFor(record)}`, toneFor(record));
    copy.appendChild(verdict);
    copy.appendChild(node("div", "detail-summary", record.summary || "No summary recorded."));
    const metrics = node("div", "detail-metrics");
    const add = (label, value) => {
      const span = node("span", "");
      span.appendChild(node("b", "", value));
      span.appendChild(document.createTextNode(` ${label}`));
      metrics.appendChild(span);
    };
    add("latency", A6P.formatDuration(record.durationMs || 0));
    if (Number.isFinite(record.firstByteMs)) add("first byte", A6P.formatDuration(record.firstByteMs));
    add("transport", modeLabel(record.mode));
    if (record.modelCalls) add(record.modelCalls === 1 ? "call" : "calls", String(record.modelCalls));
    if (record.usage) add("tokens", formatUsage(record.usage));
    if (record.expectedAnswer !== null && record.expectedAnswer !== undefined) add("expected", String(record.expectedAnswer));
    if (record.actualAnswer !== null && record.actualAnswer !== undefined) add("answered", String(record.actualAnswer));
    if (record.artifacts?.length) add("files", String(record.artifacts.length));
    copy.appendChild(metrics);
    top.appendChild(copy);
    body.appendChild(top);

    if (Array.isArray(record.checks) && record.checks.length) {
      const section = node("section", "detail-section");
      section.appendChild(node("h3", "", `Checks · ${record.checks.filter((check) => check.ok).length}/${record.checks.length} passed`));
      const grid = node("div", "check-grid");
      for (const check of record.checks) {
        const row = node("div", `check-row${check.ok ? "" : " is-bad"}`);
        row.appendChild(node("span", "tick", check.ok ? "✓" : "✕"));
        row.appendChild(node("span", "", check.label));
        row.appendChild(node("span", "check-points", `+${check.points ?? 0}`));
        grid.appendChild(row);
      }
      section.appendChild(grid);
      body.appendChild(section);
    }

    const artifacts = Array.isArray(record.artifacts) ? record.artifacts : [];
    const section = node("section", "detail-section");
    section.appendChild(node("h3", "", `Artifacts · ${artifacts.length}`));
    if (!artifacts.length) {
      section.appendChild(node("div", "detail-empty", "No files were captured for this run."));
    } else {
      const list = node("div", "artifact-list");
      for (const artifact of artifacts) {
        list.appendChild(renderArtifact(artifact));
      }
      section.appendChild(list);
    }
    body.appendChild(section);
    els.detailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function renderArtifact(artifact) {
    const item = node("div", "artifact-item");
    const head = node("div", "artifact-head");
    head.appendChild(node("span", "", artifact.path || "artifact"));
    head.appendChild(node("span", "", A6P.formatBytes(artifact.bytes || 0)));
    item.appendChild(head);

    if (artifact.content) {
      const preview = node("div", "artifact-preview");
      if (artifact.kind === "svg") {
        const dataUrl = A6P.svgToDataUrl(artifact.content);
        if (dataUrl) {
          const img = document.createElement("img");
          img.src = dataUrl;
          img.alt = artifact.path || "SVG artifact";
          preview.appendChild(img);
        } else {
          preview.appendChild(node("pre", "", artifact.content));
        }
      } else if (artifact.kind === "html") {
        const frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "");
        frame.srcdoc = A6P.prepareHtmlPreview(artifact.content);
        preview.appendChild(frame);
      } else {
        preview.appendChild(node("pre", "", artifact.content.slice(0, 12000)));
      }
      item.appendChild(preview);
    } else {
      item.appendChild(node("div", "detail-empty", "File contents were omitted from local history."));
    }

    const actions = node("div", "artifact-actions");
    if (artifact.content) {
      const download = node("button", "", "Download");
      download.type = "button";
      download.addEventListener("click", () => downloadArtifact(artifact));
      actions.appendChild(download);
    }
    item.appendChild(actions);
    return item;
  }

  function closeDetail() {
    els.detailModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  for (const closer of document.querySelectorAll("[data-close-modal]")) {
    closer.addEventListener("click", closeDetail);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.detailModal.classList.contains("hidden")) closeDetail();
  });

  load().catch((error) => {
    console.error("A6 Prober options failed to load", error);
    setNote(els.connectionNote, error.message || String(error), "bad");
  });
})();
