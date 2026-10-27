// End-to-end tests of the real Express app (no database needed): real PDFs, real parsing, real rate limits.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.SCAN_LIMIT_PER_HOUR = "6";
delete process.env.GEMINI_API_KEY;

const jwt = require("jsonwebtoken");
const { createApp } = require("../app");
const { makePdf } = require("../test-helpers/pdf");

let server, base;
test.before(async () => {
  await new Promise((resolve) => { server = createApp().listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const USER1 = tokenFor("64b7f0f0f0f0f0f0f0f0f0f1");
const USER2 = tokenFor("64b7f0f0f0f0f0f0f0f0f0f2");

const JD = "We need a full stack developer with strong Node.js, React, MongoDB and REST API experience. JWT authentication is required. CI/CD and Docker are a plus.";
const weak = ["Pavan Reddy  pavan@mail.com  github.com/pavan", "Summary", "Final year CSE student interested in web development.", "Skills", "React, JavaScript, HTML, CSS, Git",
  "Experience", "Intern at Zyphotek Technology Solutions for one month", "- Worked on testing and fixing bugs during the internship", "Education", "B.E. CSE Prathyusha Engineering College", "Projects", "- Built a resume analyzer web application for students"];
const strong = [...weak, "- Built a REST API with Node.js and Express serving 500+ users secured with JWT authentication", "- Designed MongoDB schemas and deployed with a CI/CD pipeline using Docker"];

function form(files, extra = {}) {
  const fd = new FormData();
  for (const [name, buf, type = "application/pdf", filename = name + ".pdf"] of files) fd.append(name, new Blob([buf], { type }), filename);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return fd;
}
const compare = (token, files, jd = JD) =>
  fetch(`${base}/api/analysis/compare`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form(files, { jobDescription: jd }) });

test("root and health endpoints respond", async () => {
  assert.equal((await (await fetch(base + "/")).json()).message, "ResumeForge AI API running");
  const h = await (await fetch(base + "/api/health")).json();
  assert.equal(h.ok, true);
  assert.equal(h.aiKeySet, false);
  assert.equal(h.database, "not connected"); // no database in tests
});

test("AI health page explains the problem instead of crashing when no key is set", async () => {
  const r = await (await fetch(base + "/api/health/ai")).json();
  assert.equal(r.ok, false);
  assert.match(r.error, /GEMINI_API_KEY/);
});

test("security headers are on", async () => {
  const res = await fetch(base + "/");
  assert.ok(res.headers.get("x-content-type-options"));
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("scanning requires login", async () => {
  const res = await compare(null, [["resumeA", makePdf(weak)], ["resumeB", makePdf(strong)]]);
  assert.equal(res.status, 401);
});

test("compare: the stronger resume scores higher and the two small PDFs are not mixed up", async () => {
  const res = await compare(USER1, [["resumeA", makePdf(weak)], ["resumeB", makePdf(strong)]]);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.resumeB.score > body.resumeA.score, `B ${body.resumeB.score} should beat A ${body.resumeA.score}`);
  const inB = (k) => body.resumeB.skills.matched.some((m) => m.skill === k);
  const inA = (k) => body.resumeA.skills.matched.some((m) => m.skill === k);
  assert.ok(inB("node.js") && inB("jwt") && inB("docker"));
  assert.ok(!inA("node.js") && !inA("jwt") && !inA("docker"), "resume A must not contain B's skills");
  assert.ok(body.diff.newlyMatchedKeywords.includes("node.js"));
  assert.ok(body.resumeA.skills.missing.some((m) => m.skill === "node.js" && m.required));
});

test("uploading something that is not a PDF is a clear 400", async () => {
  const res = await compare(USER1, [["resumeA", Buffer.from("hello"), "text/plain", "a.txt"], ["resumeB", makePdf(strong)]]);
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /Only PDF files/);
});

test("a corrupt PDF gives a friendly message, not a crash", async () => {
  const res = await compare(USER1, [["resumeA", Buffer.from("not really a pdf")], ["resumeB", makePdf(strong)]]);
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /could not read this PDF/i);
});

test("a file over 3 MB is rejected with a clear message", async () => {
  const res = await compare(USER1, [["resumeA", Buffer.alloc(3.5 * 1024 * 1024)], ["resumeB", makePdf(strong)]]);
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /too large/i);
});

test("scan rate limit: one user gets blocked, a different user is unaffected", async () => {
  let blocked = null;
  for (let i = 0; i < 10 && !blocked; i++) {
    const res = await compare(USER1, [["resumeA", makePdf(weak)]]); // 400 (needs two files) still counts as a request
    if (res.status === 429) blocked = await res.json();
  }
  assert.ok(blocked, "user 1 should hit the limit");
  assert.match(blocked.message, /Scan limit reached/);
  const other = await compare(USER2, [["resumeA", makePdf(weak)]]);
  assert.notEqual(other.status, 429, "user 2 has their own allowance");
});

test("repeated failed logins are rate limited", async () => {
  let limited = false;
  for (let i = 0; i < 60 && !limited; i++) {
    const res = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (res.status === 429) limited = true;
  }
  assert.ok(limited);
});
