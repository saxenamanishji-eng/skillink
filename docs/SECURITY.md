# SkillLink — Security Architecture & Rationale

## 1. Authentication & Session Management
- **Minimal JWT Payload**: The JWT cookie contains strictly `{ userId }`.
  - **Rationale**: Role (`role`) and account status (`status`) can change at any time (e.g., an administrator suspends a user). If role and status are embedded in the token payload and trusted on subsequent requests without a database check, a suspended or demoted user retains their previous privileges for the duration of the token's lifetime (7 days).
  - **Live DB Re-Check**: The `auth.js` middleware validates the cryptographic signature and expiration of the JWT, and immediately queries `SELECT id, role, status FROM users WHERE id = ?`. If `status <> 'active'`, the request is immediately rejected with HTTP 403.
- **httpOnly, Secure, SameSite=Lax Cookies**:
  - The JWT is transmitted in an `httpOnly` cookie. This prevents client-side JavaScript (e.g. from any Cross-Site Scripting / XSS injection) from accessing or exfiltrating the token, unlike `localStorage`.
  - `SameSite=Lax` provides automatic protection against Cross-Site Request Forgery (CSRF) for state-changing cross-origin requests.
  - *Deliberate simplification note*: Full CSRF anti-forgery double-submit tokens are omitted in favor of `SameSite=Lax` for simplicity in this academic demonstration.

## 2. Password Handling
- Passwords are encrypted with `bcrypt` (cost factor 10-12) with unique cryptographic salts. Plaintext passwords are never logged, stored, or returned in API responses.
- Password reset tokens are generated as high-entropy random bytes. The raw token is sent to the user's email (or logged in dev mode), but only a `SHA-256` hash of the token is persisted in `password_reset_tokens` alongside an explicit 15-minute expiration timestamp (`expires_at`).

## 3. Privacy Serializer (Allow-List Approach)
- Instead of using ad-hoc `delete user.password_hash` or filtering blocks per endpoint, SkillLink utilizes a central serializer function `toPublicProfile(userRow, viewerId)`.
- The serializer operates on an **allow-list** of safe public fields.
- Private fields (e.g. `phone` stored in the separate `user_private` table) are only returned if `viewerId === userRow.id`.

## 4. SQL Injection Protection
- All database queries utilize parameterized prepared statements via `mysql2/promise` with placeholder `?` parameters. Raw string concatenation in SQL queries is prohibited.

## 5. Append-Only Admin Audit Logging
- The `admin_audit_logs` table records every administrative modification (user suspension, skill approval/rejection, content removal, ticket resolution).
- The application exposes **zero** `UPDATE` or `DELETE` endpoints for audit logs, ensuring tamper-evident history.

## 6. Profile URL Validation & Safe Navigation
- Profile URLs and share links are strictly validated using URL parsing (`new URL()`).
- The application checks:
  1. Protocol must be `http:` or `https:`.
  2. Hostname must match the configured application origin.
  3. Path must match the strict regex `^/u/[a-z0-9_]{3,30}/?$`.
- Arbitrary URIs, `javascript:`, `data:`, or third-party phishing domains are rejected. Navigation occurs via React Router, never through direct `window.location` assignment.
