# 🚀 Deployment Guide (all free)

## 1. Get your free keys
- **MongoDB Atlas** (mongodb.com/atlas): create a free M0 cluster, create a database user, under Network Access add `0.0.0.0/0`, then Connect > Drivers and copy the connection string. Replace `<password>` with your user's password.
- **Gemini API key** (aistudio.google.com): click "Get API key".

## 2. Test locally first
Edit `server/.env` with your real values, then:
```
cd server && npm install && npm run dev
cd client && npm install && npm run dev      (new terminal)
```
Open http://localhost:5173, register, upload a PDF resume, paste a job description.

## 3. Push to GitHub
```
git init
git add .
git commit -m "ResumeForge AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/resumeforge-ai.git
git push -u origin main
```
(`.gitignore` already keeps your `.env` secrets out.)

## 4. Deploy backend on Render
1. render.com > New > **Web Service** > connect your GitHub repo
2. Root Directory: `server`
3. Build Command: `npm install`  |  Start Command: `npm start`
4. Instance type: Free
5. Environment variables: `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLIENT_URL` (add after step 5)
6. Deploy, then copy the URL, e.g. `https://resumeforge-api.onrender.com`

## 5. Deploy frontend on Vercel
1. vercel.com > Add New > Project > import your repo
2. Root Directory: `client`, Framework: Vite
3. Environment variable: `VITE_API_URL` = `https://YOUR-RENDER-URL.onrender.com/api`
4. Deploy and copy your Vercel URL

## 6. Connect them
Go back to Render > Environment > set `CLIENT_URL` to your Vercel URL (no trailing slash) > save (it redeploys).

## 7. Before your presentation
- Render free tier sleeps when idle. Open your app **5 minutes before** presenting to wake it (first load can take ~50 seconds).
- Create a demo account and run one analysis so the dashboard has data.
- Keep a sample resume PDF and a job description ready.
- Record a 2-minute screen recording as backup.
