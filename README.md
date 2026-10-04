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
