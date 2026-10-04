async function getAIFeedback({ resumeText, jobDescription, missingKeywords, score }) {
  const fallback = {
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

  if (!process.env.GEMINI_API_KEY) return fallback;

  const prompt = `You are an expert resume coach and ATS specialist.
Analyze the resume against the job description and reply with ONLY valid JSON (no markdown, no backticks) in this exact shape:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["3 short strengths"],
  "improvements": ["4 specific, actionable improvements"],
  "rewrittenBullets": ["3 improved resume bullet points with action verbs and metrics, based on the candidate's real experience"],
  "skillGapAdvice": ["3 short pieces of advice on closing skill gaps"]
}
Do not invent experience the candidate does not have.

ATS score: ${score}/100
Missing keywords: ${missingKeywords.slice(0, 15).join(", ")}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 5000)}`;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) throw new Error(`Gemini status ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      summary: parsed.summary || fallback.summary,
      strengths: parsed.strengths || fallback.strengths,
      improvements: parsed.improvements || fallback.improvements,
      rewrittenBullets: parsed.rewrittenBullets || [],
      skillGapAdvice: parsed.skillGapAdvice || fallback.skillGapAdvice,
    };
  } catch (err) {
    console.error("AI feedback failed, using fallback:", err.message);
    return fallback;
  }
}

module.exports = { getAIFeedback };
