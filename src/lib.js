// Shared, dependency-free helpers for A6 Prober.
(() => {
  "use strict";
  if (globalThis.A6P) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  const MAX_ARTIFACT_BYTES = 768 * 1024;
  const MAX_SCRATCH_BYTES = 4 * 1024 * 1024;
  const MAX_STORED_ARTIFACTS = 8;
  const MAX_STORED_CONTENT = 220 * 1024;
  const MAX_HISTORY_ARTIFACT_BYTES = 900 * 1024;

  const DEFAULT_SETTINGS = {
    apiKey: "",
    tokenMode: "auto",
    preferredTokenId: "",
    stream: true,
    timeoutSec: 300,
    maxTokens: 16384,
    historyLimit: 100,
  };

  const CANDY_EXPECTED = 29;
  const CANDY_PROMPT = `A black bag contains three flavors of candy, each with two different shapes (round and star-shaped, distinguishable by touch). The table below shows the quantity of each flavor and shape. Before the activity, participants need to decide how many candies to draw. What is the minimum number of candies to draw to guarantee having both apple and peach-flavored candies of different shapes in one hand? (Having both round apple-flavored and star-shaped peach-flavored candies, or round peach-flavored and star-shaped apple-flavored candies, is sufficient.)

| Flavor     | Round | Star-shaped |
| Apple      |   7   |      7      |
| Peach      |   9   |      6      |
| Watermelon |   8   |      4      |

Answer with the minimum number. End with a line exactly in the form "FINAL: <number>".`;

  const PROBES = [
    {
      id: "pelican",
      name: "Pelicans Test",
      shortName: "Pelican",
      kind: "single",
      icon: "pelican",
      maxTokens: 16384,
      tools: true,
      description: "The canonical LLM drawing test. A clear pelican on a bicycle exposes weak spatial reasoning, sloppy SVG and quiet model downgrades.",
      meta: ["SVG artifact", "1–2 calls", "tool-enabled"],
      system:
        "You are A6 Prober's SVG test agent. You can only create files through the write_file tool. Use it instead of pasting file contents into chat. Keep replies short and do not use markdown fences for files when the tool is available.",
      prompt:
        "Draw a realistic pelican riding a bicycle. The pelican must be clearly recognizable (large beak, throat pouch, wings, legs), and the bicycle must have two round wheels, a frame, handlebars and pedals. Use one self-contained SVG with viewBox=\"0 0 800 600\", a detailed background, clean vector shapes and no external resources. Save it as pelican-riding-bicycle.svg with the write_file tool, then reply with one short sentence.",
    },
    {
      id: "flight",
      name: "BazaarLink probe",
      shortName: "BazaarLink",
      kind: "steps",
      icon: "flight",
      maxTokens: 24576,
      tools: true,
      description: "A local reimplementation of the BazaarLink-style agentic probe: draw an SVG, read it back, then build an animated HTML scene. Tool calls can use more than two requests, so the multi-call cost is shown before running.",
      meta: ["agent loop", "multi-call", "SVG + HTML"],
      system:
        "You are A6 Prober's browser coding agent. Files live in a scratch directory and are only visible through tools. Use write_file to create or overwrite files, read_file to inspect them, and list_files to see the directory. Never paste full file contents into chat when a tool can do the work. Keep chat replies concise.",
      steps: [
        "Create pelican-realistic.svg: a polished, realistic side-view illustration of a pelican with its wings spread, flying low over the ocean at golden hour. Include a warm sky, clouds, layered water, reflections and soft shadows. It must be a single self-contained SVG with viewBox=\"0 0 960 640\" and no external resources. Save it with write_file, then reply with one short sentence.",
        "Read pelican-realistic.svg, then create pelican-flight.html: a self-contained, responsive HTML page that embeds that SVG and animates the pelican flying over the sea with a gentle vertical bob, scrolling waves and drifting clouds. Use inline CSS and inline SVG only; no external libraries, fonts, scripts or images. Save it with write_file. Reply with a short summary.",
      ],
    },
    {
      id: "candy",
      name: "Candy Detection",
      shortName: "Candy",
      kind: "single",
      icon: "spark",
      maxTokens: 4096,
      tools: false,
      hidePrompt: true,
      expectedAnswer: CANDY_EXPECTED,
      description: "A deterministic reasoning puzzle with a known answer. The public reference UI lists 21, but the bag counts require 29; Prober uses 29 so correct models are not failed.",
      meta: ["reasoning", "known answer", "1 call"],
      system: "You are a careful reasoning assistant. Work through the problem step by step, then give the final number in the requested format. Do not use tools.",
      prompt: CANDY_PROMPT,
    },
    {
      id: "pelican-lite",
      name: "Pelicans Test - Simplified Version",
      shortName: "Pelican Lite",
      kind: "single",
      icon: "pelican",
      maxTokens: 4096,
      tools: false,
      description: "A fast, low-token pelican check. It asks for a simple SVG and streams raw source without tools, so the first token arrives sooner than the full agent workflow.",
      meta: ["fast path", "no tools", "1 call"],
      system: "You are a precise SVG illustrator. Return raw SVG only: no markdown fences, no commentary, and no tool use.",
      prompt: "Draw a simple, clean SVG of a pelican riding a bicycle. It must show a recognizable pelican (large beak, throat pouch, wings) and a bicycle with two wheels. Use one self-contained SVG with viewBox=\"0 0 400 300\", a flat background and no external resources. Return only the complete SVG source code, beginning with <svg and ending with </svg>. No markdown fences or explanation.",
    },
    {
      id: "quick",
      name: "Quick probe",
      shortName: "Quick",
      kind: "quick",
      icon: "bolt",
      maxTokens: 64,
      tools: false,
      description: "A minimal latency and instruction-following check. It verifies that the channel answers at all and that streaming behaves.",
      meta: ["tiny request", "1 call", "latency check"],
      system: "You are a precise API connectivity probe. Follow the instruction exactly.",
      prompt: "Reply with exactly PROBE_OK and nothing else.",
    },
    {
      id: "custom",
      name: "Custom test",
      shortName: "Custom",
      kind: "custom",
      icon: "spark",
      maxTokens: 16384,
      tools: true,
      description: "Send any prompt through the same channel. Ask for SVG, HTML, CSS or a plain answer; files written through tools appear in the scratch directory.",
      meta: ["your prompt", "tool-enabled", "multi-turn"],
      system:
        "You are A6 Prober's test agent. You can create and read files in a browser scratch directory with tools. Use write_file for complete files (SVG, HTML, CSS, JS, Markdown) and keep chat replies concise. If the user asks for a drawing or page, save the complete file instead of pasting it.",
    },
  ];

  const PROBE_ORDER = ["flight", "pelican", "candy", "pelican-lite", "quick", "custom"];
  PROBES.sort((a, b) => PROBE_ORDER.indexOf(a.id) - PROBE_ORDER.indexOf(b.id));

  const PROBE_MAP = new Map(PROBES.map((probe) => [probe.id, probe]));

  function getProbe(id) {
    return PROBE_MAP.get(id) || PROBES[0];
  }

  function prefersRawOutput(text) {
    const value = String(text || "");
    return /return\s+only|only\s+(?:the\s+)?(?:complete\s+)?(?:svg|html|source|code)|no\s+(?:markdown\s+)?fences|without\s+(?:markdown|fences)|do\s+not\s+use\s+(?:tools|tool calls)/i.test(value);
  }

  function clampInt(value, min, max, fallback) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function makeId(prefix = "run") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function byteLength(text) {
    try {
      return new TextEncoder().encode(String(text)).length;
    } catch {
      return String(text).length;
    }
  }

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDuration(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n < 0) return "—";
    if (n < 1000) return `${Math.round(n)} ms`;
    if (n < 60 * 1000) return `${(n / 1000).toFixed(n < 10 * 1000 ? 2 : 1)} s`;
    const mins = Math.floor(n / 60000);
    const secs = Math.round((n % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "—";
    }
  }

  function timeAgo(ts) {
    const delta = Math.max(0, Date.now() - Number(ts || 0));
    if (delta < 60000) return "just now";
    if (delta < 3600000) return `${Math.floor(delta / 60000)} min ago`;
    if (delta < 86400000) return `${Math.floor(delta / 3600000)} h ago`;
    return `${Math.floor(delta / 86400000)} d ago`;
  }

  function truncate(text, max = 160) {
    const value = String(text || "");
    return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value;
  }

  function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  // ---------- files and artifacts ----------

  function normalizePath(input, fallback = "file.txt") {
    let value = String(input || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^["']|["']$/g, "");
    value = value.replace(/^\.\//, "").replace(/^\//, "");
    const rawParts = value.split("/").filter((part) => part && part !== ".");
    if (!rawParts.length || rawParts.some((part) => part === "..")) return fallback;
    const parts = rawParts
      .slice(0, 4)
      .map((part) => part.replace(/[^A-Za-z0-9._ -]+/g, "_").replace(/\s+/g, "_").replace(/^[-. _]+|[-. _]+$/g, "").slice(0, 80))
      .filter(Boolean);
    const path = parts.join("/");
    return path || fallback;
  }

  function extensionOf(path) {
    const match = String(path || "").toLowerCase().match(/\.([a-z0-9]{1,8})$/);
    return match ? match[1] : "";
  }

  function kindFromPath(path, content = "") {
    const ext = extensionOf(path);
    if (ext === "svg" || /^\s*<svg[\s>]/i.test(content)) return "svg";
    if (ext === "html" || ext === "htm" || /^\s*<!doctype html/i.test(content) || /<html[\s>]/i.test(content)) return "html";
    if (ext === "css") return "css";
    if (ext === "js" || ext === "mjs") return "js";
    if (ext === "json") return "json";
    if (ext === "md" || ext === "markdown") return "md";
    if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext)) return "image";
    return "text";
  }

  function safeFileName(name, fallback = "artifact") {
    const cleaned = String(name || "")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^[_ .-]+|[_ .-]+$/g, "")
      .slice(0, 80);
    return cleaned || fallback;
  }

  function uniquePath(path, used) {
    const normalized = normalizePath(path);
    if (!used.has(normalized)) {
      used.add(normalized);
      return normalized;
    }
    const dot = normalized.lastIndexOf(".");
    const base = dot > 0 ? normalized.slice(0, dot) : normalized;
    const ext = dot > 0 ? normalized.slice(dot) : "";
    for (let i = 2; i < 1000; i += 1) {
      const candidate = `${base}-${i}${ext}`;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    const candidate = `${base}-${Date.now()}${ext}`;
    used.add(candidate);
    return candidate;
  }

  function parseFenceHeader(info) {
    const raw = String(info || "").trim();
    let path = "";
    let language = "";
    const fileMatch = raw.match(/(?:file|filename|path)\s*=\s*["']?([^"'\s]+)["']?/i);
    if (fileMatch) path = fileMatch[1];
    const tokens = raw.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const cleaned = token.replace(/^["']|["']$/g, "");
      if (/\.[A-Za-z0-9]{1,8}$/.test(cleaned) && !language) path = path || cleaned;
      else if (/^[A-Za-z0-9_+-]+$/.test(cleaned) && !language) language = cleaned;
    }
    if (!path) {
      const pathToken = tokens.map((token) => token.replace(/^["']|["']$/g, "")).find((token) => /^[\w./-]+\.[A-Za-z0-9]{1,8}$/.test(token));
      if (pathToken) path = pathToken;
    }
    return { path, language: language.toLowerCase() };
  }

  function defaultArtifactPath(language, content, index, hintText) {
    const kind = language || kindFromPath("", content);
    const looksPelican = /pelican|鹈鹕/i.test(`${hintText || ""}\n${content.slice(0, 500)}`);
    if (kind === "svg") return looksPelican ? "pelican.svg" : `drawing-${index}.svg`;
    if (kind === "html" || kind === "htm") return `artifact-${index}.html`;
    if (kind === "css") return `style-${index}.css`;
    if (kind === "js" || kind === "mjs") return `script-${index}.js`;
    if (kind === "json") return `data-${index}.json`;
    if (kind === "md" || kind === "markdown") return `notes-${index}.md`;
    return `artifact-${index}.txt`;
  }

  function parseArtifacts(text, { hintText = "" } = {}) {
    const source = String(text || "");
    const artifacts = [];
    const used = new Set();
    const ranges = [];

    const fenceRe = /```([^\n`]*)\r?\n([\s\S]*?)```/g;
    let match;
    let index = 0;
    while ((match = fenceRe.exec(source))) {
      const info = parseFenceHeader(match[1]);
      const content = match[2].replace(/\r\n/g, "\n");
      if (!content.trim()) continue;
      index += 1;
      let path = info.path;
      const beforeRaw = source.slice(0, match.index).trimEnd().split(/\r?\n/).pop() || "";
      const before = beforeRaw.trim().replace(/^[\s*_`~]+|[\s*_`~:]+$/g, "");
      if (!path && /^[\w./-]+\.(?:svg|html?|css|js|json|md)$/i.test(before)) path = before;
      if (!path) path = defaultArtifactPath(info.language, content, index, hintText || source);
      const finalPath = uniquePath(path, used);
      artifacts.push({
        path: finalPath,
        content,
        kind: kindFromPath(finalPath, content),
        bytes: byteLength(content),
        source: "fence",
      });
      ranges.push([match.index, match.index + match[0].length]);
    }

    const inRanges = (start, end) => ranges.some(([a, b]) => start < b && end > a);

    const svgRe = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
    while ((match = svgRe.exec(source))) {
      const start = match.index;
      const end = start + match[0].length;
      if (inRanges(start, end)) continue;
      const content = match[0];
      const path = uniquePath(defaultArtifactPath("svg", content, index + artifacts.length + 1, hintText || source), used);
      artifacts.push({ path, content, kind: "svg", bytes: byteLength(content), source: "raw" });
    }

    const htmlRe = /<(?:!doctype\s+html|html)\b[\s\S]*?<\/html>/gi;
    while ((match = htmlRe.exec(source))) {
      const start = match.index;
      const end = start + match[0].length;
      if (inRanges(start, end)) continue;
      const content = match[0];
      const path = uniquePath(defaultArtifactPath("html", content, index + artifacts.length + 1, hintText || source), used);
      artifacts.push({ path, content, kind: "html", bytes: byteLength(content), source: "raw" });
    }

    return artifacts;
  }

  function stripArtifactsFromText(text) {
    return String(text || "")
      .replace(/```([^\n`]*)\r?\n[\s\S]*?```/g, "")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
      .replace(/<(?:!doctype\s+html|html)\b[\s\S]*?<\/html>/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function analyzeSvg(svg) {
    const text = String(svg || "");
    const trimmed = text.trim();
    const circles = (text.match(/<circle\b/gi) || []).length;
    return {
      present: /<svg[\s>]/i.test(text),
      closed: /<\/svg>\s*$/i.test(trimmed),
      length: text.length,
      circles,
      paths: (text.match(/<path\b/gi) || []).length,
      hasViewBox: /\bviewBox\s*=/i.test(text),
      hasPelican: /pelican|beak|bill|pouch|feather|wing/i.test(text),
      hasBicycle: /bicycle|bike|wheel|pedal|handlebar|chainring|saddle/i.test(text) || circles >= 2,
      hasAnimation: /<animate\b|@keyframes|animation\s*[:-]/i.test(text),
      hasExternal: /(?:href|src)\s*=\s*["']https?:/i.test(text),
      hasScript: /<script\b/i.test(text),
    };
  }

  function analyzeHtml(html) {
    const text = String(html || "");
    return {
      present: /<html[\s>]|<!doctype\s+html/i.test(text),
      closed: /<\/html>\s*$/i.test(text.trim()),
      length: text.length,
      hasSvg: /<svg\b/i.test(text) || /[\w./-]+\.svg(?:["')\s]|$)/i.test(text),
      hasAnimation: /@keyframes|<animate\b|animation\s*[:-]|requestAnimationFrame/i.test(text),
      hasScript: /<script\b/i.test(text),
      hasExternal: /(?:src|href)\s*=\s*["']https?:/i.test(text),
    };
  }

  function makeCheck(label, ok, points, detail = "") {
    return { label, ok: !!ok, points: ok ? points : 0, max: points, detail };
  }

  function scorePelican({ artifacts = [], reply = "", durationMs = 0, error = "" } = {}) {
    const svgArtifact = artifacts.find((artifact) => artifact.kind === "svg");
    const svg = svgArtifact ? svgArtifact.content : "";
    const info = analyzeSvg(svg);
    const checks = [
      makeCheck("No transport error", !error, 10, error || "clean response"),
      makeCheck("Valid SVG document", info.present && info.closed, 35, `${formatBytes(info.length)} output`),
      makeCheck("viewBox present", info.hasViewBox, 5),
      makeCheck("Detailed drawing", info.length >= 800, 5, `${formatBytes(info.length)}`),
      makeCheck("Rich vector detail", info.length >= 2000, 5, `${info.paths} paths`),
      makeCheck("Bicycle wheels", info.circles >= 2, 10, `${info.circles} circles`),
      makeCheck("Vector paths", info.paths >= 3, 10, `${info.paths} paths`),
      makeCheck("Pelican cues", info.hasPelican, 10),
      makeCheck("Bicycle cues", info.hasBicycle, 5),
      makeCheck("Reasonable latency", !!svgArtifact && durationMs > 0 && durationMs <= 90000, 5, formatDuration(durationMs)),
      makeCheck("No external resources", !!svgArtifact && !info.hasExternal, 5),
    ];
    const score = Math.max(0, Math.min(100, checks.reduce((sum, check) => sum + check.points, 0)));
    return {
      score,
      verdict: score >= 85 ? "strong" : score >= 65 ? "fair" : score > 0 ? "weak" : "failed",
      checks,
      svg: svgArtifact || null,
      info,
      summary: score >= 85 ? "A complete, detailed SVG with the expected subjects." : score >= 65 ? "The SVG is usable but misses some quality signals." : "The drawing is incomplete or missing key signals.",
    };
  }

  function scoreFlight({ artifacts = [], reply = "", durationMs = 0, error = "" } = {}) {
    const svgArtifact = artifacts.find((artifact) => artifact.kind === "svg");
    const htmlArtifact = artifacts.find((artifact) => artifact.kind === "html");
    const svg = svgArtifact ? analyzeSvg(svgArtifact.content) : analyzeSvg("");
    const html = htmlArtifact ? analyzeHtml(htmlArtifact.content) : analyzeHtml("");
    const checks = [
      makeCheck("No transport error", !error, 5, error || "clean response"),
      makeCheck("SVG source file", svg.present && svg.closed, 20, svgArtifact ? formatBytes(svgArtifact.bytes) : "missing"),
      makeCheck("HTML page", html.present && html.closed, 20, htmlArtifact ? formatBytes(htmlArtifact.bytes) : "missing"),
      makeCheck("HTML embeds the SVG", html.hasSvg, 15),
      makeCheck("Motion / animation", html.hasAnimation || svg.hasAnimation, 15),
      makeCheck("Detailed illustration", svg.length >= 1500, 5, formatBytes(svg.length)),
      makeCheck("Built-out page", html.length >= 1200, 5, formatBytes(html.length)),
      makeCheck("Pelican cues", svg.hasPelican, 5),
      makeCheck("No external resources", !svg.hasExternal && !html.hasExternal, 5),
      makeCheck("Reasonable latency", durationMs > 0 && durationMs <= 240000, 5, formatDuration(durationMs)),
    ];
    const score = Math.max(0, Math.min(100, checks.reduce((sum, check) => sum + check.points, 0)));
    return {
      score,
      verdict: score >= 85 ? "strong" : score >= 65 ? "fair" : score > 0 ? "weak" : "failed",
      checks,
      svg: svgArtifact || null,
      html: htmlArtifact || null,
      summary: score >= 85 ? "Agent produced a complete SVG and an animated HTML scene." : score >= 65 ? "Both artifacts exist, but one of them is thin or incomplete." : "The agent did not finish the two-file workflow.",
    };
  }

  function scorePelicanLite({ artifacts = [], reply = "", durationMs = 0, error = "" } = {}) {
    const svgArtifact = artifacts.find((artifact) => artifact.kind === "svg");
    const svg = svgArtifact ? svgArtifact.content : "";
    const info = analyzeSvg(svg);
    const checks = [
      makeCheck("No transport error", !error, 10, error || "clean response"),
      makeCheck("Valid SVG document", info.present && info.closed, 35, `${formatBytes(info.length)} output`),
      makeCheck("viewBox present", info.hasViewBox, 5),
      makeCheck("Pelican cues", info.hasPelican, 15),
      makeCheck("Bicycle wheels", info.circles >= 2 || info.hasBicycle, 15, `${info.circles} circles`),
      makeCheck("Vector paths", info.paths >= 2, 5, `${info.paths} paths`),
      makeCheck("Detailed enough", info.length >= 300, 5, formatBytes(info.length)),
      makeCheck("No external resources", !info.hasExternal, 5),
      makeCheck("Fast response", !!svgArtifact && durationMs > 0 && durationMs <= 60000, 5, formatDuration(durationMs)),
    ];
    const score = Math.max(0, Math.min(100, checks.reduce((sum, check) => sum + check.points, 0)));
    return {
      score,
      verdict: score >= 85 ? "strong" : score >= 60 ? "fair" : score > 0 ? "weak" : "failed",
      checks,
      summary: score >= 85 ? "A clean, valid pelican SVG completed quickly." : score >= 60 ? "The simplified SVG is usable but thin." : "The simplified drawing is incomplete or missing.",
    };
  }

  function scoreQuick({ reply = "", durationMs = 0, error = "" } = {}) {
    const text = String(reply || "").trim();
    const exact = /^PROBE_OK[.!]?$/i.test(text);
    const contains = /PROBE_OK/i.test(text);
    const checks = [
      makeCheck("No transport error", !error, 30, error || "clean response"),
      makeCheck("Exact sentinel", exact, 50, truncate(text, 80) || "empty"),
      makeCheck("Sentinel present", contains, 10),
      makeCheck("Fast response", durationMs > 0 && durationMs <= 15000, 10, formatDuration(durationMs)),
    ];
    const score = Math.max(0, Math.min(100, checks.reduce((sum, check) => sum + check.points, 0)));
    return {
      score,
      verdict: score >= 85 ? "strong" : score >= 60 ? "fair" : "weak",
      checks,
      summary: score >= 85 ? "The channel answered exactly as instructed." : "The channel responded, but not with the requested sentinel.",
    };
  }


  function extractCandyAnswer(reply) {
    const text = String(reply || "").replace(/[,\u00a0]/g, " ");
    const patterns = [
      /FINAL\s*[:=]\s*\**\s*(\d{1,6})/i,
      /\\boxed\{\s*(\d{1,6})\s*\}/,
      /(?:final answer|answer|minimum|at least)\s*(?:is|:|=|of)?\s*\**\s*(\d{1,6})/i,
      /(\d{1,6})\s*cand(?:y|ies)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
    const numbers = [...text.matchAll(/\b\d{1,6}\b/g)].map((match) => Number(match[0]));
    return numbers.length ? numbers[numbers.length - 1] : null;
  }

  function scoreCandy({ reply = "", durationMs = 0, error = "", expectedAnswer = CANDY_EXPECTED } = {}) {
    const actualAnswer = extractCandyAnswer(reply);
    const correct = !error && actualAnswer === expectedAnswer;
    const checks = [
      makeCheck("No transport error", !error, 20, error || "clean response"),
      makeCheck("Answer received", !!String(reply || "").trim(), 20),
      makeCheck("Final number parsed", actualAnswer !== null, 20, actualAnswer === null ? "not found" : String(actualAnswer)),
      makeCheck(`Matches expected answer (${expectedAnswer})`, correct, 40, actualAnswer === null ? "no answer" : `answered ${actualAnswer}`),
    ];
    return {
      score: correct ? 100 : 0,
      verdict: correct ? "strong" : "failed",
      checks,
      kind: "candy",
      expectedAnswer,
      actualAnswer,
      correct,
      summary: correct
        ? "The answer matches the expected result."
        : actualAnswer === null
          ? "The model did not give a final number."
          : `The answer is inconsistent with the truth. The model answered ${actualAnswer}; the expected answer is ${expectedAnswer}.`,
    };
  }

  function scoreCustom({ artifacts = [], reply = "", durationMs = 0, error = "", streamed = false } = {}) {
    const validArtifact = artifacts.find((artifact) => {
      if (artifact.kind === "svg") {
        const info = analyzeSvg(artifact.content);
        return info.present && info.closed;
      }
      if (artifact.kind === "html") {
        const info = analyzeHtml(artifact.content);
        return info.present && info.closed;
      }
      return artifact.content.trim().length > 0;
    });
    const checks = [
      makeCheck("No transport error", !error, 40, error || "clean response"),
      makeCheck("Response received", !!String(reply || "").trim() || artifacts.length > 0, 20),
      makeCheck("File artifact", artifacts.length > 0, 15, `${artifacts.length} file(s)`),
      makeCheck("Valid artifact", !!validArtifact, 15, validArtifact ? validArtifact.path : "none"),
      makeCheck("Streaming worked", streamed, 5),
      makeCheck("Reasonable latency", durationMs > 0 && durationMs <= 120000, 5, formatDuration(durationMs)),
    ];
    const score = Math.max(0, Math.min(100, checks.reduce((sum, check) => sum + check.points, 0)));
    return {
      score,
      verdict: score >= 85 ? "strong" : score >= 60 ? "fair" : score > 0 ? "weak" : "failed",
      checks,
      artifact: validArtifact || null,
      summary: score >= 80 ? "The channel followed the custom request." : "The custom request completed, but the output is thin.",
    };
  }

  function scoreProbe(probeId, result) {
    if (probeId === "pelican") return scorePelican(result);
    if (probeId === "flight") return scoreFlight(result);
    if (probeId === "candy") return scoreCandy(result);
    if (probeId === "pelican-lite") return scorePelicanLite(result);
    if (probeId === "quick") return scoreQuick(result);
    return scoreCustom(result);
  }

  // ---------- SVG and HTML safety ----------

  function sanitizeSvgString(source) {
    const text = String(source || "").trim();
    if (!text) return null;
    if (typeof DOMParser === "undefined") {
      return /^\s*<svg[\s>]/i.test(text) && /<\/svg>\s*$/i.test(text) ? text : null;
    }
    let doc;
    try {
      doc = new DOMParser().parseFromString(text, "image/svg+xml");
    } catch {
      return null;
    }
    if (!doc || doc.getElementsByTagName("parsererror").length) return null;
    const root = doc.documentElement;
    if (!root || root.localName !== "svg" || root.namespaceURI !== SVG_NS) return null;
    root.querySelectorAll("script, foreignObject, iframe, embed, object, audio, video").forEach((node) => node.remove());
    root.querySelectorAll("style").forEach((node) => {
      if (/@import|url\(\s*['"]?https?:/i.test(node.textContent || "")) node.remove();
    });
    const all = [root, ...root.querySelectorAll("*")];
    for (const node of all) {
      for (const attr of [...node.attributes]) {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || "").trim();
        if (name.startsWith("on")) node.removeAttribute(attr.name);
        else if ((name === "href" || name.endsWith(":href") || name === "src") && /^(?:javascript:|data:text\/html|https?:)/i.test(value)) {
          node.removeAttribute(attr.name);
        } else if (name === "style" && /url\(\s*['"]?https?:/i.test(value)) {
          node.removeAttribute(attr.name);
        }
      }
    }
    if (!root.getAttribute("xmlns")) root.setAttribute("xmlns", SVG_NS);
    if (root.querySelector("use")) root.setAttribute("xmlns:xlink", XLINK_NS);
    return new XMLSerializer().serializeToString(root);
  }

  function validateSvg(svg) {
    const clean = sanitizeSvgString(svg);
    return { ok: !!clean, svg: clean };
  }

  function svgToDataUrl(svg) {
    const clean = sanitizeSvgString(svg);
    if (!clean) return "";
    try {
      const bytes = new TextEncoder().encode(clean);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return `data:image/svg+xml;base64,${btoa(binary)}`;
    } catch {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`;
    }
  }

  function prepareHtmlPreview(html) {
    const source = String(html || "");
    const csp =
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'; font-src data:;">';
    if (/<head[^>]*>/i.test(source)) return source.replace(/<head[^>]*>/i, (tag) => `${tag}${csp}`);
    return `${csp}${source}`;
  }

  function htmlToDataUrl(html) {
    try {
      return `data:text/html;charset=utf-8,${encodeURIComponent(String(html || ""))}`;
    } catch {
      return "";
    }
  }

  // ---------- API response helpers ----------

  function unwrapData(value) {
    let current = value;
    for (let i = 0; i < 4; i += 1) {
      if (!current || typeof current !== "object" || Array.isArray(current)) break;
      const keys = Object.keys(current);
      const looksWrapper = current.data !== undefined && (keys.includes("success") || keys.includes("message") || keys.length <= 4);
      if (!looksWrapper) break;
      current = current.data;
    }
    return current;
  }

  function extractItems(response) {
    const data = unwrapData(response);
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    for (const key of ["items", "list", "channels", "tokens", "records", "results", "data"]) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }

  function extractTokenKey(response) {
    const data = unwrapData(response);
    if (typeof data === "string" && data.trim()) return data.trim();
    if (!data || typeof data !== "object") return "";
    for (const key of ["key", "token", "api_key", "apiKey", "sk"]) {
      if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
    }
    return "";
  }

  function normalizeToken(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = Number(raw.id ?? raw.token_id ?? raw.tokenId);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const status = raw.status;
    const expired = Number(raw.expired_time ?? raw.expiredTime ?? 0);
    const remain = Number(raw.remain_quota ?? raw.remainQuota ?? 0);
    const unlimited = raw.unlimited_quota === true || raw.unlimited_quota === 1;
    const active = status === undefined || status === null || status === true || status === 1 || status === "1" || status === "active" || status === "enabled";
    return {
      id,
      name: String(raw.name || raw.token_name || `Token ${id}`),
      status,
      active,
      unlimited,
      remain,
      expiredTime: expired,
      group: String(raw.group || ""),
      modelLimits: String(raw.model_limits || raw.modelLimits || ""),
      raw,
    };
  }

  function isTokenUsable(token) {
    if (!token) return false;
    if (!token.active) return false;
    if (token.expiredTime > 0 && token.expiredTime * 1000 < Date.now()) return false;
    if (!token.unlimited && token.remain <= 0) return false;
    return true;
  }

  function tokenLabel(token) {
    if (!token) return "No token";
    return `${token.name} (#${token.id})`;
  }

  // ---------- storage ----------

  async function getSettings() {
    const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    return {
      apiKey: typeof stored.apiKey === "string" ? stored.apiKey : "",
      tokenMode: stored.tokenMode === "manual" ? "manual" : "auto",
      preferredTokenId: stored.preferredTokenId ? String(stored.preferredTokenId) : "",
      stream: stored.stream !== false,
      timeoutSec: clampInt(stored.timeoutSec, 30, 900, DEFAULT_SETTINGS.timeoutSec),
      maxTokens: clampInt(stored.maxTokens, 256, 131072, DEFAULT_SETTINGS.maxTokens),
      historyLimit: clampInt(stored.historyLimit, 10, 500, DEFAULT_SETTINGS.historyLimit),
    };
  }

  function saveSettings(patch) {
    return chrome.storage.local.set(patch);
  }

  async function getHistory() {
    const { history } = await chrome.storage.local.get("history");
    return Array.isArray(history) ? history : [];
  }

  function trimHistoryBytes(history, maxBytes = 12 * 1024 * 1024) {
    let total = 0;
    for (let i = 0; i < history.length; i += 1) {
      const record = history[i];
      const size = (record.artifacts || []).reduce((sum, artifact) => sum + String(artifact.content || "").length, 0);
      if (total + size > maxBytes) {
        for (let j = i; j < history.length; j += 1) {
          history[j] = {
            ...history[j],
            artifacts: (history[j].artifacts || []).map((artifact) =>
              artifact.content ? { ...artifact, content: "", contentDropped: true } : artifact
            ),
          };
        }
        break;
      }
      total += size;
    }
    return history;
  }

  async function addHistory(entry, limit = DEFAULT_SETTINGS.historyLimit) {
    const record = { ...entry, artifacts: Array.isArray(entry?.artifacts) ? entry.artifacts.slice(0, MAX_STORED_ARTIFACTS) : [] };
    let budget = MAX_HISTORY_ARTIFACT_BYTES;
    record.artifacts = record.artifacts.map((artifact) => {
      const content = String(artifact.content || "");
      if (content.length > MAX_STORED_CONTENT || content.length > budget) {
        budget = Math.max(0, budget - content.length);
        return { ...artifact, content: "", contentDropped: true };
      }
      budget -= content.length;
      return { ...artifact, content };
    });
    let history = await getHistory();
    history.unshift(record);
    history.length = Math.min(history.length, clampInt(limit, 10, 500, DEFAULT_SETTINGS.historyLimit));
    history = trimHistoryBytes(history);
    await chrome.storage.local.set({ history });
    return record;
  }

  async function deleteHistory(id) {
    const history = await getHistory();
    await chrome.storage.local.set({ history: history.filter((entry) => entry.id !== id) });
  }

  async function clearHistory() {
    await chrome.storage.local.set({ history: [] });
  }

  // ---------- scratch directory ----------

  class Scratch {
    constructor() {
      this.files = new Map();
      this.bytes = 0;
    }

    write(path, content, { action = "write", hint = "" } = {}) {
      const text = String(content ?? "");
      if (!text) throw new Error("Refusing to write an empty file.");
      if (byteLength(text) > MAX_ARTIFACT_BYTES) throw new Error("File is too large for the browser scratch directory.");
      if (this.bytes + byteLength(text) > MAX_SCRATCH_BYTES) throw new Error("Scratch directory is full.");
      const finalPath = normalizePath(path, `artifact-${this.files.size + 1}.txt`);
      const previous = this.files.get(finalPath);
      if (previous) this.bytes -= previous.bytes;
      const record = {
        path: finalPath,
        content: text,
        kind: kindFromPath(finalPath, text),
        bytes: byteLength(text),
        action,
        hint,
        modifiedAt: Date.now(),
      };
      this.files.set(finalPath, record);
      this.bytes += record.bytes;
      return record;
    }

    read(path) {
      const key = normalizePath(path);
      const file = this.files.get(key);
      if (!file) {
        const short = key.split("/").pop();
        for (const candidate of this.files.values()) {
          if (candidate.path.split("/").pop() === short) return candidate;
        }
        return null;
      }
      return file;
    }

    list() {
      return [...this.files.values()].sort((a, b) => a.path.localeCompare(b.path));
    }

    clear() {
      this.files.clear();
      this.bytes = 0;
    }

    toHistory() {
      return this.list().map((file) => ({
        path: file.path,
        kind: file.kind,
        bytes: file.bytes,
        content: file.content,
        action: file.action,
      }));
    }
  }

  globalThis.A6P = {
    SVG_NS,
    XLINK_NS,
    DEFAULT_SETTINGS,
    PROBES,
    getProbe,
    clampInt,
    makeId,
    byteLength,
    formatBytes,
    formatDuration,
    formatTime,
    timeAgo,
    truncate,
    escapeHtml,
    normalizePath,
    extensionOf,
    kindFromPath,
    safeFileName,
    parseArtifacts,
    stripArtifactsFromText,
    analyzeSvg,
    analyzeHtml,
    scorePelican,
    scoreFlight,
    scoreQuick,
    scoreCandy,
    scorePelicanLite,
    extractCandyAnswer,
    CANDY_EXPECTED,
    prefersRawOutput,
    scoreCustom,
    scoreProbe,
    sanitizeSvgString,
    validateSvg,
    svgToDataUrl,
    prepareHtmlPreview,
    htmlToDataUrl,
    unwrapData,
    extractItems,
    extractTokenKey,
    normalizeToken,
    isTokenUsable,
    tokenLabel,
    getSettings,
    saveSettings,
    getHistory,
    addHistory,
    deleteHistory,
    clearHistory,
    Scratch,
  };
})();
