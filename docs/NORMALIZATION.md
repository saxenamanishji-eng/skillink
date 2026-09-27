# SkillLink: Database Normalization & Schema Design Rationale

This document provides a formal academic analysis of the relational schema design for **SkillLink**, detailing functional dependencies (FDs), normal form proofs (1NF, 2NF, 3NF, BCNF), and the rationale behind specific architectural decisions and intentional denormalization.

---

## 1. Relational Database Normalization Fundamentals

Normalization is a systematic approach of decomposing tables to eliminate data redundancy (which saves storage and avoids anomalies) and undesirable insertion, update, and deletion anomalies.

- **First Normal Form (1NF)**: A relation is in 1NF if and only if all domain values are atomic (indivisible) and there are no repeating groups.
- **Second Normal Form (2NF)**: A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key (no partial dependencies on a subset of a composite primary key).
- **Third Normal Form (3NF)**: A relation is in 3NF if it is in 2NF and no non-prime attribute is transitively dependent on the primary key (i.e., for every non-trivial functional dependency $X \rightarrow Y$, $X$ is a superkey or $Y$ is a prime attribute).
- **Boyce-Codd Normal Form (BCNF)**: A relation is in BCNF if for every non-trivial functional dependency $X \rightarrow Y$, $X$ is a superkey.

---

## 2. Table-by-Table Functional Dependency & Normal Form Analysis

### 2.1 Table: `users`
- **Schema**: `(id, username, email, full_name, bio, role, status, avatar_url, created_at, updated_at)`
- **Candidate Keys**: `{id}`, `{username}`, `{email}`
- **Primary Key**: `id`
- **Functional Dependencies (FDs)**:
  - $id \rightarrow \{username, email, full\_name, bio, role, status, avatar\_url, created\_at, updated\_at\}$
  - $username \rightarrow \{id, email, full\_name, bio, role, status, avatar\_url, created\_at, updated\_at\}$
  - $email \rightarrow \{id, username, full\_name, bio, role, status, avatar\_url, created\_at, updated\_at\}$
- **Proof of 3NF / BCNF**:
  - The primary key is single-attribute (`id`), eliminating any possibility of partial dependencies $\implies$ **2NF holds**.
  - All determinants in all non-trivial FDs ($id$, $username$, $email$) are candidate keys / superkeys $\implies$ **3NF and BCNF hold**.

---

### 2.2 Table: `user_private`
- **Schema**: `(user_id, password_hash, failed_login_attempts, locked_until, updated_at)`
- **Primary Key**: `user_id` (Foreign Key referencing `users.id`)
- **Functional Dependencies**:
  - $user\_id \rightarrow \{password\_hash, failed\_login\_attempts, locked\_until, updated\_at\}$
- **Proof of 3NF / BCNF**:
  - Determinant `user_id` is the primary key.
  - No transitive dependencies exist among security metadata attributes.
  - Satisfies **3NF and BCNF**.

---

### 2.3 Table: `skills`
- **Schema**: `(id, name, slug, description, category, is_verified, created_by, created_at)`
- **Candidate Keys**: `{id}`, `{slug}`
- **Primary Key**: `id`
- **Functional Dependencies**:
  - $id \rightarrow \{name, slug, description, category, is\_verified, created\_by, created\_at\}$
  - $slug \rightarrow \{id, name, description, category, is\_verified, created\_by, created\_at\}$
- **Proof of 3NF / BCNF**:
  - Single-column primary key $\implies$ **2NF holds**.
  - All determinants are candidate keys $\implies$ **3NF and BCNF hold**.

---

### 2.4 Table: `user_skills` (Association Table)
- **Schema**: `(id, user_id, skill_id, proficiency_level, years_of_experience, hourly_rate, bio_skill, is_primary, created_at)`
- **Candidate Keys**: `{id}`, `{user_id, skill_id}`
- **Primary Key**: `id`
- **Functional Dependencies**:
  - $id \rightarrow \{user\_id, skill\_id, proficiency\_level, years\_of\_experience, hourly\_rate, bio\_skill, is\_primary, created\_at\}$
  - $\{user\_id, skill\_id\} \rightarrow \{id, proficiency\_level, years\_of\_experience, hourly\_rate, bio\_skill, is\_primary, created\_at\}$
- **Proof of 3NF / BCNF**:
  - Both `{id}` and `{user_id, skill_id}` are superkeys.
  - Attributes such as `proficiency_level` and `years_of_experience` describe the specific relationship between a user and a skill.
  - No attribute depends on a proper subset of $\{user\_id, skill\_id\}$.
  - Satisfies **3NF and BCNF**.

