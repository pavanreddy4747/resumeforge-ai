const STOP_WORDS = new Set([
  "the","and","for","with","that","this","from","are","was","were","will","have","has","had",
  "you","your","our","their","they","them","his","her","its","not","but","can","able","all",
  "any","out","who","what","when","where","how","why","use","using","used","work","working",
  "team","role","job","candidate","looking","responsible","required","preferred","ability",
  "strong","good","great","excellent","knowledge","understanding","experience","years","year",
  "including","such","also","must","should","would","could","more","than","other","into","over",
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

  const freq = {};
  clean.split(" ").forEach((w) => {
    const word = w.replace(/^[.\-/]+|[.\-/]+$/g, "");
    if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word)) return;
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

  return {
    score,
    breakdown: { keywordScore, sectionScore, formatScore: fmt },
    matchedKeywords: matched.slice(0, 30),
    missingKeywords: missing.slice(0, 25),
    sections,
  };
}

module.exports = { analyze };
