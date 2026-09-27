# SkillLink: Verification, Testing Matrix & Test Execution Guide

This document details the complete automated and manual testing strategy, test matrices, test account credentials, and reproduction commands for **SkillLink**.

---

## 1. Test Accounts & Demo Credentials

All test accounts use the common development password: `Password123!`

| Username | Role | Status | Description / Seeded Features |
| :--- | :--- | :--- | :--- |
| `admin_user` | `admin` | `active` | Full access to Admin Console, Audit Logs, Analytics, User Management |
| `alice_tech` | `user` | `active` | Web & Full-Stack Developer; has multiple skills, active services, availability, bookings |
| `bob_coder` | `user` | `active` | Python & Backend Engineer; has peer endorsements and service bookings |
| `charlie_data` | `user` | `active` | Data Scientist & ML Engineer; has service catalog and reviews |
| `diana_design` | `user` | `active` | UI/UX Designer; has portfolio services and active client connections |

---

## 2. Automated Test Matrix (10/10 Constraint & Concurrency Tests)

The automated test runner located at `database/tests/run_tests.js` tests all critical schema constraints, business rules, and concurrency locks:

| # | Test Case Description | Target Rule / Mechanism | Expected Result | Status |
| :-: | :--- | :--- | :--- | :-: |
| **1** | Self-connection rejection | `CHECK (requester_id != receiver_id)` | Database rejects connection | **PASSED** |
| **2** | Duplicate connection rejection | `UNIQUE (pair_key)` | Duplicate attempt rejected | **PASSED** |
| **3** | Reverse connection rejection | `UNIQUE (pair_key)` stored generated column | Reverse attempt rejected | **PASSED** |
| **4** | Self-endorsement rejection | `user_skills.user_id != endorser_id` rule | Rejected at API/DB level | **PASSED** |
| **5** | Invalid rating rejection (<1 or >5) | `CHECK (rating >= 1 AND rating <= 5)` | Database constraint violation | **PASSED** |
| **6** | Self-booking rejection | Client cannot book own service | HTTP 400 Bad Request | **PASSED** |
| **7** | Time order constraint violation | `CHECK (start_time < end_time)` | Database constraint violation | **PASSED** |
| **8** | Non-admin blocked from admin API | `admin.js` role verification middleware | HTTP 403 Forbidden | **PASSED** |
| **9** | Suspended user live token rejection | Live `status = 'active'` DB check in `auth.js` | HTTP 403 Suspended | **PASSED** |
| **10**| Double-booking race condition | `SELECT ... FOR UPDATE` index range lock | First commits, second gets HTTP 409 | **PASSED** |

---

## 3. Academic DBMS Queries Matrix (32/32 Queries)

All 32 academic queries located in `database/queries/` were verified against live data via `node database/queries/run_all_queries.js`:

| Suite File | Focus Area | Query Count | Topics Covered | Status |
| :--- | :--- | :-: | :--- | :-: |
| `01_basic_and_joins.sql` | Relational Joins | 5 | Inner Join, Left Outer Join, Self Join, Cross Join, Multi-table 4-way Joins | **5/5 PASSED** |
| `02_aggregates_group_by.sql` | Aggregations & Grouping | 5 | SUM, AVG, COUNT, MIN, MAX, GROUP BY, HAVING, Multi-column GROUP BY | **5/5 PASSED** |
| `03_subqueries_scalar_in.sql` | Scalar & Set Subqueries | 5 | Scalar subqueries in WHERE/SELECT, IN/NOT IN, ALL/ANY operators | **5/5 PASSED** |
| `04_subqueries_correlated.sql`| Correlated Subqueries | 5 | Correlated subqueries, EXISTS, NOT EXISTS, Conditional aggregations | **5/5 PASSED** |
| `05_window_functions.sql` | Advanced Window Analytics | 6 | `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `AVG() OVER()`, `SUM() OVER(ORDER BY)` | **6/6 PASSED** |
| `06_recursive_ctes.sql` | Graph & CTE Traversal | 6 | Non-recursive CTEs, `WITH RECURSIVE` 2-degree friend-of-friend network discovery | **6/6 PASSED** |

---

## 4. How to Execute Test Suites

### 4.1 Run Automated Constraint & Concurrency Test Suite
```bash
node database/tests/run_tests.js
```

### 4.2 Run All 32 Academic DBMS SQL Queries
```bash
node database/queries/run_all_queries.js
```

### 4.3 Verify Frontend Production Build
```bash
cd frontend
npm run build
```

### 4.4 Verify Backend Health Endpoint
```bash
curl http://localhost:5000/api/health
```
Expected output:
```json
{"status":"ok","timestamp":"2026-09-27T...","database":"connected"}
```