---

### 2.5 Table: `connections`
- **Schema**: `(id, requester_id, receiver_id, pair_key, status, note, created_at, updated_at)`
- **Candidate Keys**: `{id}`, `{pair_key}`
- **Primary Key**: `id`
- **Generated Column**: `pair_key` = `CONCAT(LEAST(requester_id, receiver_id), '_', GREATEST(requester_id, receiver_id))`
- **Functional Dependencies**:
  - $id \rightarrow \{requester\_id, receiver\_id, pair\_key, status, note, created\_at, updated\_at\}$
  - $pair\_key \rightarrow \{id, requester\_id, receiver\_id, status, note, created\_at, updated\_at\}$
- **Proof of 3NF / BCNF**:
  - Guarantees direction-independent uniqueness ($A \rightarrow B$ prevents $B \rightarrow A$).
  - Satisfies **3NF and BCNF**.

---

### 2.6 Table: `services`
- **Schema**: `(id, provider_id, skill_id, title, description, hourly_rate, duration_minutes, is_active, created_at, updated_at)`
- **Candidate Keys**: `{id}`
- **Primary Key**: `id`
- **Functional Dependencies**:
  - $id \rightarrow \{provider\_id, skill\_id, title, description, hourly\_rate, duration\_minutes, is\_active, created\_at, updated\_at\}$
- **Proof of 3NF / BCNF**:
  - Single-column primary key. All descriptive attributes depend directly on `id`.
  - Satisfies **3NF and BCNF**.

---

### 2.7 Table: `bookings`
- **Schema**: `(id, service_id, client_id, provider_id, booking_date, start_time, end_time, status, hourly_rate, notes, cancellation_reason, created_at, updated_at)`
- **Primary Key**: `id`
- **Functional Dependencies**:
  - $id \rightarrow \{service\_id, client\_id, provider\_id, booking\_date, start\_time, end\_time, status, hourly\_rate, notes, cancellation\_reason, created\_at, updated\_at\}$
- **Analysis**:
  - `hourly_rate` in `bookings` is an intentional historical snapshot (see Section 3.2).
  - Satisfies **3NF**.

---

### 2.8 Table: `reviews`
- **Schema**: `(id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at)`
- **Candidate Keys**: `{id}`, `{booking_id}`
- **Primary Key**: `id`
- **Functional Dependencies**:
  - $id \rightarrow \{booking\_id, reviewer\_id, reviewee\_id, rating, comment, created\_at\}$
  - $booking\_id \rightarrow \{id, reviewer\_id, reviewee\_id, rating, comment, created\_at\}$
- **Proof of 3NF / BCNF**:
  - Exactly one review allowed per booking (`UNIQUE(booking_id)`).
  - Satisfies **3NF and BCNF**.

---

## 3. Schema Design Decisions & Intentional Trade-Offs

### 3.1 Security Decomposition: `users` and `user_private` (1:1 Relation)
- **Problem**: In a unified `users` table, a simple `SELECT * FROM users WHERE ...` or an accidental API serialization bug could expose sensitive authentication secrets (e.g., `password_hash`, reset tokens, failed attempt counters).
- **Solution**: We decomposed user entities into two tables connected by a 1:1 foreign key relationship:
  1. `users`: Public/general user metadata (name, bio, role, status, avatar).
  2. `user_private`: High-security authentication credentials and brute-force lock timers.
- **Benefits**:
  - Follows the **Principle of Least Privilege**: standard profile queries never touch `user_private`.
  - DB memory cache optimization: `users` rows are smaller and fit more efficiently in InnoDB buffer pool pages.

---

### 3.2 Financial Contract Preservation: Snapshotting `bookings.hourly_rate`
- **Academic Question**: *Does storing `hourly_rate` in `bookings` violate 3NF if `services` already has an `hourly_rate`?*
- **Answer & Proof**: **No.** This is not transitive dependency redundancy; it is **temporal data snapshotting**.
  - Let $R_s(t)$ be the service rate at time $t_0$, and $R_b(t_1)$ be the agreed price at booking time $t_1$.
  - If a provider charges \$50/hr on Monday and increases their price in `services` to \$80/hr on Friday, past bookings completed or scheduled at \$50/hr must legally and mathematically remain \$50/hr.
  - If `bookings` dynamically referenced `services.hourly_rate`, modifying a service rate would retroactively alter the contract price of all past bookings, corrupting financial history.
  - Therefore, `bookings.hourly_rate` represents an immutable contractual snapshot ($FD: id_{booking} \rightarrow hourly\_rate_{at\_time\_of\_booking}$).

