// Skill dictionary. Each skill has ONE canonical name plus spelling variants, so "Node.js", "NodeJS"
// and "node js" are the same skill, and generic words ("build", "web", "hiring") are never treated as skills.
// Format: [canonicalName, category, [aliases...]]

const RAW_SKILLS = [
  // languages
  ["javascript", "language", ["javascript", "java script", "ecmascript", "es6"]],
  ["typescript", "language", ["typescript"]],
  ["python", "language", ["python", "python3"]],
  ["java", "language", ["java"]],
  ["c++", "language", ["c++", "cpp"]],
  ["c#", "language", ["c#", "csharp"]],
  ["go", "language", ["golang", "go lang"]],
  ["rust", "language", ["rust"]],
  ["php", "language", ["php"]],
  ["ruby", "language", ["ruby"]],
  ["kotlin", "language", ["kotlin"]],
  ["swift", "language", ["swift"]],
  ["dart", "language", ["dart"]],
  ["sql", "language", ["sql"]],
  ["html", "language", ["html", "html5"]],
  ["css", "language", ["css", "css3"]],
  ["bash", "language", ["bash", "shell scripting", "shell script"]],
  // frontend
  ["react", "frontend", ["react", "react.js", "reactjs"]],
  ["react native", "frontend", ["react native"]],
  ["next.js", "frontend", ["next.js", "nextjs"]],
  ["vue", "frontend", ["vue", "vue.js", "vuejs"]],
  ["angular", "frontend", ["angular", "angularjs"]],
  ["redux", "frontend", ["redux"]],
  ["tailwind css", "frontend", ["tailwind", "tailwind css", "tailwindcss"]],
  ["bootstrap", "frontend", ["bootstrap"]],
  ["sass", "frontend", ["sass", "scss"]],
  ["jquery", "frontend", ["jquery"]],
  ["vite", "frontend", ["vite"]],
  ["webpack", "frontend", ["webpack"]],
  ["responsive design", "frontend", ["responsive design", "responsive web design", "responsive layouts", "responsive ui"]],
  // backend
  ["node.js", "backend", ["node.js", "nodejs", "node js"]],
  ["express", "backend", ["express", "express.js", "expressjs"]],
  ["django", "backend", ["django"]],
  ["flask", "backend", ["flask"]],
  ["fastapi", "backend", ["fastapi"]],
  ["spring boot", "backend", ["spring boot", "springboot", "spring framework"]],
  [".net", "backend", [".net", "dotnet", "asp.net"]],
  ["laravel", "backend", ["laravel"]],
  ["graphql", "backend", ["graphql"]],
  ["rest api", "backend", ["rest api", "rest apis", "restful", "restful api", "restful apis", "restful services", "rest services"]],
  ["microservices", "backend", ["microservices", "microservice"]],
  ["websockets", "backend", ["websocket", "websockets", "socket.io"]],
  ["jwt", "backend", ["jwt", "json web token", "json web tokens"]],
  // databases
  ["mongodb", "database", ["mongodb", "mongo db", "mongo"]],
  ["mongoose", "database", ["mongoose"]],
  ["mysql", "database", ["mysql"]],
  ["postgresql", "database", ["postgresql", "postgres", "psql"]],
  ["sqlite", "database", ["sqlite"]],
  ["redis", "database", ["redis"]],
  ["firebase", "database", ["firebase", "firestore"]],
  ["dynamodb", "database", ["dynamodb"]],
  ["elasticsearch", "database", ["elasticsearch"]],
  ["nosql", "database", ["nosql"]],
  // cloud / devops
  ["aws", "cloud", ["aws", "amazon web services"]],
  ["azure", "cloud", ["azure"]],
  ["gcp", "cloud", ["gcp", "google cloud"]],
  ["docker", "cloud", ["docker", "dockerfile"]],
  ["kubernetes", "cloud", ["kubernetes", "k8s"]],
  ["ci/cd", "cloud", ["ci/cd", "ci cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment"]],
  ["github actions", "cloud", ["github actions"]],
  ["jenkins", "cloud", ["jenkins"]],
  ["terraform", "cloud", ["terraform"]],
  ["linux", "cloud", ["linux", "ubuntu"]],
  ["nginx", "cloud", ["nginx"]],
  ["heroku", "cloud", ["heroku"]],
  ["netlify", "cloud", ["netlify"]],
  ["cloud computing", "cloud", ["cloud computing", "cloud deployment", "cloud platforms", "cloud services"]],
  // tools
  ["git", "tool", ["git"]],
  ["github", "tool", ["github"]],
  ["gitlab", "tool", ["gitlab"]],
  ["jira", "tool", ["jira"]],
  ["postman", "tool", ["postman"]],
  ["figma", "tool", ["figma"]],
  ["vs code", "tool", ["vs code", "vscode", "visual studio code"]],
  ["npm", "tool", ["npm"]],
  ["jest", "tool", ["jest"]],
  ["testing", "tool", ["unit testing", "unit tests", "integration testing", "test driven development", "tdd", "automated testing"]],
  ["swagger", "tool", ["swagger", "openapi"]],
  // data / ml
  ["machine learning", "data", ["machine learning"]],
  ["deep learning", "data", ["deep learning"]],
  ["nlp", "data", ["nlp", "natural language processing"]],
  ["computer vision", "data", ["computer vision"]],
  ["tensorflow", "data", ["tensorflow"]],
  ["pytorch", "data", ["pytorch"]],
  ["scikit-learn", "data", ["scikit learn", "sklearn"]],
  ["pandas", "data", ["pandas"]],
  ["numpy", "data", ["numpy"]],
  ["matplotlib", "data", ["matplotlib"]],
  ["power bi", "data", ["power bi", "powerbi"]],
  ["tableau", "data", ["tableau"]],
  ["excel", "data", ["excel", "ms excel", "microsoft excel"]],
  ["data analysis", "data", ["data analysis", "data analytics"]],
  ["data visualization", "data", ["data visualization", "data visualisation"]],
  ["generative ai", "data", ["generative ai", "genai", "llm", "llms", "large language models", "prompt engineering"]],
  // concepts
  ["data structures", "concept", ["data structures", "data structure", "dsa"]],
  ["algorithms", "concept", ["algorithms", "algorithm"]],
  ["oop", "concept", ["oop", "oops", "object oriented", "object oriented programming"]],
  ["system design", "concept", ["system design", "software architecture"]],
  ["design patterns", "concept", ["design patterns"]],
  ["mvc", "concept", ["mvc"]],
  ["agile", "concept", ["agile", "agile methodology", "agile methodologies"]],
  ["scrum", "concept", ["scrum"]],
  ["version control", "concept", ["version control"]],
  ["api integration", "concept", ["api integration", "integrating apis", "third party apis", "third party api"]],
  ["authentication", "concept", ["authentication", "authorization", "oauth", "oauth2"]],
  ["full stack", "concept", ["full stack", "fullstack"]],
  ["database design", "concept", ["database design", "database management", "dbms", "schema design"]],
  ["web development", "concept", ["web development", "web applications", "web application", "web apps"]],
  ["debugging", "concept", ["debugging", "troubleshooting"]],
  ["code review", "concept", ["code review", "code reviews"]],
  // soft skills
  ["communication", "soft", ["communication", "communication skills"]],
  ["teamwork", "soft", ["teamwork", "team work", "team player", "collaboration", "collaborative"]],
  ["leadership", "soft", ["leadership", "team lead"]],
  ["problem solving", "soft", ["problem solving", "problem solver", "analytical skills", "analytical thinking"]],
  ["time management", "soft", ["time management"]],
  ["critical thinking", "soft", ["critical thinking"]],
  ["adaptability", "soft", ["adaptability", "fast learner", "quick learner"]],
];

