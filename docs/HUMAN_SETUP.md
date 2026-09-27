# SkillLink — Human Setup & Operational Guide

This document provides step-by-step instructions for running SkillLink locally or deploying it to production.

---

## 1. Local Prerequisites
Ensure you have installed:
1. **Node.js** (v18.0.0 or newer, v24+ recommended)
2. **npm** (v9.0.0 or newer)
3. **MySQL Server** (v8.0.16 or newer — Community Edition)
4. **Git**

---

## 2. Local Setup & Execution

### A. Database Initialization
1. Start your local MySQL service.
2. Open MySQL CLI or Workbench and verify the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS skilllink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   ```
3. Run migrations and seed data:
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed
   ```

### B. Backend Setup
1. Open a terminal in `backend/`:
   ```bash
   cd backend
   npm install
   ```
2. Create `.env` (copied from `.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=skilllink_db
   JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
   FRONTEND_URL=http://localhost:5173
   ```
3. Start the backend server:
   ```bash
   npm run dev
   ```
   Backend will run at `http://localhost:5000`.

### C. Frontend Setup
1. Open another terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Frontend will run at `http://localhost:5173`.

---

## 3. Seed Accounts & Test Credentials

The database seed provides predefined test accounts with the password: `Password123!`

| Role | Username | Email | Purpose |
|---|---|---|---|
| Admin | `admin_user` | `admin@skilllink.edu` | Full platform administration and audit log inspection |
| User A | `alice_tech` | `alice@skilllink.edu` | Provider offering Web Development & React Tutoring |
| User B | `bob_coder` | `bob@skilllink.edu` | Customer / Peer looking for skills and booking sessions |
| User C | `charlie_data` | `charlie@skilllink.edu` | Data Science specialist & peer endorser |

To manually promote any user to Admin via SQL:
```sql
UPDATE users SET role = 'admin' WHERE username = 'target_username';
```

---

## 4. Production Deployment Guide

Unlike single-service or serverless architectures, SkillLink utilizes a 3-tier architecture:
1. **Frontend (Static Hosting)**: Vercel / Netlify / Cloudflare Pages.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Set environment variable: `VITE_API_BASE_URL=https://your-api-domain.com/api`
2. **Backend (Persistent Node Process)**: Render / Railway / DigitalOcean App Platform.
   - Start command: `node server.js`
   - Set environment variables: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `FRONTEND_URL`.
3. **Database (Managed MySQL 8.0+)**: Railway / PlanetScale / Aiven / AWS RDS.
   - Run migrations against the remote connection string.
