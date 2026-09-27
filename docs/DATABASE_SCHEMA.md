# SkillLink — Complete Database Schema & Data Dictionary

Database Engine: **MySQL 8.0.46 (InnoDB)**  
Character Set: `utf8mb4` | Collation: `utf8mb4_0900_ai_ci`

---

## 1. Table `users`
Represents student, peer, and administrator core accounts.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `id` | BIGINT | NO | PK | AUTO_INCREMENT | Unique surrogate identifier |
| `username` | VARCHAR(30) | NO | UNIQUE | NULL | `CHECK (username REGEXP '^[a-z0-9_]{3,30}$')` |
| `full_name` | VARCHAR(80) | NO | | NULL | Full legal or display name |
| `email` | VARCHAR(255) | NO | UNIQUE | NULL | Case-folded unique user email |
| `password_hash` | VARCHAR(255) | NO | | NULL | Bcrypt salt + hash (cost factor 10-12) |
| `profile_picture`| VARCHAR(500) | YES | | NULL | Public avatar path |
| `college` | VARCHAR(120) | YES | | NULL | University / Institution name |
| `branch` | VARCHAR(80) | YES | | NULL | Degree discipline / major |
| `graduation_year`| SMALLINT | YES | | NULL | `CHECK (graduation_year BETWEEN 1990 AND 2100)` |
| `bio` | VARCHAR(500) | YES | | NULL | User summary / collaboration goals |
| `location` | VARCHAR(120) | YES | | NULL | City, Country |
| `role` | ENUM | NO | | 'user' | `'user'`, `'admin'` |
| `status` | ENUM | NO | | 'active' | `'active'`, `'inactive'`, `'suspended'` |
| `created_at` | TIMESTAMP | YES | | CURRENT_TIMESTAMP | Account registration timestamp |
| `updated_at` | TIMESTAMP | YES | | CURRENT_TIMESTAMP ON UPDATE | Last modification timestamp |

---

## 2. Table `user_private`
Stores private fields isolated from public profile serialization.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `user_id` | BIGINT | NO | PK, FK | NULL | `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` |
| `phone` | VARCHAR(20) | YES | | NULL | Private contact telephone number |

---

## 3. Table `skills`
Master directory of standardized technical and academic proficiencies.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `id` | BIGINT | NO | PK | AUTO_INCREMENT | Surrogate identifier |
| `name` | VARCHAR(80) | NO | UNIQUE | NULL | Case-insensitive skill title (`utf8mb4_0900_ai_ci`) |
| `description` | VARCHAR(300) | YES | | NULL | Skill overview & learning outcomes |
| `category` | VARCHAR(40) | YES | | NULL | Skill classification |
| `created_at` | TIMESTAMP | YES | | CURRENT_TIMESTAMP | Creation timestamp |

---

## 4. Table `user_skills`
Associative table linking users to specific skills with proficiency ratings.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `id` | BIGINT | NO | PK | AUTO_INCREMENT | User skill mapping ID |
| `user_id` | BIGINT | NO | FK | NULL | `FK -> users(id) ON DELETE CASCADE` |
| `skill_id` | BIGINT | NO | FK | NULL | `FK -> skills(id) ON DELETE CASCADE` |
| `proficiency` | TINYINT | NO | | NULL | `CHECK (proficiency BETWEEN 1 AND 10)` |
| `created_at` | TIMESTAMP | YES | | CURRENT_TIMESTAMP | Added timestamp |
| `updated_at` | TIMESTAMP | YES | | CURRENT_TIMESTAMP ON UPDATE | Updated timestamp |

*Unique Composite Constraint:* `UNIQUE (user_id, skill_id)`

---

## 5. Table `connections`
Bidirectional peer networking relationships with stored pair key.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `id` | BIGINT | NO | PK | AUTO_INCREMENT | Connection identifier |
| `requester_id` | BIGINT | NO | FK | NULL | `FK -> users(id) ON DELETE RESTRICT` |
| `receiver_id` | BIGINT | NO | FK | NULL | `FK -> users(id) ON DELETE RESTRICT` |
| `status` | ENUM | NO | | 'pending' | `'pending'`, `'accepted'`, `'rejected'` |
| `where_we_met` | VARCHAR(200) | YES | | NULL | In-person context note |
| `pair_key` | VARCHAR(41) | YES | UNIQUE | STORED | `CONCAT(LEAST(requester_id, receiver_id), '_', GREATEST(requester_id, receiver_id))` |

