// AI feedback via Google Gemini, with:
//  - a list of models tried in order (model names change often, so one hard-coded name is fragile)
//  - the REAL error logged so failures are diagnosable
//  - an honest `source` flag ("gemini" | "fallback") so the UI never presents fallback text as AI output

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];

function modelCandidates() {
  const fromEnv = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...DEFAULT_MODELS])];
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
    skillGapAdvice: missingKeywords.slice(0, 5).map((k) => `Consider learning or highlighting: ${k}`),
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
Missing keywords: ${missingKeywords.slice(0, 15).join(", ")}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 5000)}`;
}

async function callModel(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
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
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function getAIFeedback(input) {
  if (!process.env.GEMINI_API_KEY) return buildFallback(input, "GEMINI_API_KEY is not set on the server");

  const prompt = buildPrompt(input);
  const errors = [];

  for (const model of modelCandidates()) {
    try {
      const parsed = await callModel(model, prompt);
      return {
        source: "gemini",
        model,
        summary: parsed.summary || "",
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        rewrittenBullets: parsed.rewrittenBullets || [],
        skillGapAdvice: parsed.skillGapAdvice || [],
      };
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
      console.error(`[AI] ${model} failed -> ${err.message}`);
      // Bad key / quota: no point trying other models
      if (err.status === 401 || err.status === 403 || err.status === 429) break;
    }
  }

  return buildFallback(input, errors.join(" | ").slice(0, 400));
}

module.exports = { getAIFeedback };
