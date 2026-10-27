// Understands the STRUCTURE of a resume: which line sits in which section, and whether bullets are well written.
// This is what lets the scorer tell "listed in a skills line" apart from "proven in a project bullet".

const SECTION_ALIASES = {
  summary: ["summary", "professional summary", "career summary", "objective", "career objective", "profile", "about me", "about"],
  skills: ["skills", "technical skills", "key skills", "core competencies", "technologies", "tech stack", "skill set", "technical proficiency"],
  experience: ["experience", "work experience", "professional experience", "internship", "internships", "internship experience", "employment", "work history", "employment history"],
  projects: ["projects", "academic projects", "personal projects", "project work", "key projects", "project experience"],
  education: ["education", "academic background", "academics", "qualifications", "educational qualifications"],
  other: ["certifications", "certification", "achievements", "awards", "interests", "hobbies", "declaration", "languages", "publications", "extracurricular", "extracurricular activities", "references", "courses", "training"],
};

const HEADING_TO_SECTION = {};
Object.entries(SECTION_ALIASES).forEach(([section, names]) => names.forEach((n) => { HEADING_TO_SECTION[n] = section; }));

// "Skills: React, Node.js" - a heading and its content on the same line
const INLINE_HEADING = /^(technical skills|key skills|skills|core competencies|technologies|tech stack|skill set)\s*[:\-\u2013]\s*(.+)$/i;

function normHeading(line) {
  return line.toLowerCase().replace(/[^a-z& ]/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// A "list-like" line is a keyword dump (React, Node.js, MongoDB | Git) rather than a real sentence.
function isListLike(text) {
  const words = wordCount(text);
  if (!words) return false;
  const seps = (text.match(/[,|\u2022\u25AA\u25CF;]/g) || []).length;
  return (words < 30 && seps / words > 0.25) || (text.match(/[|\u2022]/g) || []).length >= 2;
}

// Split resume text into lines and label each with its section.
function segmentResume(resumeText) {
  const raw = (resumeText || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let section = "header";
  return raw.map((text, i) => {
    const inline = text.match(INLINE_HEADING);
    if (inline) {
      section = "skills";
      return { index: i, lineNumber: i + 1, text, section, isHeading: false };
    }
    const h = normHeading(text);
    if (h && wordCount(h) <= 4 && HEADING_TO_SECTION[h]) {
      section = HEADING_TO_SECTION[h];
      return { index: i, lineNumber: i + 1, text, section, isHeading: true };
    }
    return { index: i, lineNumber: i + 1, text, section, isHeading: false };
  });
}

/* ---------------- bullet quality ---------------- */

const BULLET_MARK = /^\s*[\u2022\u25AA\u25CF\u25E6\u00B7\u25BA\u27A2\u2713*\-\u2013\u2014]\s*/;

const BASE_VERBS = new Set(("build develop design implement create lead manage optimize reduce increase improve deploy automate integrate " +
  "analyze deliver launch migrate refactor architect engineer collaborate coordinate mentor test debug configure maintain research present " +
  "streamline secure write resolve establish drive spearhead own ship scale monitor document train organize plan perform conduct " +
  "built led wrote ran drove made taught began grew won set put sold chose spent led").split(" "));
const NOT_VERBS = new Set(["need", "speed", "feed", "seed", "hundred", "red", "weed", "bleed", "breed", "proceed", "indeed", "embed", "shed", "bed"]);
const WEAK_OPENERS = [/^responsible for\b/i, /^worked (on|with)\b/i, /^helped\b/i, /^assisted\b/i, /^involved in\b/i, /^duties (included|include)\b/i, /^tasked with\b/i, /^handled\b/i, /^was\b/i, /^did\b/i];

function startsWithActionVerb(bullet) {
  const first = bullet.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  if (!first || NOT_VERBS.has(first)) return false;
  return BASE_VERBS.has(first) || (first.length > 3 && first.endsWith("ed"));
}

// Pull the bullet points out of the Experience and Projects sections, re-joining lines that wrapped.
function extractBullets(segmented) {
  const scope = segmented.filter((l) => !l.isHeading && (l.section === "experience" || l.section === "projects"));
  const hasMarkers = scope.some((l) => BULLET_MARK.test(l.text));
  const bullets = [];
  let cur = null;
  let prev = null;
  for (const l of scope) {
    const marked = BULLET_MARK.test(l.text);
    const body = l.text.replace(BULLET_MARK, "").trim();
    // a new section always ends the current bullet (e.g. Experience -> Projects)
    if (prev && prev.section !== l.section && cur) { bullets.push(cur); cur = null; }
    // a wrapped line continues the bullet if it starts in lower case, or the line above ran to full width
    const looksLikeTitle = /\b(19|20)\d{2}\b| - | \| /.test(body);
    const continues = cur && !marked && (/^[a-z(]/.test(body) || (prev && prev.text.length >= 75 && !looksLikeTitle && !/[.!?]$/.test(cur)));
    if (marked) {
      if (cur) bullets.push(cur);
      cur = body;
    } else if (continues) {
      cur += " " + body;
    } else if (!hasMarkers && wordCount(body) >= 5 && !isListLike(body) && !looksLikeTitle) {
      if (cur) bullets.push(cur);
      cur = body;
    } else if (cur) {
      bullets.push(cur);
      cur = null; // a title or date line ends the bullet
    }
    prev = l;
  }
  if (cur) bullets.push(cur);
  return bullets.filter((b) => wordCount(b) >= 3);
}

function analyzeBullet(bullet) {
  const issues = [];
  const words = wordCount(bullet);
  let score = 100;
  if (WEAK_OPENERS.some((r) => r.test(bullet))) {
    issues.push("Weak opening. Start with a strong action verb such as Built, Designed or Reduced.");
    score -= 40;
  } else if (!startsWithActionVerb(bullet)) {
    issues.push("Does not start with an action verb.");
    score -= 40;
  }
  if (!/\d/.test(bullet)) {
    issues.push("No number or result. If you have a real one, add it (users, percent, time saved).");
    score -= 40;
  }
  if (words > 35) { issues.push("Too long. Trim it to one clear achievement."); score -= 20; }
  if (words < 6) { issues.push("Very short. Say what you did and what came of it."); score -= 20; }
  return { text: bullet, issues, score: Math.max(score, 0) };
}

function checkBullets(segmented) {
  const bullets = extractBullets(segmented);
  const analyzed = bullets.map(analyzeBullet);
  const flagged = analyzed.filter((b) => b.issues.length).sort((a, b) => a.score - b.score);
  const avg = analyzed.length ? Math.round(analyzed.reduce((s, b) => s + b.score, 0) / analyzed.length) : null;
  return {
    checked: analyzed.length,
    strong: analyzed.length - flagged.length,
    bulletScore: avg,
    flagged: flagged.slice(0, 8).map((b) => ({ text: b.text.length > 220 ? b.text.slice(0, 220) + "\u2026" : b.text, issues: b.issues })),
  };
}

module.exports = { segmentResume, checkBullets, isListLike, wordCount };