---

### 3.3 Distinct Support Domains: `complaints` vs `reports` vs `helpdesk_tickets`
To maintain high cohesion and clean business logic, three distinct support tables were designed:

```
+-----------------------------------------------------------------------------------+
|                               SUPPORT / GOVERNANCE                                |
+------------------------+--------------------------+-------------------------------+
| Table: complaints      | Table: reports           | Table: helpdesk_tickets       |
+------------------------+--------------------------+-------------------------------+
| Target: Specific       | Target: Inappropriate    | Target: General technical     |
| Booking Transaction   | User or Content          | or platform support           |
| Context: Formal dispute| Context: Safety / abuse  | Context: Troubleshooting /    |
| between Client &       | violation of community   | feature assistance            |
| Provider               | standards                |                               |
| Key FK: booking_id     | Key FK: reported_user_id | Key FK: category_id           |
+------------------------+--------------------------+-------------------------------+
```

1. **`complaints`**: Linked specifically to `booking_id`. Handles resolution of service delivery disputes.
2. **`reports`**: Moderation flags against users (`reported_user_id`) or content with enum categories (`harassment`, `spam`, `fraud`, `inappropriate`).
3. **`helpdesk_tickets`**: Multi-turn threaded communication system (`helpdesk_messages`, `helpdesk_attachments`) between a user and support agents.

Combining all three into a single generic "tickets" table with nullable polymorphic foreign keys would violate 1NF/2NF principles and create sparse tables with high NULL density.

---

### 3.4 Symmetrical Uniqueness: `connections.pair_key`
- **Problem**: In social/professional networking graphs, a connection between User $A$ and User $B$ is undirected (symmetrical). Standard unique constraints `UNIQUE(requester_id, receiver_id)` only prevent duplicate $(A, B)$ rows, but permit $(B, A)$ duplicate requests.
- **Solution**: A stored generated column:
  $$\text{pair\_key} = \text{CONCAT}(\text{LEAST}(requester\_id, receiver\_id), '\_', \text{GREATEST}(requester\_id, receiver\_id))$$
  with a `UNIQUE(pair_key)` constraint.
- **Result**: Complete direction-independent uniqueness enforced strictly at the database kernel level without requiring trigger overhead or application-level locks.

---

## 4. Summary Table of Normal Forms

| Table Name | Normal Form | Primary Determinant | Justification / Notes |
| :--- | :--- | :--- | :--- |
| `users` | **BCNF** | `id` | All attributes atomic, no partial/transitive dependencies |
| `user_private` | **BCNF** | `user_id` | 1:1 security credential isolation |
| `password_reset_tokens` | **BCNF** | `id` | Token lifecycle isolated from user table |
| `skills` | **BCNF** | `id` | Categorized master skill taxonomy |
| `user_skills` | **BCNF** | `id`, `{user_id, skill_id}` | M:N association with relation-specific attributes |
| `external_profiles` | **BCNF** | `id`, `{user_id, platform}` | 1:M external links per user per platform |
| `connections` | **BCNF** | `id`, `pair_key` | Symmetrical uniqueness via generated column |
| `blocks` | **BCNF** | `id`, `{blocker_id, blocked_id}` | Directional blocking relation |
| `endorsements` | **BCNF** | `id`, `{endorser_id, user_skill_id}`| Skill-specific peer validation |
| `notifications` | **BCNF** | `id` | In-app user notifications |
| `services` | **BCNF** | `id` | Provider catalog item |
| `availability` | **BCNF** | `id` | Weekly recurring schedule definitions |
| `bookings` | **3NF** | `id` | Temporal price snapshot preserves contract history |
| `reviews` | **BCNF** | `id`, `booking_id` | 1:1 verified post-completion review |
| `complaints` | **BCNF** | `id`, `booking_id` | Dispute records per booking |
| `reports` | **BCNF** | `id` | Moderation flags against accounts |
| `helpdesk_categories` | **BCNF** | `id`, `slug` | Support classification taxonomy |
| `helpdesk_tickets` | **BCNF** | `id`, `ticket_number` | Support thread metadata |
| `helpdesk_messages` | **BCNF** | `id` | 1:M threaded messages in ticket |
| `helpdesk_attachments` | **BCNF** | `id` | Attachment file metadata per message |
| `help_articles` | **BCNF** | `id`, `slug` | Knowledge base documentation articles |
| `admin_audit_logs` | **BCNF** | `id` | Immutable append-only audit trail |
