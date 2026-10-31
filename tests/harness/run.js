const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const PORT = Number(process.env.PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_EXT = path.join(os.tmpdir(), "a6-prober-test-extension");
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "a6-prober-profile-"));

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    "/mnt/j/Relay Projects/veriDropCatalog/extension/node_modules/playwright",
    "/mnt/j/Relay Projects/remotionVideoAyanAcademy/node_modules/playwright",
    "/mnt/j/Relay Projects/DialogusPerennis/node_modules/playwright",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next copy.
    }
  }
  return require("playwright");
}

function copyExtension() {
  fs.rmSync(TEST_EXT, { recursive: true, force: true });
  fs.mkdirSync(TEST_EXT, { recursive: true });
  const copy = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "tests") continue;
      const source = path.join(dir, entry.name);
      const target = path.join(TEST_EXT, path.relative(ROOT, source));
      if (entry.isDirectory()) {
        fs.mkdirSync(target, { recursive: true });
        copy(source);
      } else {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target);
      }
    }
  };
  copy(ROOT);
  const manifestPath = path.join(TEST_EXT, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.host_permissions = ["http://127.0.0.1/*", "http://localhost/*"];
  for (const script of manifest.content_scripts) {
    script.matches = ["http://127.0.0.1/*", "http://localhost/*"];
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.setTimeout(500, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function waitForServer(timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const status = await request(`${BASE}/`);
      if (status === 200) return;
    } catch {
      // Retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Mock server did not start");
}

async function waitForText(page, locator, needle, timeout = 15000) {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < timeout) {
    last = await locator.innerText().catch(() => "");
    if (last.includes(needle)) return last;
    await page.waitForTimeout(120);
  }
  throw new Error(`Timed out waiting for "${needle}". Last text: ${last.slice(0, 500)}`);
}

async function main() {
  copyExtension();
  const server = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => process.stdout.write(`[mock] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[mock] ${chunk}`));
  let context;
  try {
    await waitForServer();

  const { chromium } = loadPlaywright();
  context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: process.env.CHROME_PATH || "/home/yusuf/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome",
    headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || "/tmp/a6libs/root/usr/lib/x86_64-linux-gnu" },
    args: [
      `--disable-extensions-except=${TEST_EXT}`,
      `--load-extension=${TEST_EXT}`,
      "--no-sandbox",
      "--disable-gpu",
    ],
    viewport: { width: 1440, height: 1000 },
  });

  const page = context.pages()[0] || (await context.newPage());
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") console.log(`[page error] ${message.text()}`);
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator(".a6p-row-btn").first().waitFor({ timeout: 10000 });
  assert.equal(await page.locator(".a6p-row-btn").count(), 2, "one probe button per marketplace row");

  await page.locator(".a6p-row-btn").first().click();
  const modal = page.locator(".a6p-modal");
  await modal.waitFor({ timeout: 10000 });
  const header = await page.locator(".a6p-identity").innerText();
  assert.match(header, /#1001/);
  assert.match(header, /gpt-test/);
  await waitForText(page, page.locator(".a6p-auth-note"), "probe-token", 10000);

  await page.locator('.a6p-tab[data-probe="quick"]').click();
  await page.locator(".a6p-run-btn").click();
  await page.locator(".a6p-score-card").waitFor({ timeout: 15000 });
  const quickScore = await page.locator(".a6p-score-card").innerText();
  assert.match(quickScore, /100/);
  const quickAssistant = await page.locator(".a6p-assistant-text").last().innerText();
  assert.match(quickAssistant, /PROBE_OK/);
  assert.match(await page.locator('.a6p-tab[data-probe="flight"]').innerText(), /BazaarLink/);
  assert.match(await page.locator('.a6p-tab[data-probe="pelican"]').innerText(), /Pelicans Test/);

  await page.locator('.a6p-tab[data-probe="pelican"]').click();
  await page.locator(".a6p-run-btn").click();
  await page.locator(".a6p-tool-card", { hasText: "pelican-riding-bicycle.svg" }).waitFor({ timeout: 20000 });
  await page.locator(".a6p-score-card").waitFor({ timeout: 15000 });
  assert.equal(await page.locator(".a6p-tool-card img").count() > 0, true, "pelican SVG preview rendered");

  await page.locator('.a6p-tab[data-probe="pelican-lite"]').click();
  await page.locator(".a6p-run-btn").click();
  await page.locator(".a6p-tool-card", { hasText: "pelican" }).waitFor({ timeout: 20000 });
  await page.locator(".a6p-score-card").waitFor({ timeout: 15000 });
  assert.equal(await page.locator(".a6p-tool-card img").count() > 0, true, "simplified pelican preview rendered");

  await page.locator('.a6p-tab[data-probe="flight"]').click();
  await page.locator(".a6p-run-btn").click();
  await page.locator(".a6p-tool-card", { hasText: "pelican-flight.html" }).waitFor({ timeout: 25000 });
  await page.locator(".a6p-score-card").waitFor({ timeout: 20000 });
  assert.equal(await page.locator(".a6p-tool-card iframe").count() > 0, true, "HTML preview rendered");
  await page.screenshot({ path: path.join(__dirname, "flight-screenshot.png") });

  await page.locator('.a6p-tab[data-probe="candy"]').click();
  await page.locator(".a6p-run-btn").click();
  await page.locator(".a6p-candy-card").waitFor({ timeout: 20000 });
  const candyCard = await page.locator(".a6p-candy-card").innerText();
  assert.match(candyCard, /Expected answer/);
  assert.match(candyCard, /Passed/i);
  assert.match(candyCard, /29/);
  await page.screenshot({ path: path.join(__dirname, "candy-screenshot.png") });

  await page.locator('.a6p-tab[data-probe="custom"]').click();
  await page.locator("textarea").fill("CUSTOM_OK");
  await page.locator(".a6p-send-btn").click();
  await waitForText(page, page.locator(".a6p-assistant-text").last(), "CUSTOM_OK", 15000);
  await page.locator(".a6p-score-card").waitFor({ timeout: 10000 });

  await page.waitForTimeout(1200);

  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 8000 });
  const extensionId = new URL(worker.url()).host;
  const options = await context.newPage();
  const optionErrors = [];
  options.on("pageerror", (error) => optionErrors.push(String(error)));
  await options.goto(`chrome-extension://${extensionId}/options/options.html`);
  await options.locator(".history-item").first().waitFor({ timeout: 10000 });
  await options.screenshot({ path: path.join(__dirname, "options-screenshot.png") });
  const historyCount = await options.locator(".history-item").count();
  assert.equal(historyCount >= 6, true, `expected at least 6 history records, got ${historyCount}`);
  await options.locator(".history-item .detail-btn").first().click();
  await options.locator("#detailModal:not(.hidden)").waitFor({ timeout: 5000 });
  const detail = await options.locator("#detailBody").innerText();
  assert.match(detail, /Artifacts/i);
  await options.screenshot({ path: path.join(__dirname, "options-detail-screenshot.png") });

  await options.locator('#detailModal [data-close-modal][aria-label="Close"]').click();
  await options.locator('input[name="tokenMode"][value="manual"]').check();
  await options.locator("#apiKey").fill("sk-design-test");
  await options.locator("#toggleKey").click();
  assert.equal(await options.locator("#apiKey").getAttribute("type"), "text");
  await options.locator("#saveConnection").click();
  await waitForText(options, options.locator("#connectionNote"), "saved");
  await options.locator('input[name="tokenMode"][value="auto"]').check();
  await options.locator("#saveConnection").click();
  await options.locator("#saveDefaults").click();
  await waitForText(options, options.locator("#defaultsNote"), "saved");

  await options.locator("#historyLimit").focus();
  await options.keyboard.press("Tab");
  assert.equal(await options.locator("#stream").evaluate((el) => el === document.activeElement), true);
  assert.notEqual(await options.locator(".switch").evaluate((el) => getComputedStyle(el).outlineStyle), "none", "streaming switch has a visible keyboard focus indicator");
  await page.locator('.a6p-tab[data-probe="pelican-lite"]').click();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await options.setViewportSize({ width, height: 900 });
    assert.equal(await options.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `options overflow at ${width}px`);
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth), true, `probe panel overflow at ${width}px`);
    assert.equal(await page.locator(".a6p-composer").evaluate((el) => el.scrollWidth <= el.clientWidth), true, `composer overflow at ${width}px`);
    assert.equal(await page.locator(".a6p-topbar").evaluate((el) => el.scrollWidth <= el.clientWidth), true, `probe header overflow at ${width}px`);
    assert.equal(await page.locator(".a6p-intro").evaluate((el) => el.scrollWidth <= el.clientWidth), true, `probe intro overflow at ${width}px`);
    await options.locator(".history-item .detail-btn").first().click();
    assert.equal(await options.locator(".modal-card").evaluate((el) => el.scrollWidth <= el.clientWidth), true, `history detail overflow at ${width}px`);
    await options.locator('#detailModal [data-close-modal][aria-label="Close"]').click();
  }

  await options.locator("#historySearch").fill("no-matching-model-for-design-test");
  await waitForText(options, options.locator("#historyEmpty"), "No matching runs");
  await options.locator("#historySearch").fill("");
  assert.equal(await options.locator(".history-item").count(), historyCount);

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("\n")}`);
  assert.deepEqual(optionErrors, [], `options errors: ${optionErrors.join("\n")}`);

  console.log("Browser harness passed");
  console.log(`History records: ${historyCount}`);
  console.log(`Screenshot: ${path.join(__dirname, "flight-screenshot.png")}`);

  } finally {
    if (context) await context.close().catch(() => {});
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
