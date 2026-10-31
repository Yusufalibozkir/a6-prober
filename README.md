# A6 Prober

A Chrome extension that adds sharellm-style **Probe detection** to the A6API marketplace.

It injects a small **Probe** button next to every model name on `a6api.vip`. Clicking it opens a full-screen test panel with:

- **BazaarLink probe** — a local reimplementation of the agentic BazaarLink-style flow: draw an SVG, read it back, and build an animated HTML scene.
- **Pelicans Test** — the canonical “pelican riding a bicycle” SVG test.
- **Pelicans Test - Simplified Version** — a fast, low-token SVG check with tools disabled; the panel opens on this path by default.
- **Candy Detection** — a deterministic known-answer reasoning puzzle. The correct answer for the published bag counts is **29** (the public sharellm UI’s “21” is arithmetically wrong; Prober uses 29).
- **Quick probe** — a tiny latency / instruction-following check.
- **Custom test** — your own prompt, with optional tool-written files and multi-turn follow-ups.
- **Browser scratch directory** — files written by the model are previewed, downloadable and kept locally for the session.
- **Probe score** — a local signal score based on artifact validity, subject cues, detail, latency and streaming.

A screenshot from the included browser harness is at `tests/harness/flight-screenshot.png`.

## Install

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder:
   `J:\Relay Projects\prober`
   (the Windows path for `/mnt/j/Relay Projects/prober`).
4. Log in at <https://a6api.vip/> and open the **Marketplace** page.
5. Click **Probe** next to any model name.

After changing extension files, click **Reload** on `chrome://extensions` and refresh the A6API tab.

## Tokens and billing

When you are logged in to A6API, the panel automatically discovers your token list and uses the token selected in the marketplace. No API key entry is needed.

- Auto mode fetches the token key in memory when a probe starts. It does **not** save that key to extension storage.
- You can still save a manual API key under **Extension settings** as a fallback, or use it when you are not logged in.
- Every run is a real gateway request and is billed to the selected A6API token. The panel shows the token before running.
- Prober uses the same channel routing convention as the site: `Bearer sk-<token-key>-<channel-id>`.

## What the score means

The header badge is a **local heuristic**, not a model-identity verdict. It is computed from things a browser can verify: SVG/HTML validity, whether the expected subjects appear, detail, file sizes, latency, and whether streaming/tool calls completed. Candy Detection is a pass/fail known-answer check, so a correct final number is 100 and a wrong or missing number is 0.

A low score can also be caused by a bad generation, a truncated stream, an unsupported tool mode, or a provider quirk. Use it as a quick comparison signal, not proof.

## Supported channels

The panel currently sends text probes to channels exposing the `chat` or `responses` test endpoint. Image/video-only channels are detected and the run controls are disabled with an explanation.

If a channel rejects tool calls, Prober retries without tools and extracts complete files from fenced code blocks. If a channel rejects SSE, it retries once without streaming.

## Privacy and safety

- No telemetry, analytics or external servers. Requests go only to the A6API origin you are already using.
- Auto-fetched token keys stay in memory for the open panel.
- A manual key, if you save one, is stored in `chrome.storage.local` and sent only to the A6API gateway.
- Model-generated HTML is rendered in a sandboxed iframe with scripts disabled and a restrictive CSP. SVG previews are sanitized.
- Downloading an artifact is explicit; downloaded HTML can run scripts if you open it outside the sandbox.

## Development

```bash
npm test        # unit tests for parsing, scoring, tokens, auth
npm run check   # syntax check for every extension script
```

There is also a Playwright harness that loads the extension into headless Chromium against a mock marketplace:

```bash
node tests/harness/run.js
```

It exercises injection, auto token discovery, streaming, tool-call loops, SVG/HTML previews, custom prompts, history and the options page.

### Layout

```
manifest.json          MV3 manifest
src/page-hook.js       MAIN-world marketplace response observer
src/lib.js             artifact parsing, SVG safety, scoring, storage
src/api.js             A6API token discovery, SSE client, gateway auth
src/probes.js          probe prompts and the small tool-call agent loop
src/content.js         marketplace buttons and the Probe detection overlay
src/background.js      toolbar/options routing
options/               settings, manual key and run history
icons/                 extension icons
tests/                 unit tests and browser harness
```

## Limitations

- This is an independent tool; it is not affiliated with A6API, sharellm, BazaarLink or any upstream relay.
- The BazaarLink tab is a local agentic reimplementation, not a call to a proprietary BazaarLink service.
- The local score cannot prove which model a supplier is serving. Candy Detection uses the mathematically correct answer 29; the public reference screenshot shows 21, which does not match its own bag counts.
- Very long SVG/HTML outputs may hit the per-file scratch limit (768 KB) or the provider's output limit.
- The HTML preview does not run JavaScript, matching the “Scripts do not run in the preview” behavior of the reference UI.