*Constraints:* `CHECK (requester_id <> receiver_id)`, `UNIQUE (pair_key)`

---

## 6. Table `services`
Bookable offerings linked 1:1 with user skills.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `id` | BIGINT | NO | PK | AUTO_INCREMENT | Service identifier |
| `user_skill_id`| BIGINT | NO | UNIQUE, FK | NULL | `FK -> user_skills(id) ON DELETE CASCADE` |
| `category` | ENUM | NO | | 'Other' | Tutoring, Consulting, Freelancing, Design, Development, etc. |
| `title` | VARCHAR(100) | NO | | NULL | Service title |
| `description` | VARCHAR(500) | YES | | NULL | Offer description |
| `pricing_type` | ENUM | NO | | NULL | `'hourly'`, `'per_session'`, `'fixed_project'` |
| `price` | DECIMAL(10,2)| NO | | NULL | `CHECK (price >= 0)` Cash fee |
| `currency` | CHAR(3) | NO | | 'INR' | ISO Currency code |
| `duration_minutes` | SMALLINT | YES | | NULL | `CHECK (duration_minutes IS NULL OR duration_minutes > 0)` |
| `online_available` | BOOLEAN | YES | | TRUE | Online delivery flag |
| `in_person_available` | BOOLEAN | YES | | FALSE | In-person delivery flag |
| `is_active` | BOOLEAN | YES | | TRUE | Service visibility toggle |

---

## 7. Table `bookings`
Service appointment scheduling and execution state machine.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `id` | BIGINT | NO | PK | AUTO_INCREMENT | Booking identifier |
| `service_id` | BIGINT | NO | FK | NULL | `FK -> services(id) ON DELETE RESTRICT` |
| `customer_id` | BIGINT | NO | FK | NULL | `FK -> users(id) ON DELETE CASCADE` |
| `provider_id` | BIGINT | NO | FK | NULL | `FK -> users(id) ON DELETE CASCADE` |
| `booking_date` | DATE | NO | INDEX | NULL | Scheduled session date |
| `start_time` | TIME | NO | INDEX | NULL | Scheduled start time |
| `end_time` | TIME | NO | INDEX | NULL | Scheduled end time |
| `mode` | ENUM | NO | | NULL | `'online'`, `'in_person'` |
| `status` | ENUM | NO | | 'pending' | `'pending'`, `'confirmed'`, `'rejected'`, `'cancelled'`, `'completed'` |
| `price` | DECIMAL(10,2)| NO | | NULL | Deliberate snapshot of service price |
| `currency` | CHAR(3) | NO | | 'INR' | Currency code |

*Composite Index:* `INDEX idx_provider_booking_slot (provider_id, booking_date, start_time, end_time)`  
*Constraints:* `CHECK (customer_id <> provider_id)`, `CHECK (end_time > start_time)`

---

## 8. Table `admin_audit_logs`
Immutable, append-only history of administrative modifications.

| Column | Data Type | Nullable | Key | Default | Constraints / Description |
|---|---|---|---|---|---|
| `id` | BIGINT | NO | PK | AUTO_INCREMENT | Log identifier |
| `admin_id` | BIGINT | NO | FK | NULL | `FK -> users(id) ON DELETE CASCADE` |
| `action` | VARCHAR(60) | NO | | NULL | Action code (e.g. `update_user_status_or_role`) |
| `target_type` | VARCHAR(40) | NO | | NULL | Entity type (`user`, `service`, `complaint`, etc.) |
| `target_id` | BIGINT | YES | | NULL | Primary key of target entity |
| `reason` | VARCHAR(500) | YES | | NULL | Mandatory administrative justification |
| `old_data` | JSON | YES | | NULL | State snapshot prior to mutation |
| `new_data` | JSON | YES | | NULL | State snapshot post mutation |
| `created_at` | TIMESTAMP | YES | | CURRENT_TIMESTAMP | Immutable timestamp |
