# SkillLink: Deployment & Hosting Guide (GitHub, Vercel & Cloud Database)

This guide provides instructions for pushing the **SkillLink** codebase to GitHub and deploying the application to **Vercel** and cloud hosting environments.

---

## 1. Pushing Code to GitHub

### Step 1: Initialize Git & Commit Local Files
*(Already performed automatically if you followed the build steps)*:
```bash
git init
git add .
git commit -m "feat: Initial commit of SkillLink full-stack platform"
```

### Step 2: Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g., `skilllink` or `DBMS-Project`).
3. Set the visibility to **Public** or **Private**.
4. Leave "Add a README file" and ".gitignore" **unchecked** (we already have comprehensive ones).
5. Click **Create repository**.

### Step 3: Link & Push to Remote
Copy your GitHub repository URL and execute the following commands in your terminal:
```bash
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git push -u origin main
```

---

## 2. Deploying Frontend to Vercel

Vercel provides native, optimized hosting for the React (Vite) Single Page Application.

### Option A: Import from GitHub (Recommended)
1. Log in to [vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Select your `skilllink` repository from the list.
4. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (Click *Edit* and select the `frontend` folder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - Add `VITE_API_BASE_URL` = `https://your-backend-domain.com/api` (URL of your deployed backend REST API).
6. Click **Deploy**.

> [!NOTE]
> The included [`frontend/vercel.json`](file:///c:/Users/manis/OneDrive/Desktop/DMBS/frontend/vercel.json) automatically configures SPA fallback rewrites so that direct route navigation (e.g., `/admin`, `/bookings`, `/profile/alice_tech`) works without 404 errors.

---

## 3. Deploying Backend & Database (Node.js + MySQL)

Because SkillLink utilizes MySQL 8.0 with InnoDB range locking and persistent connection pooling, the backend REST API and MySQL database can be deployed to any of the following free/starter cloud platforms:

### 3.1 Cloud MySQL Database (e.g., Aiven / TiDB Cloud / Railway / Supabase)
1. Create a free MySQL 8.0 instance on [Aiven.io](https://aiven.io), [TiDB Cloud](https://tidbcloud.com), or [Railway](https://railway.app).
2. Obtain your connection parameters: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Run the migrations and seed script against the remote database:
   ```bash
   node database/run_migrations.js
   node database/seed.js
   ```

### 3.2 Backend API Deployment (e.g., Render / Railway / DigitalOcean / Vercel Serverless)
1. Deploy the `backend/` directory to **Render** (Web Service) or **Railway**.
2. Configure Environment Variables in the hosting dashboard:
   - `PORT` = `5000`
   - `NODE_ENV` = `production`
   - `DB_HOST` = `<your-cloud-db-host>`
   - `DB_PORT` = `<your-cloud-db-port>`
   - `DB_USER` = `<your-cloud-db-user>`
   - `DB_PASSWORD` = `<your-cloud-db-password>`
   - `DB_NAME` = `skilllink_db`
   - `JWT_SECRET` = `<a-secure-random-string>`
   - `CORS_ORIGIN` = `https://<your-vercel-app>.vercel.app`
3. Set the start command to: `npm start` (or `node server.js`).
