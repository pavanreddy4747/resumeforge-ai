const STOP_WORDS = new Set([
  "the","and","for","with","that","this","from","are","was","were","will","have","has","had",
  "you","your","our","their","they","them","his","her","its","not","but","can","able","all",
  "any","out","who","what","when","where","how","why","use","using","used","work","working",
  "team","role","job","candidate","looking","responsible","required","preferred","ability",
  "strong","good","great","excellent","knowledge","understanding","experience","years","year",
  "plus","bonus","ideal","nice","familiarity","proficiency","including","such","also","must","should","would","could","more","than","other","into","over",
  "about","across","within","etc","per","new","help","make","need","needs","well","include",
]);

// Multi-word skills we specifically look for
const KNOWN_PHRASES = [
  "machine learning","deep learning","data structures","object oriented","rest api","restful api",
  "problem solving","version control","unit testing","full stack","front end","back end",
  "ci/cd","node.js","react.js","next.js","express.js","vue.js","data analysis","cloud computing",
  "natural language processing","agile methodology","software development","web development",
  "responsive design","database design","system design","api development","data visualization",
];

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function extractKeywords(text) {
  const clean = normalize(text);
  const found = new Set();

  KNOWN_PHRASES.forEach((p) => {
    if (clean.includes(p)) found.add(p);
  });

  // Words that are already covered by a matched multi-word phrase (e.g. "rest" and "api" inside
  // "rest api") are skipped, otherwise one concept would be counted two or three times.
  const coveredWords = new Set();
  found.forEach((phrase) => phrase.split(/[\s]+/).forEach((w) => coveredWords.add(w)));

  const freq = {};
  clean.split(" ").forEach((w) => {
    const word = w.replace(/^[.\-/]+|[.\-/]+$/g, "");
    if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word) || coveredWords.has(word)) return;
    freq[word] = (freq[word] || 0) + 1;
  });

  Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .forEach(([word]) => found.add(word));

  return [...found];
}

function checkSections(text) {
  const t = text.toLowerCase();
  return {
    hasSummary: /(summary|objective|profile|about me)/.test(t),
    hasSkills: /(skills|technical skills|technologies|tech stack)/.test(t),
    hasExperience: /(experience|internship|employment|work history)/.test(t),
    hasEducation: /(education|academic|university|college|b\.?tech|bachelor|degree)/.test(t),
    hasProjects: /(projects|project work|personal projects)/.test(t),
    hasContact: /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/.test(t),
  };
}

function formatScore(text) {
  let score = 100;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 150) score -= 35;
  else if (words < 250) score -= 15;
  if (words > 1200) score -= 15;
  if (!/\d/.test(text)) score -= 20; // no numbers/metrics at all
  const metricCount = (text.match(/\d+%|\d+\+|\$\d+|\d+x/g) || []).length;
  if (metricCount === 0) score -= 15;
  if (!/(linkedin|github)/i.test(text)) score -= 10;
  return Math.max(score, 0);
}

