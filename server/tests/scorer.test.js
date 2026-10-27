const test = require("node:test");
const assert = require("node:assert/strict");
const { analyze } = require("../utils/scorer");

const RESUME = `Yarramaku Pavan
pavan@mail.com | github.com/pavan | linkedin.com/in/pavan
Summary
Final year CSE student who enjoys full-stack development and problem-solving.
Skills
Languages: JavaScript, Python, SQL
Frameworks: React, NodeJS, Express
Databases: MongoDB, MySQL
Tools: Git, GitHub, Postman, VS Code
Experience
Full Stack Intern, Zyphotek Technology Solutions  Jun 2026 - Jul 2026
- Built a REST API using Node.js and Express with JWT authentication for 3 user roles
- Designed MongoDB schemas and connected them to a React frontend
- Responsible for testing the application
- Worked on the dashboard and fixed bugs
- Deployed the app on Render and Netlify
Projects
ResumeForge AI - resume analyzer
- Reduced manual resume checking time by 40% with an automated scoring engine
- Implemented PDF parsing and an AI feedback module using the Gemini API
Education
B.E. Computer Science and Engineering, Prathyusha Engineering College, 2027
${"Additional filler sentence about teamwork and learning new tools quickly. ".repeat(8)}`;

const JD = `Full Stack Developer Intern
We are hiring a Full Stack Developer Intern. You will build web applications using React, Node.js, Express and MongoDB.
Requirements:
Experience with REST API design, JWT authentication, Git and GitHub is required.
Strong problem solving skills and good communication.
Nice to have:
Docker, CI/CD and cloud deployment. Knowledge of AWS is a plus.`;

const r = analyze(RESUME, JD);
const find = (list, name) => list.find((x) => x.skill === name);

test("spelling variants count as the same skill (NodeJS = Node.js, full-stack = full stack, problem-solving = problem solving)", () => {
  assert.ok(find(r.skills.matched, "node.js"), "NodeJS / Node.js should match");
  assert.ok(find(r.skills.matched, "full stack"), "full-stack should match 'full stack'");
  assert.ok(find(r.skills.matched, "problem solving"), "problem-solving should match 'problem solving'");
});

test("ordinary words are never reported as skills", () => {
  const all = [...r.skills.matched, ...r.skills.missing].map((x) => x.skill);
  for (const junk of ["build", "web", "applications", "hiring", "intern", "developer", "design", "skills", "requirements", "using"]) {
    assert.ok(!all.includes(junk), `"${junk}" must not be treated as a skill`);
  }
});

test("required skills are told apart from nice-to-have skills", () => {
  for (const s of ["react", "rest api", "jwt", "git", "github"]) assert.equal(find([...r.skills.matched, ...r.skills.missing], s)?.required, true, s + " should be required");
  for (const s of ["docker", "ci/cd", "aws"]) assert.equal(find(r.skills.missing, s)?.required, false, s + " should be nice-to-have");
});

test("a skill shown in a project bullet is 'proven', one only in a skills line is 'listed'", () => {
  assert.equal(find(r.skills.matched, "node.js").status, "proven");
  assert.equal(find(r.skills.matched, "git").status, "listed");
  assert.ok(find(r.skills.unproven, "git"), "git should be offered as an upgrade");
});

test("the same skill scores higher when proven than when only listed", () => {
  const listedOnly = "Skills\nReact, Git\nExperience\nIntern at a company for one month\n" + "x ".repeat(200);
  const proven = "Skills\nReact\nExperience\n- Built the Git workflow for a team of 5 using GitHub pull requests\n" + "x ".repeat(200);
  const jd = "We need React and Git skills. Git is required.\nRequirements:\nGit is required.";
  assert.ok(analyze(proven, jd).breakdown.keywordScore >= analyze(listedOnly, jd).breakdown.keywordScore);
});

test("what-if points are positive, and proving a skill is worth more than listing it", () => {
  assert.ok(r.skills.missing.length > 0);
  for (const m of r.skills.missing) {
    assert.ok(m.pointsIfProven > 0);
    assert.ok(m.pointsIfProven >= m.pointsIfListed);
  }
});

test("adding a missing skill with a real bullet raises the score", () => {
  const better = RESUME.replace("- Deployed the app on Render and Netlify", "- Deployed the app with Docker containers and a CI/CD pipeline on AWS");
  assert.ok(analyze(better, JD).score > r.score);
});

test("the score range always contains the headline score", () => {
  assert.ok(r.confidence.low <= r.score && r.score <= r.confidence.high);
});

test("weak bullets are flagged, strong ones are not", () => {
  const flagged = r.bullets.flagged.map((b) => b.text);
  assert.ok(flagged.some((t) => t.startsWith("Responsible for")));
  assert.ok(flagged.some((t) => t.startsWith("Worked on")));
  assert.ok(!flagged.some((t) => t.startsWith("Reduced manual resume")), "a bullet with a verb and a number is strong");
  assert.equal(typeof r.breakdown.bulletScore, "number");
});

test("the word 'express' as a verb is not mistaken for the Express framework", () => {
  const out = analyze(RESUME, "Please express interest if you know React and Node.js.\nRequirements:\nReact and Node.js required.");
  const all = [...out.skills.matched, ...out.skills.missing].map((x) => x.skill);
  assert.ok(!all.includes("express"));
});

test("'express' still matches as a framework in normal sentences (the guard does not over-block)", () => {
  for (const sentence of ["We use Express and Node.js", "Experience with Node and Express is required", "Built with express, mongodb and react"]) {
    const out = analyze(RESUME, sentence + ".\nRequirements:\nReact required.");
    const all = [...out.skills.matched, ...out.skills.missing].map((x) => x.skill);
    assert.ok(all.includes("express"), `should find express in: ${sentence}`);
  }
});

test("a short job description with only 2 skills stays in skills mode and warns that the signal is thin", () => {
  const out = analyze(RESUME, "Please express interest if you know React and Node.js.");
  assert.equal(out.skills.mode, "skills");
  assert.match(out.skills.note, /Only 2 recognised skills/);
});

test("general keyword mode ignores boilerplate words like 'please', 'know', 'requirements'", () => {
  const out = analyze(RESUME, "We are looking for a marketing executive to plan campaigns and manage social media calendars. Please apply if you know SEO. Requirements: engaging copy and audience growth.");
  const words = [...out.skills.matched, ...out.skills.missing].map((x) => x.skill);
  for (const junk of ["please", "know", "requirements", "apply", "looking"]) assert.ok(!words.includes(junk), junk);
  assert.ok(words.includes("campaigns") && words.includes("seo"));
});

test("a job description with no known skills falls back to general keyword matching and says so", () => {
  const marketing = "We are looking for a marketing executive to plan campaigns, manage social media calendars, write engaging copy and report on audience growth every month.";
  const out = analyze(RESUME, marketing);
  assert.equal(out.skills.mode, "generic");
  assert.ok(out.skills.note);
});

test("keyword stuffing in list-like lines is flagged", () => {
  const stuffed = RESUME + "\nSkills: React, ReactJS, React.js, react, React, ReactJS\nTech: React | React.js | ReactJS | React";
  const out = analyze(stuffed, JD);
  assert.ok(out.stuffing.flags.some((f) => f.keyword === "react"));
});

test("scores always stay between 0 and 100", () => {
  for (const [resume, jd] of [["x", JD], [RESUME, "React"], ["", "Node.js developer"], [RESUME, RESUME]]) {
    const out = analyze(resume, jd);
    assert.ok(out.score >= 0 && out.score <= 100, `score ${out.score}`);
  }
});
