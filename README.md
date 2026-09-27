# SkillLink — Full-Stack Skill Discovery & Booking Platform

SkillLink is a production-grade, full-stack skill-based networking, discovery, booking, support, complaint, and administration platform built from scratch with **React**, **Node.js/Express**, and **MySQL 8.0**.

Designed specifically for **B.Tech DBMS demonstration, viva examination, and production-grade software engineering**.

---

## 🚀 Key Highlights & Architecture

- **Database Engineering (MySQL 8.0)**:
  - 22 normalized relational tables (3NF / BCNF).
  - Direction-independent symmetrical connection uniqueness via **Stored Generated Column** (`pair_key`).
  - ACID-compliant **Double-Booking Prevention** using pessimistic index-range locking (`SELECT ... FOR UPDATE`) and transaction rollback.
  - Comprehensive database constraints (`CHECK`, `FOREIGN KEY`, `UNIQUE`, Composite B-Tree Indexes).
  - 32 Academic DBMS queries covering Joins, Aggregates, Correlated Subqueries, `EXISTS`, Window Functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`), and Recursive CTEs (`WITH RECURSIVE`).

- **Backend API (Node.js / Express.js)**:
  - Complete REST API across 17 domains.
  - Minimal JWT payload (`{ userId }` only) with **Live DB Status Invalidation** on every request.
  - 1:1 security credential isolation (`users` vs `user_private`).
  - Append-only administrative audit logging (`admin_audit_logs`).
  - Cash-only physical service booking workflow (no payment gateway scope).

- **Frontend (React / Vite / Vanilla CSS Design Tokens)**:
  - Clean, component-driven UI with responsive layouts, dark/light theme toggle, custom modal system, and badges.
  - Interactive peer networking, skill endorsements, and comprehensive service discovery.
  - Dedicated Admin Control Center (Analytics, Users, Services, Bookings, Moderation, Support Tickets, Audit Logs).

---

## 📁 Repository Structure

```
DMBS/
├── backend/                  # Node.js + Express.js REST API
│   ├── config/               # Database connection pool (mysql2/promise)
│   ├── controllers/          # 17 domain business logic controllers
│   ├── middleware/           # auth, admin, error handler, multer upload
│   ├── routes/               # API endpoint route definitions
│   ├── utils/                # Validation, serializer, mailer, password auth
│   └── server.js             # Express app entry point
├── database/                 # Database schema, seed data, queries & test suites
│   ├── migrations/           # 5 chronological SQL migration files
│   ├── queries/              # 32 academic queries across 6 categories
│   ├── tests/                # Automated constraint & concurrency test runner
│   ├── run_migrations.js     # Migration execution script
│   └── seed.js               # Demo dataset seeder
├── frontend/                 # React (Vite) Single Page Application
│   ├── public/               # Static assets & avatar placeholders
│   ├── src/
│   │   ├── admin/            # Admin control center layout & 10 admin pages
│   │   ├── components/       # Reusable UI components (Navbar, Cards, Modals, etc.)
│   │   ├── context/          # AuthContext with session & theme management
│   │   ├── pages/            # 22 user-facing application pages
│   │   ├── services/         # Centralized API fetch wrapper
│   │   └── styles/           # CSS design system (tokens, components, responsive)
│   └── index.html
└── docs/                     # Comprehensive academic & engineering documentation
    ├── DATABASE_SCHEMA.md    # Complete table definitions & constraints
    ├── ENVIRONMENT.md        # Environment variables & system prerequisites
    ├── ER_DIAGRAM.md         # Mermaid Entity-Relationship diagrams
    ├── HUMAN_SETUP.md        # Step-by-step setup guide for humans
    ├── INDEXES.md            # B-Tree indexing strategy & EXPLAIN analysis
    ├── NORMALIZATION.md      # 1NF, 2NF, 3NF functional dependency proofs
    ├── PLAN.md               # Master engineering architectural plan
    ├── PROGRESS.md           # Phase completion tracking
    ├── SECURITY.md           # Threat modeling & security architecture
    ├── TESTING.md            # Test matrix, credentials & reproduction commands
    ├── TRANSACTIONS.md       # ACID analysis & booking concurrency locking
    └── VIVA_NOTES.md         # Top 25 DBMS Viva Voce study guide
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v18+) & npm
- MySQL Server 8.0+

### 1. Database Setup
Create database and run migrations & seed script:
```sql
CREATE DATABASE IF NOT EXISTS skilllink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

```bash
# Apply migrations
node database/run_migrations.js

# Seed demo dataset
node database/seed.js
```

### 2. Run Automated Verification Tests
```bash
# Run 10/10 Database Constraint & Concurrency Tests
node database/tests/run_tests.js

# Run 32/32 Academic SQL Queries
node database/queries/run_all_queries.js
```

### 3. Start Backend Server
```bash
cd backend
npm install
node server.js
# API running on http://localhost:5000
```

### 4. Start Frontend Client
```bash
cd frontend
npm install
npm run dev
# Frontend running on http://localhost:5173
```

---

## 🔑 Demo Credentials

All test accounts share the password: `Password123!`

| Role | Username | Description |
| :--- | :--- | :--- |
| **Admin** | `admin_user` | Full access to `/admin` dashboard, moderation, analytics, audit logs |
| **Provider / User** | `alice_tech` | Full-stack developer with services, availability, bookings, reviews |
| **User** | `bob_coder` | Python developer with endorsements & active bookings |
| **User** | `charlie_data` | Data science provider with service catalog |
| **User** | `diana_design` | UI/UX designer with portfolio and client network |

---

## 📚 Academic Documentation Quick Links

- 📖 [Comprehensive Viva Study Guide](docs/VIVA_NOTES.md)
- 📐 [Functional Dependencies & Normalization Proofs](docs/NORMALIZATION.md)
- 🔒 [Transactions, ACID & Concurrency Control](docs/TRANSACTIONS.md)
- ⚡ [B-Tree Indexing Strategy & EXPLAIN Plans](docs/INDEXES.md)
- 🧪 [Testing Matrix & Verification Suite](docs/TESTING.md)
- 📊 [Entity-Relationship (ER) Diagram](docs/ER_DIAGRAM.md)
- 🛡️ [Security Architecture & Threat Model](docs/SECURITY.md)
