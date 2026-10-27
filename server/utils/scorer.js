const STOP_WORDS = new Set([
  "please","know","requirements","requirement","interest","interested","apply","company","join","seeking","hiring","candidates",
  "position","opportunity","responsibilities","responsibility","qualifications","qualification","skills","abilities","environment",
  "related","relevant","ensure","support","provide","month","months","every","growth","looking","write","plan","manage","report",
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

// =====================================================================================================
// Scoring engine v3
//  - reads the job description with a skill dictionary (spelling variants = one skill; filler words ignored)
//  - separates REQUIRED skills from "nice to have" ones
//  - checks whether each skill is PROVEN in a project/experience line or only LISTED in a skills line
//  - checks bullet quality, and tells you how many points each missing skill is worth
// =====================================================================================================
const { SKILL_MATCHERS, normalizeForMatch, keywordMatcher, countMatches } = require("./skills");
const { segmentResume, checkBullets, isListLike, wordCount } = require("./resumeParse");

const CREDIT = { proven: 1, mentioned: 0.8, listed: 0.6 }; // how much a skill counts, by how it is shown
const RANK = { listed: 1, mentioned: 2, proven: 3 };
const LEVEL_WEIGHT = { required: 3, optional: 1 };
const SKILL_SHARE = 0.6; // the skills part is 60% of the final score
const round1 = (n) => Math.round(n * 10) / 10;

/* ---------- 1. read the job description ---------- */

const OPTIONAL_HEADER = /(nice to have|good to have|preferred|bonus|desirable|plus points?|added advantage)/;
const REQUIRED_HEADER = /(requirements?|qualifications?|must[- ]have|what you.ll need|responsibilities|what you will do|about the role|about you|skills)/;
const OPTIONAL_CUE = /(is a plus|are a plus|a plus\b|nice to have|good to have|bonus|preferred|desirable|an advantage|added advantage|familiarity with|exposure to)/;
const REQUIRED_CUE = /(must|required|mandatory|essential|strong|proficien|expert|hands[- ]on|minimum|at least \d)/;

function skillsInText(normalizedText) {
  return SKILL_MATCHERS.map((m) => ({ m, c: countMatches(normalizedText, m) })).filter((x) => x.c > 0);
}

function readJobDescription(jobDescription) {
  const found = new Map();
  let mode = "required";
  const lines = jobDescription.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lineSkills = skillsInText(normalizeForMatch(line));
    const lower = line.toLowerCase();
    // A short line with no skills in it is a heading such as "Nice to have:" - it sets the mode for the lines after it.
    if (lineSkills.length === 0 && wordCount(line) <= 8) {
      if (OPTIONAL_HEADER.test(lower)) { mode = "optional"; continue; }
      if (REQUIRED_HEADER.test(lower)) { mode = "required"; continue; }
    }
    for (const sentence of line.split(/(?<=[.!?;])\s+/)) {
      const sl = sentence.toLowerCase();
      const level = REQUIRED_CUE.test(sl) ? "required" : OPTIONAL_CUE.test(sl) ? "optional" : mode;
      for (const { m, c } of skillsInText(normalizeForMatch(sentence))) {
        const prev = found.get(m.name);
        if (!prev) found.set(m.name, { matcher: m, level, mentions: c });
        else {
          prev.mentions += c;
          if (level === "required") prev.level = "required"; // required beats nice-to-have
        }
      }
    }
  }
  return [...found.values()].map((f) => ({
    name: f.matcher.name,
    category: f.matcher.category,
    matcher: f.matcher,
    level: f.level,
    weight: LEVEL_WEIGHT[f.level] * f.matcher.weight,
  }));
}

// Job descriptions with almost no known skills (e.g. non-technical roles) fall back to plain keyword matching.
function genericItems(jobDescription) {
  return extractKeywords(jobDescription).slice(0, 25).map((k) => {
    const matcher = keywordMatcher(k);
    return { name: k, category: "keyword", matcher, level: "required", weight: 3 };
  });
}

/* ---------- 2. scan the resume ---------- */

function lineKind(line) {
  const words = wordCount(line.text);
  if (line.section === "skills" || isListLike(line.text)) return "listed";
  if ((line.section === "experience" || line.section === "projects") && words >= 5) return "proven";
  if (words >= 7) return "mentioned";
  return "listed";
}

function scanResume(segmented, items) {
  const recs = new Map();
  for (const line of segmented) {
    if (line.isHeading) continue;
    const norm = normalizeForMatch(line.text);
    const kind = lineKind(line);
    for (const it of items) {
      const c = countMatches(norm, it.matcher);
      if (!c) continue;
      const rec = recs.get(it.name) || { occurrences: 0, listOccurrences: 0, best: null, hits: [] };
      rec.occurrences += c;
      if (kind === "listed") rec.listOccurrences += c;
      if (!rec.best || RANK[kind] > RANK[rec.best]) rec.best = kind;
      rec.hits.push({ lineNumber: line.lineNumber, kind, snippet: line.text.length > 140 ? line.text.slice(0, 140) + "\u2026" : line.text });
      recs.set(it.name, rec);
    }
  }
  return recs;
}

/* ---------- 3. score ---------- */

function skillScoreFor(items, recs, { credit = CREDIT, weightOf = (it) => it.weight } = {}) {
  let total = 0, earned = 0;
  for (const it of items) {
    const w = weightOf(it);
    total += w;
    const r = recs.get(it.name);
    if (r && r.best) earned += w * credit[r.best];
  }
  return total ? Math.round((earned / total) * 100) : 0;
}

const combine = (skill, section, fmt) => Math.round(skill * SKILL_SHARE + section * 0.2 + fmt * 0.2);

// An honest range: how much the score moves if we weigh nice-to-have skills differently,
// or give less / more credit to skills that are only listed. This measures sensitivity; it is not a re-run of anything.
function sensitivityRange(items, recs, section, fmt, base) {
  const scenarios = [
    skillScoreFor(items, recs, { weightOf: (it) => (it.level === "optional" ? 0 : it.weight) }),
    skillScoreFor(items, recs, { weightOf: (it) => (it.level === "optional" ? it.weight * 3 : it.weight) }),
    skillScoreFor(items, recs, { credit: { proven: 1, mentioned: 0.7, listed: 0.4 } }),
    skillScoreFor(items, recs, { credit: { proven: 1, mentioned: 0.9, listed: 0.8 } }),
  ].map((s) => combine(s, section, fmt));
  const all = [base, ...scenarios];
  const low = Math.min(...all), high = Math.max(...all);
  return {
    low, high,
    note: high - low > 6
      ? "Your score moves noticeably depending on how nice-to-have skills are weighed and how much credit skills that are only listed get. Treat it as a range."
      : "Your score stays steady even if nice-to-have skills or listed-only skills are weighed differently.",
  };
}

function detectStuffing(items, recs, resumeText) {
  const flags = [];
  let totalHits = 0;
  for (const it of items) {
    const r = recs.get(it.name);
    if (!r) continue;
    totalHits += r.occurrences;
    if (r.occurrences >= 4 && r.listOccurrences >= Math.ceil(r.occurrences * 0.6)) {
      flags.push({
        keyword: it.name,
        occurrences: r.occurrences,
        reason: `"${it.name}" appears ${r.occurrences} times, mostly inside short comma-separated lists rather than real sentences. A human reviewer may read this as keyword stuffing even though it raises the keyword score.`,
      });
    }
  }
  const words = resumeText.split(/\s+/).filter(Boolean).length;
  const density = words ? totalHits / words : 0;
  return { flags: flags.slice(0, 8), keywordDensity: Math.round(density * 1000) / 10, densityWarning: density > 0.12 };
}

function analyze(resumeText, jobDescription) {
  const segmented = segmentResume(resumeText);

  let items = readJobDescription(jobDescription);
  let mode = "skills";
  let note = null;
  if (items.length < 2) {
    items = genericItems(jobDescription);
    mode = "generic";
    note = "This job description has very few recognised technical skills, so general keyword matching was used instead of the skill dictionary.";
  }

  if (mode === "skills" && items.length < 5) {
    note = `Only ${items.length} recognised skills were found in this job description, so the skill score rests on very few skills. Paste the full job description for a more reliable score.`;
  }

  const recs = scanResume(segmented, items);
  const totalWeight = items.reduce((s, it) => s + it.weight, 0) || 1;

  const skillScore = skillScoreFor(items, recs);
  const sections = checkSections(resumeText);
  const sectionValues = Object.values(sections);
  const sectionScore = Math.round((sectionValues.filter(Boolean).length / sectionValues.length) * 100);

  const bullets = checkBullets(segmented);
  const fmtBase = formatScore(resumeText);
  const fmt = bullets.checked >= 3 && bullets.bulletScore !== null ? Math.round(fmtBase * 0.7 + bullets.bulletScore * 0.3) : fmtBase;

  const score = combine(skillScore, sectionScore, fmt);

  const matched = [], missing = [], unproven = [];
  for (const it of items) {
    const r = recs.get(it.name);
    const pointsFor = (credit) => round1((it.weight / totalWeight) * 100 * SKILL_SHARE * credit);
    if (r && r.best) {
      matched.push({ skill: it.name, category: it.category, required: it.level === "required", status: r.best, hits: r.occurrences });
      if (r.best !== "proven") unproven.push({ skill: it.name, category: it.category, required: it.level === "required", pointsIfShown: pointsFor(1 - CREDIT[r.best]) });
    } else {
      missing.push({
        skill: it.name, category: it.category, required: it.level === "required",
        pointsIfListed: pointsFor(CREDIT.listed), pointsIfProven: pointsFor(1),
      });
    }
  }
  const byImportance = (a, b) => Number(b.required) - Number(a.required) || (b.pointsIfProven ?? b.pointsIfShown) - (a.pointsIfProven ?? a.pointsIfShown);
  missing.sort(byImportance);
  unproven.sort((a, b) => Number(b.required) - Number(a.required) || b.pointsIfShown - a.pointsIfShown);
  matched.sort((a, b) => Number(b.required) - Number(a.required) || RANK[b.status] - RANK[a.status]);

  const evidence = matched.map((m) => ({
    keyword: m.skill,
    hits: recs.get(m.skill).hits.slice(0, 3).map((h) => ({ lineNumber: h.lineNumber, snippet: h.snippet })),
  }));

  return {
    score,
    breakdown: { keywordScore: skillScore, sectionScore, formatScore: fmt, bulletScore: bullets.bulletScore },
    matchedKeywords: matched.map((m) => m.skill).slice(0, 40),
    missingKeywords: missing.map((m) => m.skill).slice(0, 40),
    sections,
    evidence,
    stuffing: detectStuffing(items, recs, resumeText),
    confidence: sensitivityRange(items, recs, sectionScore, fmt, score),
    skills: { mode, note, matched, missing, unproven },
    bullets,
  };
}

module.exports = { analyze };