// ---------- Explainability: locate which resume lines contain each matched keyword ----------
function splitIntoLines(resumeText) {
  return resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function locateKeywordEvidence(resumeText, matchedKeywords) {
  const lines = splitIntoLines(resumeText);
  // Array (not an object keyed by keyword): keywords like "node.js" or "ci/cd" are unsafe as MongoDB field names.
  return matchedKeywords.map((keyword) => {
    const hits = [];
    lines.forEach((line, idx) => {
      if (normalize(line).includes(keyword)) {
        hits.push({ lineNumber: idx + 1, snippet: line.length > 140 ? line.slice(0, 140) + "\u2026" : line });
      }
    });
    return { keyword, hits: hits.slice(0, 3) };
  });
}

// ---------- Overfitting / keyword-stuffing detector ----------
// Flags resumes that cram keywords unnaturally rather than using them in real sentences.
function detectStuffing(resumeText, matchedKeywords) {
  const lines = splitIntoLines(resumeText);
  const flags = [];

  matchedKeywords.forEach((keyword) => {
    let occurrences = 0;
    let inListLikeLine = 0;
    lines.forEach((line) => {
      const norm = normalize(line);
      const count = norm.split(keyword).length - 1;
      if (count > 0) {
        occurrences += count;
        // A "list-like" line: mostly commas/pipes/bullets and short, i.e. a keyword dump rather than a sentence
        const wordCount = line.split(/\s+/).filter(Boolean).length;
        const commaCount = (line.match(/[,|\u2022]/g) || []).length;
        if (wordCount > 0 && commaCount / wordCount > 0.3 && wordCount < 25) {
          inListLikeLine++;
        }
      }
    });
    // Flag when a keyword appears many times AND mostly inside comma-dense, short lines
    if (occurrences >= 4 && inListLikeLine >= Math.ceil(occurrences * 0.6)) {
      flags.push({
        keyword,
        occurrences,
        reason: `"${keyword}" appears ${occurrences} times, mostly packed into short, comma-heavy lines rather than used in real sentences. This can look like keyword stuffing to a human reviewer even if it raises the ATS keyword score.`,
      });
    }
  });

  const words = resumeText.split(/\s+/).filter(Boolean);
  const totalKeywordHits = matchedKeywords.reduce((sum, k) => {
    return sum + (normalize(resumeText).split(k).length - 1);
  }, 0);
  const density = words.length ? totalKeywordHits / words.length : 0;

  return {
    flags: flags.slice(0, 8),
    keywordDensity: Math.round(density * 1000) / 10, // percentage, 1 decimal
    densityWarning: density > 0.12, // more than ~12% of all words are matched keywords -> likely stuffed
  };
}

// ---------- Score sensitivity ----------
// Honest range instead of a falsely-precise number. We re-score after dropping the first or the last
// extracted job-description keyword (the ones most affected by trivial rewording of the JD), using the
// SAME weighting as the headline score. This measures sensitivity to JD wording; it is not a re-run of an AI.
function computeConfidenceRange(resumeText, jobDescription, parts) {
  const { baseScore, sectionScore, fmt } = parts;
  const jdKeywords = extractKeywords(jobDescription);
  if (jdKeywords.length < 4) {
    return { low: baseScore, high: baseScore, note: "The job description is short, so there is limited signal to measure how stable this score is." };
  }
  const resumeNorm = normalize(resumeText);
  const variants = [jdKeywords.slice(0, -1), jdKeywords.slice(1)];
  const variantScores = variants.map((variant) => {
    const hit = variant.filter((k) => resumeNorm.includes(k)).length;
    const kw = Math.round((hit / variant.length) * 100);
    return Math.round(kw * 0.6 + sectionScore * 0.2 + fmt * 0.2);
  });
  const all = [baseScore, ...variantScores];
  const low = Math.min(...all);
  const high = Math.max(...all);
  return {
    low,
    high,
    note:
      high - low > 6
        ? "Your score moves noticeably with small changes in how the job description is worded. Treat it as a range, not an exact number."
        : "Your score stays steady when the job description wording changes slightly.",
  };
}

function analyze(resumeText, jobDescription) {
  const jdKeywords = extractKeywords(jobDescription);
  const resumeNorm = normalize(resumeText);

  const matched = [];
  const missing = [];
  jdKeywords.forEach((k) => {
    if (resumeNorm.includes(k)) matched.push(k);
    else missing.push(k);
  });

  const keywordScore = jdKeywords.length
    ? Math.round((matched.length / jdKeywords.length) * 100)
    : 0;

  const sections = checkSections(resumeText);
  const sectionValues = Object.values(sections);
  const sectionScore = Math.round(
    (sectionValues.filter(Boolean).length / sectionValues.length) * 100
  );

  const fmt = formatScore(resumeText);

  // Weighted final score
  const score = Math.round(keywordScore * 0.6 + sectionScore * 0.2 + fmt * 0.2);

  const matchedSlice = matched.slice(0, 30);
  const evidence = locateKeywordEvidence(resumeText, matchedSlice);
  const stuffing = detectStuffing(resumeText, matchedSlice);
  const confidence = computeConfidenceRange(resumeText, jobDescription, { baseScore: score, sectionScore, fmt });

  return {
    score,
    breakdown: { keywordScore, sectionScore, formatScore: fmt },
    matchedKeywords: matchedSlice,
    missingKeywords: missing.slice(0, 25),
    sections,
    evidence,       // [{ keyword, hits: [{ lineNumber, snippet }] }] — powers the 'where we found it' view
    stuffing,        // { flags, keywordDensity, densityWarning } — the overfitting detector
    confidence,       // { low, high, note } — honest range instead of a fake-precise number
  };
}

module.exports = { analyze };
