# 🚀 START HERE — ResumeForge AI

Follow these steps in order. Total time: ~20-30 minutes.

---

## STEP 1: Get your free keys (5 min)

### MongoDB Atlas (free database)
1. Go to https://www.mongodb.com/cloud/atlas/register and sign up
2. Create a free **M0** cluster (any name, any region close to you)
3. Click **Database Access** (left sidebar) → Add New Database User → set a username + password → remember these
4. Click **Network Access** (left sidebar) → Add IP Address → **Allow Access From Anywhere** (0.0.0.0/0)
5. Click **Connect** on your cluster → **Drivers** → copy the connection string, it looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Replace `<username>` and `<password>` with what you set in step 3
7. Add a database name before the `?`, e.g. `.../resumeforge?retryWrites=true...`

### Google Gemini API key (free AI)
1. Go to https://aistudio.google.com/app/apikey
2. Click **Get API key** → **Create API key**
3. Copy it

---

## STEP 2: Configure the backend (2 min)

1. Open the `server` folder
2. Open the `.env` file in a text editor
3. Fill in:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string_from_step_1
JWT_SECRET=any_long_random_text_you_want_here_12345
GEMINI_API_KEY=your_gemini_key_from_step_1
GEMINI_MODEL=gemini-1.5-flash
CLIENT_URL=http://localhost:5173
```
4. Save the file

---

## STEP 3: Run it locally first (5 min) — ALWAYS test locally before deploying

Open a terminal in the `server` folder:
```bash
cd server
npm install
npm run dev
```
You should see `MongoDB connected` and `Server running on port 5000`. Leave this running.

Open a **second terminal** in the `client` folder:
```bash
cd client
npm install
npm run dev
```
Open the link it gives you (usually http://localhost:5173).

**Test it:** Register an account, log in, go to "New Analysis", upload any PDF resume, paste any job description (50+ characters), click Analyze. You should get a score.

If this works locally, you're ready to deploy. If it doesn't, copy the exact error message and send it to me.

---

## STEP 4: Push to GitHub (5 min)

```bash
cd resumeforge-ai
git init
git add .
git commit -m "ResumeForge AI - initial commit"
git branch -M main
```
Create a new empty repository on https://github.com/new (don't add README/gitignore there), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/resumeforge-ai.git
git push -u origin main
```

---

## STEP 5: Deploy backend on Render (5 min)

1. Go to https://render.com → sign up/log in → **New +** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Add Environment Variables (click "Advanced" or the Environment tab):
   - `MONGO_URI` = your MongoDB connection string
   - `JWT_SECRET` = your random secret
   - `GEMINI_API_KEY` = your Gemini key
   - `GEMINI_MODEL` = `gemini-1.5-flash`
   - `CLIENT_URL` = (leave blank for now, come back after Step 6)
5. Click **Create Web Service** and wait for it to deploy
6. Copy your backend URL, e.g. `https://resumeforge-api-xxxx.onrender.com`

---

## STEP 6: Deploy frontend on Vercel (5 min)

1. Go to https://vercel.com → sign up/log in → **Add New** → **Project**
2. Import your GitHub repo
3. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (auto-detected)
4. Add Environment Variable:
   - `VITE_API_URL` = `https://resumeforge-api-xxxx.onrender.com/api` (your Render URL + `/api`)
5. Click **Deploy**
6. Copy your frontend URL, e.g. `https://resumeforge-ai.vercel.app`

---

## STEP 7: Connect them (2 min)

1. Go back to **Render** → your service → **Environment**
2. Set `CLIENT_URL` = your Vercel URL (no trailing slash), e.g. `https://resumeforge-ai.vercel.app`
3. Save (it will redeploy automatically)

---

## STEP 8: Test the live app + take screenshots

1. Open your Vercel URL
2. Wait ~50 seconds on first load (Render free tier sleeps when idle)
3. Register a demo account
4. Go to **Analyze** → upload a resume PDF → paste a job description → Analyze
5. **Take these 3 screenshots:**
   - The **Analyze** page (upload form)
   - The **Result** page (score + AI feedback)
   - The **Dashboard** page (after you've done 2-3 analyses, so the chart shows)
6. Send me the 3 screenshots — I'll drop them into your report immediately.

---

## If something breaks

Copy the **exact error message** (from the browser console, or the terminal, or Render/Vercel logs) and send it to me. Don't guess — send the exact text.

## Your live links (fill in once deployed)
- Frontend: ___________________________
- Backend: ___________________________
- GitHub: ___________________________
