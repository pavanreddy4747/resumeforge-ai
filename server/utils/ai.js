// AI feedback via Google Gemini.
//  - Model names change often, so we try a list of models, remember the one that works, and if every name
//    returns "not found" we ask Google which models this key can actually use (ListModels) and try those.
//  - The REAL error is logged and returned, so failures can be diagnosed.
//  - `source` is honest: "gemini" or "fallback". The UI never shows fallback text as if the AI wrote it.

const API = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];
let workingModel = null; // remembered after the first success

function configuredModels() {
  const fromEnv = (process.env.GEMINI_MODEL || "").split(",").map((m) => m.trim()).filter(Boolean);
  return [...new Set([workingModel, ...fromEnv, ...DEFAULT_MODELS].filter(Boolean))];
}

async function callGemini(model, prompt) {
  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
    err.status = res.status;
    // Problems with the KEY or the QUOTA will fail for every model, so there is no point trying the others.
    err.fatal = res.status === 401 || res.status === 403 || res.status === 429 ||
      (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(body));
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// Ask Google which models this key can use, newest flash-style models first.
async function discoverModels() {
  const res = await fetch(`${API}/models?pageSize=100`, { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY } });
  if (!res.ok) throw new Error(`ListModels HTTP ${res.status}`);
  const data = await res.json();
  const skip = /(preview|exp|image|tts|live|audio|embedding|vision|thinking|robotics|computer-use|learnlm|gemma)/i;
  const version = (name) => Number((name.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => n.startsWith("gemini") && /flash/i.test(n) && !skip.test(n))
    .sort((a, b) => Number(/lite/i.test(a)) - Number(/lite/i.test(b)) || version(b) - version(a))
    .slice(0, 4);
}

// Runs a prompt through the model list. Returns { result, model } or { errors }.
async function runWithFallback(prompt) {
  const errors = [];
  const tried = new Set();

  const attempt = async (model) => {
    tried.add(model);
    try {
      const result = await callGemini(model, prompt);
      workingModel = model;
      return { result, model };
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
      console.error(`[AI] ${model} failed -> ${err.message}`);
      if (err.fatal) return { fatal: true };
      return null;
    }
  };

  for (const model of configuredModels()) {
    const out = await attempt(model);
    if (out?.result) return out;
    if (out?.fatal) return { errors };
  }

  // Every known name failed without a key/quota problem: our model names are probably out of date.
  try {
    const discovered = (await discoverModels()).filter((m) => !tried.has(m));
    for (const model of discovered) {
      const out = await attempt(model);
      if (out?.result) return out;
      if (out?.fatal) break;
    }
  } catch (err) {
    errors.push(`discovery: ${err.message}`);
    console.error(`[AI] model discovery failed -> ${err.message}`);
  }
  return { errors };
}

function buildFallback({ missingKeywords, score }, reason) {
  return {
    source: "fallback",
    fallbackReason: reason,
    summary: `Your resume scored ${score}/100 against this job description. Focus on adding the missing keywords naturally into your experience and skills sections.`,
    strengths: ["Resume was parsed successfully", "Core sections were detected"],
    improvements: [
      "Add the missing keywords listed above where they are truthfully relevant",
      "Quantify achievements with numbers (percentages, users, time saved)",
      "Start every bullet point with a strong action verb",
    ],
    rewrittenBullets: [],
    skillGapAdvice: (missingKeywords || []).slice(0, 5).map((k) => `Consider learning or highlighting: ${k}`),
  };
}

function buildPrompt({ resumeText, jobDescription, missingKeywords, score }) {
  return `You are an expert resume coach and ATS specialist.
Analyze the resume against the job description and reply with ONLY valid JSON (no markdown, no backticks) in this exact shape:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["3 short strengths"],
  "improvements": ["4 specific, actionable improvements"],
  "rewrittenBullets": ["3 improved resume bullet points with action verbs and metrics, based on the candidate's real experience"],
  "skillGapAdvice": ["3 short pieces of advice on closing skill gaps"]
}
Rules: never invent experience, employers, or numbers the candidate did not provide. If a metric is missing, suggest where the candidate should add a real one instead of making one up.

ATS score: ${score}/100
Missing keywords: ${(missingKeywords || []).slice(0, 15).join(", ")}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 5000)}`;
}

async function getAIFeedback(input) {
  if (!process.env.GEMINI_API_KEY) return buildFallback(input, "GEMINI_API_KEY is not set on the server");
  const { result, model, errors } = await runWithFallback(buildPrompt(input));
  if (!result) return buildFallback(input, (errors || []).join(" | ").slice(0, 400) || "No model responded");
  return {
    source: "gemini",
    model,
    summary: result.summary || "",
    strengths: result.strengths || [],
    improvements: result.improvements || [],
    rewrittenBullets: result.rewrittenBullets || [],
    skillGapAdvice: result.skillGapAdvice || [],
  };
}

// For the /api/health/ai page: a tiny real call, cached for a minute so it cannot drain the quota.
let healthCache = { at: 0, value: null };
async function checkAI() {
  if (!process.env.GEMINI_API_KEY) return { ok: false, error: "GEMINI_API_KEY is not set on the server" };
  if (healthCache.value && Date.now() - healthCache.at < 60000) return { ...healthCache.value, cached: true };
  const { result, model, errors } = await runWithFallback('Reply with exactly this JSON and nothing else: {"ok": true}');
  const value = result ? { ok: true, model } : { ok: false, error: (errors || []).join(" | ").slice(0, 600) };
  healthCache = { at: Date.now(), value };
  return value;
}

function _resetForTests() { workingModel = null; healthCache = { at: 0, value: null }; }

module.exports = { getAIFeedback, checkAI, _resetForTests };
