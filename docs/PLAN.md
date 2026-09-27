# SkillLink — Project Master Plan

## 1. Project Overview
SkillLink is a skill-based networking, discovery, booking, support, complaint, and administration platform.
- **Frontend**: React + Vite (Plain CSS, no frameworks)
- **Backend**: Node.js + Express.js REST API
- **Database**: MySQL 8.0.46 (InnoDB, check constraints, recursive CTEs, window functions)
- **Payments**: Cash-only, in-person/online, arranged directly outside the app.

## 2. Phase Breakdown
- [x] **Phase 1**: Environment verification, project skeleton, Express setup, MySQL connection pool.
- [ ] **Phase 2**: Numbered migrations 001-002, seed data, auth (JWT httpOnly cookie + live DB status check), auth/admin middleware.
- [ ] **Phase 3**: Profile viewing/editing, privacy serializer (`toPublicProfile`), external profiles, public profile links (with safe URL parser).
- [ ] **Phase 4**: Connections (with `pair_key` generated column for direction-independent uniqueness), blocks, skill endorsements, and notifications.
- [ ] **Phase 5**: Discovery & Search ranking using parameterized SQL queries with pagination & relevance scoring.
- [ ] **Phase 6**: Services, availability scheduling, double-booking prevention transaction (index-range lock + verify-before-commit), booking reviews, notifications.
- [ ] **Phase 7**: Support systems: Helpdesk (tickets, messages, attachments), Complaints, Reports, Help Center articles.
- [ ] **Phase 8**: Admin portal: Dashboard, users, skills, services, bookings, complaints, reports, reviews, helpdesk, help-center articles, analytics, append-only audit log.
- [ ] **Phase 9**: Comprehensive testing journeys (multi-account tests, automated constraint test suite, security verification).
- [ ] **Phase 10**: Academic DBMS deliverables (ER Diagram, Schema dictionary, Normalization, Transactions, Indexes, Viva notes, 30+ SQL queries) & Production build.
