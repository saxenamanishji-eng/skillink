# SkillLink — Environment & Stack Specification

## 1. Verified Environment (Local Host)
- **Operating System**: Windows 10/11
- **Node.js**: v24.21.0
- **npm**: v11.19.0
- **Git**: v2.55.0.windows.5
- **MySQL Community Server**: v8.0.46 for Win64 on x86_64

## 2. MySQL 8.0 Specific Requirements
Why MySQL 8.0.16+ is strictly required:
1. **CHECK Constraints Enforcement**:
   - In MySQL versions older than 8.0.16 (and older MariaDB versions), `CHECK` constraints are parsed for syntax compatibility but silently ignored during DDL execution and `INSERT`/`UPDATE` operations.
   - MySQL 8.0.16+ strictly enforces table and column level `CHECK` constraints (e.g. `graduation_year BETWEEN 1990 AND 2100`, `proficiency BETWEEN 1 AND 10`, `rating BETWEEN 1 AND 5`, `requester_id <> receiver_id`, `end_time > start_time`).
2. **Recursive Common Table Expressions (CTEs)**:
   - Required for multi-degree network graph traversal (e.g. finding connections within 2 degrees). Not supported in MySQL 5.7.
3. **Window Functions**:
   - `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()` used in analytics and ranking queries. Supported natively in MySQL 8.0+.
4. **Generated Stored Columns with Indexes**:
   - Stored generated columns (such as `pair_key` for bidirectional connection uniqueness) with unique indexes allow strict constraint enforcement without vendor-specific triggers or Postgres `EXCLUDE` constructs.
5. **Collation**:
   - `utf8mb4_0900_ai_ci` is used for case-insensitive accent-insensitive collation on usernames and skill names, guaranteeing unique case-folding while preserving user presentation casing.

## 3. Configuration & Ports
- **Backend Port**: 5000 (`http://localhost:5000`)
- **Frontend Port**: 5173 (`http://localhost:5173`)
- **Database**: `skilllink_db` on `localhost:3306` (User: `root`, Password: `[CONFIGURED]`)
