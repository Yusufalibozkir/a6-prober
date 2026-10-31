const test = require("node:test");
const assert = require("node:assert/strict");

require("../src/lib.js");
const A6P = globalThis.A6P;

function sampleSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f6e7c8"/>
  <circle cx="260" cy="470" r="80" fill="none" stroke="#333" stroke-width="10"/>
  <circle cx="560" cy="470" r="80" fill="none" stroke="#333" stroke-width="10"/>
  <path d="M260 470 L360 360 L500 360 L560 470 M360 360 L420 470 M500 360 L450 470" fill="none" stroke="#333" stroke-width="8"/>
  <path d="M400 280 C420 220 470 200 520 225 C560 245 570 290 540 320 L470 350 C440 335 410 315 400 280Z" fill="#f5f0e6" stroke="#333" stroke-width="5"/>
  <path d="M520 240 L610 260 L530 285Z" fill="#e7a93c" stroke="#333" stroke-width="5"/>
  <path d="M470 245 C485 260 495 270 510 275" fill="none" stroke="#333" stroke-width="4"/>
  <path d="M400 280 C380 300 365 330 360 360" fill="none" stroke="#333" stroke-width="5"/>
  <ellipse cx="430" cy="300" rx="55" ry="35" fill="#f5f0e6" stroke="#333" stroke-width="4"/>
  <path d="M350 340 L320 390 L360 400 L390 350Z" fill="#f5f0e6" stroke="#333" stroke-width="4"/>
  <path d="M370 470 L360 520 L390 520 L400 470" fill="none" stroke="#e7a93c" stroke-width="8"/>
  <path d="M430 470 L450 520 L480 520 L470 470" fill="none" stroke="#e7a93c" stroke-width="8"/>
  <path d="M100 80 C180 30 280 50 340 100 C280 120 180 120 100 80Z" fill="#fff" opacity=".55"/>
  <path d="M600 70 C680 20 760 45 800 90 C740 110 660 110 600 70Z" fill="#fff" opacity=".4"/>
  <path d="M0 540 C150 500 300 560 450 530 C600 500 720 540 800 520 L800 600 L0 600Z" fill="#7cc8c8" opacity=".45"/>
