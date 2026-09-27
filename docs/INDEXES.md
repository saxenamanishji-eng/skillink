# SkillLink: Database Indexing Strategy & Execution Plan Analysis

This document provides a comprehensive technical catalog of all B-Tree indexes created across the **SkillLink** database schema, explaining the data structures, the leftmost prefix rule, index selectivity, and query execution plans (`EXPLAIN`).

---

## 1. Relational Indexing Fundamentals in MySQL InnoDB

### 1.1 Clustered Index vs. Secondary Indexes
- **Clustered Index**: In MySQL InnoDB, table data is physically organized and stored inside the B+Tree of the **Primary Key**. Every lookup by Primary Key (`id`) performs a direct point lookup with $O(\log N)$ disk page access time.
- **Secondary (Non-Clustered) Index**: A secondary index is a separate B+Tree where the leaf nodes store the indexed column values and the row's Primary Key value (`id`).
- **Index Lookup vs Covering Index**:
  - When a query asks for columns not present in the secondary index, InnoDB performs a **Bookmark Lookup** (secondary index $\rightarrow$ PK lookup in clustered index).
  - When all selected columns exist inside the secondary index, it is a **Covering Index** (`Extra: Using index`), eliminating clustered index lookups completely.

### 1.2 The Leftmost Prefix Rule
For a composite index on $(A, B, C)$, MySQL can use the index to satisfy queries filtering on:
- $(A)$
- $(A, B)$
- $(A, B, C)$

MySQL **cannot** use the index efficiently if the leftmost column $A$ is omitted (e.g., filtering on $(B)$ or $(B, C)$ only).

---

## 2. Comprehensive Catalog of SkillLink Indexes

| Table | Index Name | Columns | Type | Purpose & Target Queries |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `PRIMARY` | `id` | Clustered | Direct user retrieval by ID |
| `users` | `username` | `username` | Unique | User login / profile URL matching |
| `users` | `email` | `email` | Unique | User authentication / password reset |
| `users` | `idx_users_role_status` | `(role, status)` | Secondary Composite | Admin user directory filtering & count stats |
| `skills` | `PRIMARY` | `id` | Clustered | Skill lookup |
| `skills` | `name` | `name` | Unique | Case-insensitive uniqueness |
| `skills` | `slug` | `slug` | Unique | REST API /discover/skills/:slug lookup |
| `skills` | `idx_skills_category_verified` | `(category, is_verified)` | Secondary Composite | Skill categorization filtering |
| `user_skills` | `PRIMARY` | `id` | Clustered | Skill association record lookup |
| `user_skills` | `idx_user_skills_unique` | `(user_id, skill_id)` | Unique Composite | Enforces 1 skill entry per user |
| `user_skills` | `idx_user_skills_skill_rate` | `(skill_id, hourly_rate)` | Secondary Composite | Discover users by skill sorted by price |
| `user_skills` | `idx_user_skills_user_primary` | `(user_id, is_primary)` | Secondary Composite | Fetching user profile header badges |
| `connections` | `PRIMARY` | `id` | Clustered | Connection record lookup |
| `connections` | `pair_key` | `pair_key` | Unique Generated | Symmetrical uniqueness between 2 users |
| `connections` | `idx_connections_status_users` | `(status, requester_id, receiver_id)` | Secondary Composite | Friend list retrieval & pending friend requests |
| `services` | `PRIMARY` | `id` | Clustered | Service record lookup |
| `services` | `idx_services_provider_active` | `(provider_id, is_active)` | Secondary Composite | Fetching active catalog of a provider |
| `services` | `idx_services_skill_rate` | `(skill_id, hourly_rate)` | Secondary Composite | Filtering marketplace services by skill & price |
| `availability` | `PRIMARY` | `id` | Clustered | Availability slot lookup |
| `availability` | `idx_avail_user_day` | `(user_id, day_of_week, is_available)` | Secondary Composite | Fast validation during booking slot creation |
| `bookings` | `PRIMARY` | `id` | Clustered | Booking record lookup |
| `bookings` | `idx_bookings_provider_schedule` | `(provider_id, booking_date, start_time, end_time)` | Secondary Composite | **Critical**: Double-booking range lock & concurrency checks |
| `bookings` | `idx_bookings_client_date` | `(client_id, booking_date)` | Secondary Composite | "My Bookings" client dashboard query |
| `bookings` | `idx_bookings_status_date` | `(status, booking_date)` | Secondary Composite | Admin booking monitoring & analytics |
| `reviews` | `PRIMARY` | `id` | Clustered | Review record lookup |
| `reviews` | `booking_id` | `booking_id` | Unique | Enforces exactly 1 review per completed booking |
| `reviews` | `idx_reviews_reviewee_rating` | `(reviewee_id, rating)` | Secondary Composite | Fast average rating & testimonial aggregation |
| `complaints` | `PRIMARY` | `id` | Clustered | Complaint lookup |
| `complaints` | `idx_complaints_status_priority` | `(status, priority)` | Secondary Composite | Support agent queue triage |
| `reports` | `PRIMARY` | `id` | Clustered | Report lookup |
| `reports` | `idx_reports_status_target` | `(status, reported_user_id)` | Secondary Composite | Admin trust & safety moderation queue |
| `helpdesk_tickets` | `ticket_number` | `ticket_number` | Unique | Public customer tracking identifier |
| `helpdesk_tickets` | `idx_tickets_user_status` | `(user_id, status)` | Secondary Composite | Customer ticket history list |
| `helpdesk_tickets` | `idx_tickets_agent_status` | `(assigned_to, status)` | Secondary Composite | Agent assignment workload tracking |
| `admin_audit_logs`| `idx_audit_admin_time` | `(admin_id, created_at)` | Secondary Composite | Compliance audits by admin & date range |
| `admin_audit_logs`| `idx_audit_action_time` | `(action, created_at)` | Secondary Composite | Security audits by action type (e.g., 'user_deleted') |

