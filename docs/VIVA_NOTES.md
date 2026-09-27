# SkillLink: DBMS Viva Voce Examination Comprehensive Study Guide

This document is the official, complete study and defense guide for the **SkillLink** database management system project, prepared specifically for B.Tech / University DBMS Viva Voce examinations and technical defenses.

---

## 1. Project Overview in 60 Seconds
> **Elevator Pitch**:
> "SkillLink is a full-stack, transactional skill discovery, networking, and service booking platform built with React, Node.js/Express, and MySQL 8.0. It features 22 normalized relational tables, ACID-compliant double-booking prevention using pessimistic index-range locking, generated columns for symmetrical connection uniqueness, 1:1 security credential isolation, window functions, and recursive CTEs for social graph traversal."

---

## 2. Top 25 DBMS Viva Questions & Model Answers

### Q1: Why did you choose a Relational Database (MySQL) instead of NoSQL (MongoDB)?
**Answer**:
"SkillLink requires strict **ACID transactional guarantees**, relational data integrity, and complex multi-table relationships (e.g., users, skills, bookings, reviews, complaints).
1. **Financial & Schedule Consistency**: A booking cannot be double-booked; MySQL InnoDB provides row/gap-level pessimistic locking (`FOR UPDATE`) and atomic multi-table rollback.
2. **Referential Integrity**: Cascading actions, foreign key constraints (`ON DELETE CASCADE / RESTRICT`), and `CHECK` constraints prevent orphan records.
3. **Structured Analytical Querying**: Window functions (`ROW_NUMBER`, `DENSE_RANK`) and Recursive Common Table Expressions (`WITH RECURSIVE`) enable advanced reporting and network traversal that are natural in SQL."

---

### Q2: What are the normal forms of your database, and is it fully normalized?
**Answer**:
"The entire schema is designed in **3NF and BCNF**:
- **1NF**: All column values are atomic (no CSVs, arrays, or repeating groups).
- **2NF**: Every table has a primary key, and all non-key attributes are fully functionally dependent on the entire primary key (no partial dependencies).
- **3NF & BCNF**: No transitive dependencies exist. For every functional dependency $X \rightarrow Y$, $X$ is a candidate key.
- **Intentional Temporal Snapshot**: In `bookings`, `hourly_rate` is snapshot at booking creation. This is not a normalization violation, but an immutable temporal contract recording the price agreed upon at that specific time."

---

### Q3: How did you solve the "Bidirectional Connection / Friendship" problem without duplicate rows?
**Answer**:
"Standard unique constraints `UNIQUE(requester_id, receiver_id)` only prevent $(A, B)$ duplicates, but permit $(B, A)$.
We solved this at the database level using a **Stored Generated Column**:
```sql
pair_key VARCHAR(64) GENERATED ALWAYS AS (
    CONCAT(LEAST(requester_id, receiver_id), '_', GREATEST(requester_id, receiver_id))
) STORED,
UNIQUE KEY uq_pair_key (pair_key)
```
Whether User 1 requests User 2, or User 2 requests User 1, `pair_key` evaluates to `'1_2'`. The database automatically rejects reverse or duplicate connection attempts with a unique constraint violation."

---

### Q4: Explain how you prevent Double-Booking under high concurrency.
**Answer**:
"Double-booking is prevented using **Pessimistic Range Locking** inside an explicit ACID transaction in `bookingController.js`:
1. `connection.beginTransaction()`
2. Execute overlap query with `FOR UPDATE`:
   ```sql
   SELECT id FROM bookings
   WHERE provider_id = ? AND booking_date = ? AND status IN ('pending', 'confirmed')
     AND (start_time < ? AND end_time > ?)
   FOR UPDATE;
   ```
3. InnoDB acquires exclusive locks on the composite index `idx_bookings_provider_schedule (provider_id, booking_date, start_time, end_time)`.
4. If conflicts are found, rollback and return HTTP 409 Conflict.
5. If free, `INSERT INTO bookings`, execute a verify-before-commit invariant check, and call `connection.commit()`."

---

### Q5: What are ACID properties and how does MySQL InnoDB guarantee them?
**Answer**:
- **Atomicity**: All-or-nothing execution. Guaranteed via **Undo Logs** (rolling back uncommitted changes if an error occurs).
- **Consistency**: The database moves only between valid states. Enforced via `CHECK` constraints, foreign keys, and unique indexes.
- **Isolation**: Concurrent transactions do not interfere. Enforced via **Two-Phase Locking (2PL)**, **MVCC (Multi-Version Concurrency Control)**, and pessimistic locks (`FOR UPDATE`).
- **Durability**: Committed data survives system crashes. Guaranteed via **Redo Logs** (Write-Ahead Logging / WAL) and the **Doublewrite Buffer** flushed to disk."

---