</svg>`;
}

test("normalizePath strips traversal and unsafe characters", () => {
  assert.equal(A6P.normalizePath("../secret.svg"), "file.txt");
  assert.equal(A6P.normalizePath("/a/b c.svg"), "a/b_c.svg");
  assert.equal(A6P.normalizePath("../../"), "file.txt");
  assert.equal(A6P.normalizePath("pelican-realistic.svg"), "pelican-realistic.svg");
});

test("parseArtifacts extracts a labelled fenced SVG", () => {
  const text = "Here is the file.\n\n```svg file=pelican-riding-bicycle.svg\n" + sampleSvg() + "\n```\n\nDone.";
  const artifacts = A6P.parseArtifacts(text, { hintText: "Draw a pelican" });
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].path, "pelican-riding-bicycle.svg");
  assert.equal(artifacts[0].kind, "svg");
  assert.ok(artifacts[0].bytes > 100);
  assert.equal(A6P.stripArtifactsFromText(text), "Here is the file.\n\nDone.");
});

test("parseArtifacts uses a filename line before the fence", () => {
  const text = "**pelican-flight.html**\n```html\n<!doctype html><html><body><svg></svg></body></html>\n```";
  const artifacts = A6P.parseArtifacts(text);
  assert.equal(artifacts[0].path, "pelican-flight.html");
  assert.equal(artifacts[0].kind, "html");
});

test("parseArtifacts finds a raw SVG outside fences", () => {
  const artifacts = A6P.parseArtifacts("Rendered result:\n" + sampleSvg(), { hintText: "pelican" });
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].kind, "svg");
  assert.equal(artifacts[0].path, "pelican.svg");
});

test("parseArtifacts de-duplicates names", () => {
  const text = "```svg file=drawing.svg\n<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n```\n```svg file=drawing.svg\n<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n```";
  const artifacts = A6P.parseArtifacts(text);
  assert.deepEqual(artifacts.map((a) => a.path), ["drawing.svg", "drawing-2.svg"]);
});

test("pelican score rewards a complete bicycle drawing", () => {
  const svg = sampleSvg();
  const result = A6P.scorePelican({
    artifacts: [{ path: "pelican.svg", kind: "svg", content: svg, bytes: svg.length }],
    reply: "Saved pelican.svg.",
    durationMs: 12000,
  });
  assert.ok(result.score >= 85, `expected a strong score, got ${result.score}`);
  assert.equal(result.verdict, "strong");
  assert.equal(result.info.circles, 2);
  assert.equal(result.info.hasViewBox, true);
});

test("pelican score fails without an SVG", () => {
  const result = A6P.scorePelican({ artifacts: [], reply: "I cannot draw.", durationMs: 1000 });
  assert.equal(result.score, 10);
  assert.equal(result.verdict, "weak");
});

test("flight score requires both SVG and HTML", () => {
  const svg = sampleSvg();
  const html = `<!doctype html><html><head><style>@keyframes fly { from { transform: translateY(0) } to { transform: translateY(-20px) } } .bird { animation: fly 2s infinite alternate }</style></head><body><svg viewBox="0 0 960 640"><circle cx="1" cy="1" r="1"/></svg><p>pelican flight</p></body></html>`;
  const result = A6P.scoreFlight({
    artifacts: [
      { path: "pelican.svg", kind: "svg", content: svg, bytes: svg.length },
      { path: "pelican-flight.html", kind: "html", content: html, bytes: html.length },
    ],
    reply: "Created both files.",
    durationMs: 40000,
  });
  assert.ok(result.score >= 70, `expected a fair or strong score, got ${result.score}`);
  assert.ok(result.checks.find((check) => check.label === "HTML embeds the SVG").ok);
});

test("quick score requires the exact sentinel", () => {
  assert.equal(A6P.scoreQuick({ reply: "PROBE_OK", durationMs: 300 }).score, 100);
  assert.ok(A6P.scoreQuick({ reply: "hello", durationMs: 300 }).score < 50);
  assert.equal(A6P.scoreQuick({ reply: "", error: "HTTP 500" }).score, 0);
});

test("token helpers normalize the site response", () => {
  const token = A6P.normalizeToken({ id: 7, name: "main", status: 1, remain_quota: 5000, unlimited_quota: false });
  assert.equal(token.id, 7);
  assert.equal(token.active, true);
  assert.equal(A6P.isTokenUsable(token), true);
  assert.equal(A6P.isTokenUsable({ ...token, remain: 0 }), false);
  assert.equal(A6P.isTokenUsable({ ...token, expiredTime: Math.floor(Date.now() / 1000) - 10 }), false);
});

test("extractItems and extractTokenKey unwrap common A6API envelopes", () => {
  assert.deepEqual(A6P.extractItems({ success: true, data: [{ id: 1 }] }), [{ id: 1 }]);
  assert.deepEqual(A6P.extractItems({ data: { channels: [{ id: 2 }] } }), [{ id: 2 }]);
  assert.equal(A6P.extractTokenKey({ success: true, data: { key: "sk-test" } }), "sk-test");
  assert.equal(A6P.extractTokenKey({ data: "sk-raw" }), "sk-raw");
});

test("sanitizeSvgString works without a DOM", () => {
  const clean = A6P.sanitizeSvgString(sampleSvg());
  assert.ok(clean.includes("<svg"));
  assert.equal(A6P.sanitizeSvgString("not svg"), null);
});

test("candy answer parser prefers the FINAL line", () => {
  assert.equal(A6P.extractCandyAnswer("Some reasoning...\nFINAL: 21"), 21);
  assert.equal(A6P.extractCandyAnswer("The answer is 29."), 29);
  assert.equal(A6P.extractCandyAnswer("At least 29 candies must be taken out."), 29);
  assert.equal(A6P.extractCandyAnswer("no number here"), null);
});

test("candy scoring passes 29 and fails 21", () => {
  const good = A6P.scoreCandy({ reply: "Reasoning...\nFINAL: 29", durationMs: 1000 });
  assert.equal(good.score, 100);
  assert.equal(good.verdict, "strong");
  assert.equal(good.correct, true);
  assert.equal(good.actualAnswer, 29);
  const bad = A6P.scoreCandy({ reply: "FINAL: 21", durationMs: 1000 });
  assert.equal(bad.score, 0);
  assert.equal(bad.verdict, "failed");
  assert.equal(bad.actualAnswer, 21);
  assert.match(bad.summary, /inconsistent with the truth/);
});

test("raw-source prompts disable tool mode", () => {
  assert.equal(A6P.prefersRawOutput("Return ONLY the complete SVG source code."), true);
  assert.equal(A6P.prefersRawOutput("No markdown fences, no explanation."), true);
  assert.equal(A6P.prefersRawOutput("Please use write_file to save the drawing."), false);
  assert.equal(A6P.prefersRawOutput("Draw a pelican on a bicycle."), false);
});

test("simplified pelican scoring rewards a clean SVG", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#f7e9c8"/>
    <circle cx="120" cy="230" r="40" fill="none" stroke="#333" stroke-width="6"/>
    <circle cx="280" cy="230" r="40" fill="none" stroke="#333" stroke-width="6"/>
    <path d="M120 230 L190 160 L250 160 L280 230" fill="none" stroke="#333" stroke-width="5"/>
    <path d="M190 160 C210 120 250 110 280 130 C305 145 300 180 275 192 L230 205 C205 195 190 180 190 160Z" fill="#f5f0e6" stroke="#333" stroke-width="4"/>
    <path d="M275 135 L340 150 L280 170Z" fill="#e7a93c" stroke="#333" stroke-width="4"/>
    <path d="M120 230 C100 250 95 270 110 280" fill="none" stroke="#e7a93c" stroke-width="5"/>
  </svg>`;
  const result = A6P.scorePelicanLite({ artifacts: [{ path: "pelican-simple.svg", kind: "svg", content: svg, bytes: svg.length }], durationMs: 8000 });
  assert.ok(result.score >= 85, `expected a strong simplified score, got ${result.score}`);
  assert.equal(result.verdict, "strong");
});