---

## 3. Query Execution Plan (`EXPLAIN`) Analysis

### 3.1 Scenario 1: Double-Booking Overlap Check
**Query**:
```sql
EXPLAIN
SELECT id FROM bookings 
WHERE provider_id = 2 
  AND booking_date = '2026-10-01' 
  AND status IN ('pending', 'confirmed') 
  AND (start_time < '11:00:00' AND end_time > '10:00:00');
```

**Execution Plan Analysis**:
- **`type`**: `range` (Optimal for range bounding)
- **`key`**: `idx_bookings_provider_schedule`
- **`key_len`**: Matches `provider_id` (4 bytes) + `booking_date` (3 bytes)
- **`rows`**: Scans only the specific provider's schedule for that single date (typically 1–5 index rows).
- **`Extra`**: `Using index condition; Using where`
- **Outcome**: Bypasses full table scan of thousands of bookings; checks the specific provider's day slice in microseconds.

---

### 3.2 Scenario 2: High-Performance Skill Discovery with Rating & Rate Aggregation
**Query**:
```sql
EXPLAIN
SELECT 
    u.id, u.full_name, u.username,
    us.proficiency_level, us.hourly_rate,
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(r.id) AS review_count
FROM user_skills us
JOIN users u ON us.user_id = u.id
LEFT JOIN reviews r ON r.reviewee_id = u.id
WHERE us.skill_id = 1 AND u.status = 'active'
GROUP BY u.id, u.full_name, u.username, us.proficiency_level, us.hourly_rate
ORDER BY us.hourly_rate ASC;
```

**Execution Plan Analysis**:
1. **Driving Table (`user_skills`)**:
   - `type`: `ref`
   - `key`: `idx_user_skills_skill_rate`
   - `rows`: Scans only users registered with `skill_id = 1`.
2. **Joined Table (`users`)**:
   - `type`: `eq_ref` (Primary Key lookup)
   - `key`: `PRIMARY`
   - `rows`: 1 row per matching user.
3. **Joined Table (`reviews`)**:
   - `type`: `ref`
   - `key`: `idx_reviews_reviewee_rating`
   - `rows`: Aggregates reviews directly from index leaf nodes.
- **Outcome**: Execution avoids temporary disk tables for sorting because `idx_user_skills_skill_rate` supplies pre-ordered rows by `hourly_rate`.

---

### 3.3 Scenario 3: Bidirectional Connection Retrieval
**Query**:
```sql
EXPLAIN
SELECT u.id, u.full_name, c.status, c.created_at
FROM connections c
JOIN users u ON (u.id = CASE WHEN c.requester_id = 2 THEN c.receiver_id ELSE c.requester_id END)
WHERE c.status = 'accepted'
  AND (c.requester_id = 2 OR c.receiver_id = 2);
```

**Execution Plan Analysis**:
- **`type`**: `ref`
- **`key`**: `idx_connections_status_users`
- **`rows`**: Directly isolates rows where `status = 'accepted'` without scanning pending or rejected connections.
- **Outcome**: Instant sub-millisecond retrieval of a user's active social/professional network.

---

## 4. Index Maintenance & Write Overhead Trade-Offs

While indexes drastically accelerate `SELECT` operations, they introduce write overhead on `INSERT`, `UPDATE`, and `DELETE` (known as **Write Amplification**):
1. **Index Tree Rebalancing**: Adding a booking requires updating the clustered index plus secondary indexes (`idx_bookings_provider_schedule`, `idx_bookings_client_date`, `idx_bookings_status_date`).
2. **Buffer Pool Memory**: Indexes consume RAM in the InnoDB Buffer Pool.

### SkillLink Design Balance:
- Every index in SkillLink directly maps to a high-frequency REST API filter, an ACID concurrency lock, or an administrative dashboard metric.
- No redundant overlapping indexes (e.g., an index on `(A)` was omitted if an index on `(A, B)` already exists, per the Leftmost Prefix Rule).