### Q6: What is the difference between a Clustered Index and a Secondary Index?
**Answer**:
- **Clustered Index**: In InnoDB, the table rows are physically stored directly in the leaf pages of the **Primary Key** B+Tree. Lookups by `id` take $O(\log N)$ point access.
- **Secondary Index**: A separate B+Tree where leaf nodes store the indexed key values plus the Primary Key (`id`).
- **Covering Index**: When a query's `SELECT` and `WHERE` clauses only require columns present in the secondary index itself, InnoDB satisfies the query without accessing the clustered table pages (`Extra: Using index`)."

---

### Q7: What is the Leftmost Prefix Rule in Composite Indexes?
**Answer**:
"For a composite index on $(A, B, C)$, MySQL can use the index for queries filtering on $(A)$, $(A, B)$, or $(A, B, C)$. If the leftmost column $A$ is omitted (e.g., querying on $B$ alone), MySQL cannot navigate the B+Tree from the root and falls back to a full table scan."

---

### Q8: What are Window Functions, and where did you use them in SkillLink?
**Answer**:
"Window functions perform calculations across a set of table rows related to the current row without collapsing rows like `GROUP BY`.
We used them in `database/queries/05_window_functions.sql`:
1. `ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY b.booking_date DESC)`: Selects the single latest booking per user.
2. `DENSE_RANK() OVER (ORDER BY COUNT(b.id) DESC)`: Ranks providers by total booking volume without gaps in ranking sequence.
3. `AVG(b.hourly_rate) OVER (PARTITION BY s.category)`: Compares an individual service price against the running average price of its entire skill category."

---

### Q9: What is a Recursive CTE and how did you use it for Social Graph Traversal?
**Answer**:
"A **Common Table Expression (CTE)** with `WITH RECURSIVE` references itself to iterate through hierarchical or graph data structures.
In `database/queries/06_recursive_ctes.sql`, we implemented **2-Degree / 2nd-Hop Friend-of-a-Friend Discovery**:
- **Anchor Member**: Finds all direct 1st-degree connections of User $X$ (`depth = 1`).
- **Recursive Member**: Joins the anchor results back to `connections` to find connections of connections (`depth = depth + 1` where `depth < 2`), excluding User $X$ and existing 1st-degree friends."

---

### Q10: Why did you separate `users` and `user_private` instead of one big table?
**Answer**:
"1. **Security & Principle of Least Privilege**: Prevents accidental exposure of password hashes or reset tokens if an API endpoint queries `SELECT * FROM users`.
2. **Buffer Pool Cache Efficiency**: Keeps the high-traffic `users` table narrow and compact so more user rows fit in RAM cache pages.
3. **Audit Isolation**: Authentication failed attempts and lock counters are updated in `user_private` without dirtying `users` rows."

---

### Q11: How do you prevent SQL Injection attacks?
**Answer**:
"Every database query across the entire backend uses **Parameterized Prepared Statements** via `mysql2/promise` with placeholder syntax (`?`):
```javascript
const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
```
User input is treated strictly as literal data by the MySQL query parser and never concatenated into executable SQL strings."

---

### Q12: What is the difference between `EXISTS` and `IN` subqueries?
**Answer**:
- `IN`: Evaluates the subquery, builds a distinct value list in memory, and checks for membership.
- `EXISTS`: Short-circuits and returns `TRUE` as soon as the first matching row is found in the correlated subquery without materializing the whole dataset. For large tables with foreign key indexes, `EXISTS` is significantly faster."

---

### Q13: What is the difference between `RANK()`, `DENSE_RANK()`, and `ROW_NUMBER()`?
**Answer**:
When values are tied (e.g., two providers with 10 bookings):
- `ROW_NUMBER()`: Assigns distinct consecutive numbers arbitrarily (1, 2, 3, 4).
- `RANK()`: Assigns the same rank to ties and skips subsequent numbers (1, 1, 3, 4).
- `DENSE_RANK()`: Assigns the same rank to ties without skipping subsequent numbers (1, 1, 2, 3)."

---

### Q14: What is the purpose of `CHECK` constraints in your schema?
**Answer**:
"MySQL 8.0 strictly enforces `CHECK` constraints to guarantee domain integrity:
- `CHECK (rating >= 1 AND rating <= 5)` on `reviews`.
- `CHECK (start_time < end_time)` on `availability` and `bookings`.
- `CHECK (hourly_rate >= 0.00)` on `services` and `bookings`.
- `CHECK (requester_id != receiver_id)` on `connections` (preventing self-connections)."

---

### Q15: How does your system handle user authentication and session security?
**Answer**:
"1. Passwords are encrypted with `bcryptjs` using a work factor / salt rounds of 10.
2. Authentication uses **httpOnly, sameSite cookies** carrying a signed JWT containing only `{ userId }`.
3. The auth middleware performs a **Live DB Status Check** on every request (`SELECT status FROM users WHERE id = ?`). If an admin suspends a user, their JWT is instantly blocked without waiting for token expiry."