// How much each kind of skill counts. Soft skills are rarely "proven" by a bullet, so they count for less.
const CATEGORY_WEIGHT = {
  language: 1, frontend: 1, backend: 1, database: 1, cloud: 1, tool: 1, data: 1, concept: 0.7, soft: 0.5, keyword: 1,
};

// Make "full-stack", "Full Stack" and "problem_solving" all look the same before matching.
function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2010-\u2015_-]/g, " ")
    .replace(/[ \t]+/g, " ");
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// One pattern per alias, with word boundaries that also work for "c++", "c#" and ".net".
function aliasPattern(alias) {
  const body = escapeRegex(normalizeForMatch(alias)).replace(/ /g, "\\s+");
  // The plain word "express" is also an ordinary English verb ("express interest"), so skip those uses.
  const guard = alias === "express" ? "(?!\\s+(?:interest|your|my|our|a|an|the|to|that|how|what|concern|gratitude|yourself)\\b)" : "";
  return `(?<![a-z0-9])${body}(?![a-z0-9])${guard}`;
}

function compileMatcher(name, category, aliases) {
  return {
    name,
    category,
    weight: CATEGORY_WEIGHT[category] ?? 1,
    regex: new RegExp(aliases.map(aliasPattern).join("|"), "g"),
  };
}

const SKILL_MATCHERS = RAW_SKILLS.map(([name, category, aliases]) => compileMatcher(name, category, aliases));

// Used for job descriptions that contain almost no known skills (e.g. non-technical roles).
function keywordMatcher(keyword) {
  return compileMatcher(keyword, "keyword", [keyword]);
}

// How many times does this skill appear? (text must already be passed through normalizeForMatch)
function countMatches(normalizedText, matcher) {
  matcher.regex.lastIndex = 0;
  const found = normalizedText.match(matcher.regex);
  return found ? found.length : 0;
}

module.exports = { SKILL_MATCHERS, CATEGORY_WEIGHT, normalizeForMatch, keywordMatcher, countMatches };
