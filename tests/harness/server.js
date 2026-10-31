const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const root = __dirname;

const channels = [
  {
    listing_id: 1001,
    channel_id: 11,
    model_name: "gpt-test",
    test_endpoint: "chat",
    supplier_name: "Test Supplier",
    channel_name: "channel-eleven",
  },
  {
    listing_id: 1002,
    channel_id: 12,
    model_name: "claude-test",
    test_endpoint: "chat",
    supplier_name: "Test Supplier",
    channel_name: "channel-twelve",
  },
];

const tokens = [
  {
    id: 1,
    name: "probe-token",
    status: 1,
    remain_quota: 100000,
    unlimited_quota: false,
    expired_time: 0,
  },
];

const pelicanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f7e9c8"/>
  <circle cx="220" cy="460" r="76" fill="none" stroke="#323232" stroke-width="10"/>
  <circle cx="540" cy="460" r="76" fill="none" stroke="#323232" stroke-width="10"/>
  <path d="M220 460 L330 345 L490 345 L540 460 M330 345 L390 460 M490 345 L445 460" fill="none" stroke="#323232" stroke-width="8"/>
  <path d="M380 270 C400 210 450 190 500 215 C545 238 555 285 525 315 L455 345 C425 330 395 305 380 270Z" fill="#f6f1e7" stroke="#323232" stroke-width="5"/>
  <path d="M500 230 L610 255 L515 285Z" fill="#e7a93c" stroke="#323232" stroke-width="5"/>
  <path d="M452 238 C470 254 482 266 500 272" fill="none" stroke="#323232" stroke-width="4"/>
  <path d="M380 270 C360 290 345 320 338 345" fill="none" stroke="#323232" stroke-width="5"/>
  <ellipse cx="420" cy="300" rx="52" ry="33" fill="#f6f1e7" stroke="#323232" stroke-width="4"/>
  <path d="M338 345 L305 392 L345 402 L375 350Z" fill="#f6f1e7" stroke="#323232" stroke-width="4"/>
  <path d="M345 460 L335 515 L365 515 L378 460" fill="none" stroke="#e7a93c" stroke-width="8"/>
  <path d="M410 460 L430 515 L460 515 L448 460" fill="none" stroke="#e7a93c" stroke-width="8"/>
  <path d="M90 80 C170 30 270 50 330 100 C270 120 170 120 90 80Z" fill="#fff" opacity=".55"/>
  <path d="M600 70 C680 20 760 45 800 90 C740 110 660 110 600 70Z" fill="#fff" opacity=".4"/>
  <path d="M0 540 C150 500 300 560 450 530 C600 500 720 540 800 520 L800 600 L0 600Z" fill="#7cc8c8" opacity=".45"/>
</svg>`;

const flightHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body { margin: 0; display: grid; place-items: center; background: #0d2638; font-family: system-ui, sans-serif; overflow: hidden; }
  .scene { position: relative; width: 100vw; height: 100vh; min-height: 260px; overflow: hidden; background: linear-gradient(180deg, #f4c777 0%, #e99367 36%, #4f8fa6 37%, #16435e 100%); }
  .sun { position: absolute; top: 9%; left: 50%; width: 13%; aspect-ratio: 1; transform: translateX(-50%); border-radius: 50%; background: #fff2b8; box-shadow: 0 0 60px #ffd98e; }
  .bird { position: absolute; top: 22%; left: 50%; width: 30%; transform: translateX(-50%); animation: fly 4s ease-in-out infinite alternate; filter: drop-shadow(0 18px 12px rgba(13, 38, 56, .35)); }
  .wave { position: absolute; bottom: -20px; left: -10%; width: 120%; height: 170px; opacity: .55; background: radial-gradient(ellipse at 50% 100%, #9ed8dc 0%, transparent 70%); animation: drift 6s linear infinite; }
  .wave.two { bottom: 40px; height: 120px; opacity: .26; animation-duration: 9s; animation-direction: reverse; }
  .cloud { position: absolute; width: 160px; height: 40px; border-radius: 999px; background: #fff3d8; opacity: .55; animation: clouds 12s linear infinite; }
  .cloud::before, .cloud::after { content: ""; position: absolute; border-radius: 50%; background: inherit; }
  .cloud::before { width: 70px; height: 70px; left: 25px; top: -28px; }
  .cloud::after { width: 50px; height: 50px; right: 25px; top: -18px; }
  .cloud.one { top: 95px; left: -170px; }
  .cloud.two { top: 160px; left: -320px; transform: scale(.7); animation-duration: 18s; }
  @keyframes fly { from { transform: translate(-50%, 0) rotate(-2deg); } to { transform: translate(-50%, -24px) rotate(2deg); } }
  @keyframes drift { from { transform: translateX(-4%); } to { transform: translateX(4%); } }
  @keyframes clouds { from { transform: translateX(0); } to { transform: translateX(150vw); } }
</style>
</head>
<body>
  <main class="scene">
    <div class="sun"></div>
    <div class="cloud one"></div>
    <div class="cloud two"></div>
    <div class="wave"></div>
    <div class="wave two"></div>
    <div class="bird">${pelicanSvg}</div>
  </main>
</body>
</html>`;