---

### Q16: What is a Correlated Subquery?
**Answer**:
"A subquery that references columns from the outer query. It is evaluated once for every candidate row processed by the outer query. For example, in `04_subqueries_correlated.sql`, finding providers whose hourly rate is higher than the average hourly rate of their specific skill category."

---

### Q17: What are the differences between `INNER JOIN`, `LEFT JOIN`, and `CROSS JOIN`?
**Answer**:
- `INNER JOIN`: Returns only rows where the join condition matches in both tables.
- `LEFT JOIN`: Returns all rows from the left table, and matched rows from the right table (or `NULL` if no match exists).
- `CROSS JOIN`: Computes the Cartesian product ($M \times N$) of all rows between two tables."

---

### Q18: What is the difference between `WHERE` and `HAVING`?
**Answer**:
- `WHERE`: Filters individual rows *before* aggregation and `GROUP BY`.
- `HAVING`: Filters aggregated summary groups *after* `GROUP BY` (e.g., `HAVING COUNT(b.id) >= 5`)."

---

### Q19: Why is the `admin_audit_logs` table designed as append-only?
**Answer**:
"For compliance, security forensics, and non-repudiation. The backend API provides only an `INSERT` route (via internal actions) and a `GET` route for administrators. There are no `UPDATE` or `DELETE` endpoints, ensuring a permanent chronological record of administrative actions."

---

### Q20: What is a Deadlock and how does SkillLink prevent them?
**Answer**:
"A deadlock occurs when two transactions hold locks that the other requires, forming a cyclic dependency. SkillLink prevents deadlocks through:
1. **Deterministic Lock Ordering**: Tables are always locked in the exact sequence `users -> services -> availability -> bookings -> notifications`.
2. **Short Transactions**: No network calls or slow operations are performed inside database transactions.
3. **Index-Backed Point/Range Locks**: All lock queries use existing B-Tree indexes, preventing table-wide lock escalations."

---

### Q21: What is the purpose of `dateStrings: true` in the MySQL configuration?
**Answer**:
"By default, Node `mysql2` converts MySQL `DATE` and `DATETIME` columns into JavaScript `Date` objects, which shifts dates across local UTC time zones. Enabling `dateStrings: true` returns exact ISO strings (e.g., `'2026-10-01'`), ensuring date consistency across client and server."

---

### Q22: What happens if a user is deleted? How are foreign keys handled?
**Answer**:
"In SkillLink:
- Foreign keys where data must be cleaned up automatically use `ON DELETE CASCADE` (e.g., `user_skills`, `external_profiles`, `notifications`, `availability`).
- Direction-independent generated column base tables (`connections`) use `ON DELETE RESTRICT` with explicit transactional deletion logic in `userController.js` to ensure atomic cleanup."

---

### Q23: How do you calculate a provider's average rating and review count efficiently?
**Answer**:
"Using indexed aggregation:
```sql
SELECT reviewee_id, AVG(rating) AS avg_rating, COUNT(id) AS review_count 
FROM reviews 
WHERE reviewee_id = ? 
GROUP BY reviewee_id;
```
Backed by the composite index `idx_reviews_reviewee_rating (reviewee_id, rating)`."

---

### Q24: What is the role of the Database Connection Pool?
**Answer**:
"`mysql2/promise` connection pool maintains a set of reusable database connections (`connectionLimit: 10`). This avoids the expensive TCP handshake and authentication overhead of opening a new socket for every HTTP request."

---

### Q25: How would you scale this database if traffic grows 100x?
**Answer**:
"1. **Read/Write Splitting**: Route `SELECT` queries to MySQL Read Replicas and `INSERT/UPDATE/DELETE` to the Primary Master.
2. **Caching Layer**: Cache frequent queries (e.g., popular skills, public profiles) in Redis with cache invalidation on write.
3. **Database Sharding**: Partition booking records by geographical region or provider ID hash."

---

## 3. Viva Defense Quick-Reference Cheat Sheet

```
+-----------------------------------------------------------------------------------+
|                            SKILLLINK DBMS QUICK SPECS                             |
+-----------------------------------------------------------------------------------+
| Total Relational Tables   : 22 tables                                             |
| Storage Engine            : MySQL 8.0 InnoDB (ACID compliant)                     |
| Normal Form Level         : 3NF / BCNF                                            |
| Concurrency Mechanism     : Two-Phase Locking with SELECT ... FOR UPDATE          |
| Symmetrical Uniqueness    : pair_key (LEAST(u1, u2) || '_' || GREATEST(u1, u2))  |
| Security Architecture     : 1:1 user_private split, Live JWT status check         |
| Academic Query Suites     : 32 queries across 6 suites (CTEs, Window, Joins)      |
| Automated Test Suites     : 10/10 automated constraint & concurrency tests        |
+-----------------------------------------------------------------------------------+
```
