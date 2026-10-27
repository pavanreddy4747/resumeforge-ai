# ⚡ ResumeForge AI

**Beat the ATS. Land more interviews.**

ResumeForge AI is a full-stack web app that analyzes a resume against a job description, gives an **ATS compatibility score out of 100**, highlights **matched and missing keywords**, checks resume sections, and uses **AI to rewrite bullet points** and suggest skill-gap improvements.

## 🎯 Problem
Most resumes are filtered out by Applicant Tracking Systems (ATS) before a human ever reads them, and candidates never learn why. ResumeForge AI shows exactly what is missing and how to fix it.

## ✨ Features
- 🔐 Secure authentication (JWT + bcrypt)
- 📄 PDF resume upload and text extraction
- 📊 Custom ATS scoring engine (keywords 60% + sections 20% + formatting 20%)
- 🤖 AI feedback: assessment, strengths, improvements, rewritten bullets, skill-gap advice (Google Gemini)
- 🛡️ Works even if the AI is unavailable (built-in fallback feedback)
- 📈 Dashboard with history and score-improvement chart
- 🧾 Printable report (Download as PDF)
- 📱 Responsive UI

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS, Recharts, Axios, React Router |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT, bcrypt |
| AI | Google Gemini API |
| Deployment | Vercel (frontend), Render (backend) |

## 🚀 Run locally

**Backend**
```bash
cd server
npm install
# edit .env with your MongoDB URI, JWT secret, Gemini key
npm run dev
```

**Frontend**
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173

## 🔑 Environment variables

`server/.env`
```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=a_long_random_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
CLIENT_URL=http://localhost:5173
```

`client/.env`
```
VITE_API_URL=http://localhost:5000/api
```

## 🌍 Live demo
- App: _add your Vercel link_
- API: _add your Render link_
- Demo login: _add a demo email and password_

## 🔮 Future scope
LinkedIn profile import, interview question generator, job recommendations, multi-language resumes, cover letter generator.

## 👨‍💻 Author
Built during my Full Stack internship at Zyphotechk Technology.

## ✨ v2 features
- **Explainable scoring**: click any matched keyword to see the exact resume lines where it was found.
- **Keyword-stuffing detector**: warns when a resume is packed with keywords in a way a human recruiter would distrust.
- **Score range**: shows how much the score moves if the job description is worded slightly differently, instead of one falsely precise number.
- **Version history and diff**: link a new scan to an earlier one to see score movement, keywords gained or lost, and the exact text changes.
- **Compare two resumes** against the same job description.
- **Honest AI status**: if the AI service is down, the app says so and shows basic tips instead of pretending.
- **Optional Google sign-in** (needs `GOOGLE_CLIENT_ID` on the server and `VITE_GOOGLE_CLIENT_ID` on the client).


## 🧠 v3: smarter scoring
- **Skill dictionary (117 skills)**: spelling variants count as one skill (Node.js = NodeJS = node js, full-stack = full stack). Ordinary words such as "build" or "hiring" are never counted as skills.
- **Required vs nice-to-have**: the job description is read for phrases like "is required" and "is a plus", and required skills weigh 3x more.
- **Proven vs listed**: a skill shown in a project or job bullet earns full credit; one that only appears in a skills list earns 60%.
- **What-if points**: every missing skill shows the estimated gain if you truly have it and show it in a real bullet.
- **Bullet checker**: flags weak openers ("Responsible for", "Worked on"), missing action verbs and missing results.
- **Score range** based on how the score moves if nice-to-have skills or listed-only skills are weighed differently.
- **General keyword mode** for job descriptions with almost no technical skills, and a warning when the signal is thin.
- **Safer version history**: deleting a version repairs the chain instead of breaking the next comparison.

## 🛡️ Reliability and security
- Rate limits: scans are limited per user per hour, failed logins per IP, plus a general flood guard.
- Security headers (helmet) and clear 400 messages for wrong file types, oversized files and unreadable PDFs.
- **AI auto-recovery**: if a Gemini model name stops working the server asks Google which models are available and remembers a working one.
- **Health pages**: `/api/health` (server, database, configuration) and `/api/health/ai` (makes one real Gemini call and shows the real error if it fails).

## ✅ Automated tests
```bash
cd server
npm test
```
39 tests cover the scoring rules, version-chain repair, AI model fallback (with a simulated Gemini server), and the real Express app end to end (real PDFs, upload errors, rate limits).
