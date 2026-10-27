const test = require("node:test");
const assert = require("node:assert/strict");

process.env.GEMINI_API_KEY = "test-key";
delete process.env.GEMINI_MODEL;
const ai = require("../utils/ai");

const input = { resumeText: "r".repeat(200), jobDescription: "j".repeat(100), missingKeywords: ["docker"], score: 70 };
const goodReply = { candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: "Good", strengths: ["a"], improvements: ["b"], rewrittenBullets: ["c"], skillGapAdvice: ["d"] }) }] } }] };
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

function fakeGoogle(handler) {
  const calls = [];
  global.fetch = async (url, opts) => { calls.push(String(url)); return handler(String(url), opts); };
  return calls;
}
const realFetch = global.fetch;
test.beforeEach(() => { ai._resetForTests(); process.env.GEMINI_API_KEY = "test-key"; });
test.after(() => { global.fetch = realFetch; });

test("works on the first model and calls Google only once", async () => {
  const calls = fakeGoogle(() => reply(200, goodReply));
  const r = await ai.getAIFeedback(input);
  assert.equal(r.source, "gemini");
  assert.equal(r.model, "gemini-2.5-flash");
  assert.equal(calls.length, 1);
});

test("when every known model name is gone, it asks Google which models exist and uses one", async () => {
  const listing = { models: [
    { name: "models/gemini-4.0-flash-lite", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-4.0-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-embedding-001", supportedGenerationMethods: ["embedContent"] },
    { name: "models/gemma-3-27b", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-4.0-flash-preview-0501", supportedGenerationMethods: ["generateContent"] },
  ] };
  let calls = fakeGoogle((url) => {
    if (url.includes("gemini-4.0-flash:generateContent")) return reply(200, goodReply);
    if (url.includes(":generateContent")) return reply(404, { error: { message: "model not found" } });
    if (url.includes("/models?pageSize")) return reply(200, listing);
    throw new Error("unexpected url " + url);
  });
  const r = await ai.getAIFeedback(input);
  assert.equal(r.source, "gemini");
  assert.equal(r.model, "gemini-4.0-flash", "should pick the newest non-lite flash model");
  assert.ok(!calls.some((u) => /preview|embedding|gemma/.test(u)), "must never call preview/embedding/gemma models");

  // second request: remembers the working model, so no more guessing
  calls = fakeGoogle(() => reply(200, goodReply));
  await ai.getAIFeedback(input);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes("gemini-4.0-flash:generateContent"));
});

test("a bad API key stops immediately with a clear reason (no point trying other models)", async () => {
  const calls = fakeGoogle(() => reply(400, { error: { message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }));
  const r = await ai.getAIFeedback(input);
  assert.equal(r.source, "fallback");
  assert.match(r.fallbackReason, /API key not valid/);
  assert.equal(calls.length, 1);
});

test("hitting the quota (429) stops immediately", async () => {
  const calls = fakeGoogle(() => reply(429, { error: { message: "quota exceeded" } }));
  const r = await ai.getAIFeedback(input);
  assert.equal(r.source, "fallback");
  assert.match(r.fallbackReason, /HTTP 429/);
  assert.equal(calls.length, 1);
});

test("a model that returns garbage is skipped and the next model is used", async () => {
  fakeGoogle((url) => {
    if (url.includes("gemini-2.5-flash:")) return reply(200, { candidates: [{ content: { parts: [{ text: "this is not json" }] } }] });
    return reply(200, goodReply);
  });
  const r = await ai.getAIFeedback(input);
  assert.equal(r.source, "gemini");
  assert.equal(r.model, "gemini-2.5-flash-lite");
});

test("if even model discovery fails, it falls back honestly and says why", async () => {
  fakeGoogle((url) => (url.includes("/models?pageSize") ? reply(403, "forbidden") : reply(404, "nope")));
  const r = await ai.getAIFeedback(input);
  assert.equal(r.source, "fallback");
  assert.match(r.fallbackReason, /discovery/);
  assert.ok(r.skillGapAdvice.length > 0, "fallback still returns useful tips");
});

test("no API key configured: honest fallback and Google is never called", async () => {
  delete process.env.GEMINI_API_KEY;
  fakeGoogle(() => { throw new Error("should not be called"); });
  const r = await ai.getAIFeedback(input);
  assert.equal(r.source, "fallback");
  assert.match(r.fallbackReason, /GEMINI_API_KEY is not set/);
});

test("health check works and is cached so it cannot drain the quota", async () => {
  let calls = fakeGoogle(() => reply(200, { candidates: [{ content: { parts: [{ text: '{"ok": true}' }] } }] }));
  const first = await ai.checkAI();
  assert.equal(first.ok, true);
  const n = calls.length;
  const second = await ai.checkAI();
  assert.equal(second.cached, true);
  assert.equal(calls.length, n, "second check must not call Google again");
});
