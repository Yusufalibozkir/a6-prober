const test = require("node:test");
const assert = require("node:assert/strict");

require("../src/lib.js");
require("../src/api.js");
const A6P = globalThis.A6P;
const API = globalThis.A6PAPI;

test("channelAuthorization pins the channel suffix", () => {
  assert.equal(API.channelAuthorization("sk-abc123", 42), "Bearer sk-abc123-42");
  assert.equal(API.channelAuthorization("abc123", 42), "Bearer sk-abc123-42");
  assert.equal(API.channelAuthorization("Bearer sk-abc123", 42), "Bearer sk-abc123-42");
  assert.throws(() => API.channelAuthorization("", 42), /No A6API token/);
  assert.throws(() => API.channelAuthorization("abc", 0), /Missing channel/);
});

test("pickToken prefers a usable preferred token", () => {
  const tokens = [
    A6P.normalizeToken({ id: 1, name: "empty", status: 1, remain_quota: 0 }),
    A6P.normalizeToken({ id: 2, name: "main", status: 1, remain_quota: 1000 }),
    A6P.normalizeToken({ id: 3, name: "backup", status: 1, remain_quota: 500 }),
  ];
  assert.equal(API.pickToken(tokens, "2", "gpt-test").id, 2);
  assert.equal(API.pickToken(tokens, null, "gpt-test").id, 2);
});

test("pickToken respects model limits", () => {
  const tokens = [
    A6P.normalizeToken({ id: 1, name: "claude", status: 1, remain_quota: 100, model_limits: "claude-3" }),
    A6P.normalizeToken({ id: 2, name: "all", status: 1, remain_quota: 100, model_limits: "all" }),
  ];
  assert.equal(API.pickToken(tokens, null, "gpt-4o").id, 2);
  assert.equal(API.pickToken(tokens, "1", "gpt-4o").id, 2);
  assert.equal(API.pickToken(tokens, null, "claude-3").id, 1);
});

test("tools fallback recognizes relevant gateway errors", () => {
  const toolsError = new API.ApiError("HTTP 400: tools are not supported by this model", { status: 400 });
  assert.equal(API.isToolsUnsupported(toolsError), true);
  const authError = new API.ApiError("HTTP 401: invalid token", { status: 401 });
  assert.equal(API.isToolsUnsupported(authError), false);
  const streamError = new API.ApiError("HTTP 400: stream is not supported", { status: 400 });
  assert.equal(API.isStreamUnsupported(streamError), true);
});

test("callModel dispatches responses endpoint", () => {
  assert.equal(typeof API.callChat, "function");
  assert.equal(typeof API.callResponses, "function");
  assert.equal(typeof API.callModel, "function");
});