function sendJson(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => (part && typeof part.text === "string" ? part.text : "")).join("");
}

function stall(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sseHeaders(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
}

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamText(res, text, usage = { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 }) {
  sseHeaders(res);
  const chunks = String(text).match(/.{1,12}/g) || [String(text)];
  for (const content of chunks) {
    sse(res, { choices: [{ index: 0, delta: { content } }] });
    await stall(8);
  }
  sse(res, { choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage });
  res.write("data: [DONE]\n\n");
  res.end();
}

async function streamToolCall(res, name, args, id = "call_1") {
  sseHeaders(res);
  sse(res, {
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              id,
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        },
      },
    ],
  });
  await stall(12);
  sse(res, { choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 30, completion_tokens: 20, total_tokens: 50 } });
  res.write("data: [DONE]\n\n");
  res.end();
}

function chooseReply(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
  const lastUser = messages[lastUserIndex] || {};
  const prompt = textOf(lastUser.content);
  const afterUser = messages.slice(lastUserIndex + 1);
  const toolMessages = afterUser.filter((message) => message.role === "tool");
  const toolText = toolMessages.map((message) => textOf(message.content)).join("\n");
  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;

  if (/PROBE_OK/i.test(prompt) && /exactly/i.test(prompt)) {
    return { type: "text", text: "PROBE_OK" };
  }

  if (/black bag contains three flavors/i.test(prompt)) {
    return {
      type: "text",
      text: "Work through the shapes and flavors. The largest safe hand has 28 candies, so one more forces a qualifying pair.\n\nFINAL: 29",
    };
  }

  if (/pelican riding a bicycle/i.test(prompt)) {
    if (hasTools && !toolMessages.length) {
      return { type: "tool", name: "write_file", args: { path: "pelican-riding-bicycle.svg", content: pelicanSvg } };
    }
    if (!hasTools) return { type: "text", text: `Here is the drawing.\n\n\`\`\`svg file=pelican-riding-bicycle.svg\n${pelicanSvg}\n\`\`\`\n\nSaved.` };
    return { type: "text", text: "Saved pelican-riding-bicycle.svg." };
  }

  if (/pelican-realistic\.svg/i.test(prompt) && !/pelican-flight\.html/i.test(prompt)) {
    if (hasTools && !toolMessages.length) {
      return { type: "tool", name: "write_file", args: { path: "pelican-realistic.svg", content: pelicanSvg } };
    }
    return { type: "text", text: "Created pelican-realistic.svg." };
  }

  if (/pelican-flight\.html/i.test(prompt)) {
    if (hasTools && !toolMessages.length) {
      return { type: "tool", name: "read_file", args: { path: "pelican-realistic.svg" }, id: "call_read" };
    }
    if (hasTools && /Contents of pelican-realistic\.svg/i.test(toolText) && !/Wrote pelican-flight\.html/i.test(toolText)) {
      return { type: "tool", name: "write_file", args: { path: "pelican-flight.html", content: flightHtml }, id: "call_write" };
    }
    if (hasTools && /Wrote pelican-flight\.html/i.test(toolText)) {
      return { type: "text", text: "Created pelican-flight.html with an animated pelican scene." };
    }
    if (!hasTools) return { type: "text", text: "I could not write files because tools are unavailable." };
  }

  if (/fence test/i.test(prompt)) {
    return { type: "text", text: `Fence test result:\n\n\`\`\`svg file=fence.svg\n${pelicanSvg}\n\`\`\`` };
  }

  if (/tool test/i.test(prompt)) {
    if (hasTools && !toolMessages.length) {
      return { type: "tool", name: "write_file", args: { path: "tool-test.svg", content: pelicanSvg } };
    }
    return { type: "text", text: "Tool test complete." };
  }

  if (/CUSTOM_OK/i.test(prompt)) return { type: "text", text: "CUSTOM_OK" };
  return { type: "text", text: `Mock reply from ${body.model || "unknown model"}. You said: ${prompt.slice(0, 140)}` };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === "/api/marketplace/channels/search") {
    sendJson(res, { success: true, data: { channels, total: channels.length, self_test_enabled: true } });
    return;
  }
  if (url.pathname === "/api/token/") {
    sendJson(res, { success: true, data: tokens, total: tokens.length });
    return;
  }
  if (/^\/api\/token\/\d+\/key$/.test(url.pathname)) {
    sendJson(res, { success: true, data: { key: "test-key" } });
    return;
  }
  if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
    const body = await readBody(req);
    const reply = chooseReply(body);
    if (reply.type === "tool") {
      await streamToolCall(res, reply.name, reply.args, reply.id);
    } else {
      await streamText(res, reply.text);
    }
    return;
  }
  if (url.pathname === "/v1/responses" && req.method === "POST") {
    const body = await readBody(req);
    await streamText(res, `Responses mock for ${body.model || "unknown"}: PROBE_OK`);
    return;
  }
  sendJson(res, { success: false, message: `No mock route for ${url.pathname}` }, 404);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock A6API listening on http://127.0.0.1:${PORT}`);
});
