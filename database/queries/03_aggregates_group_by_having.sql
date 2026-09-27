-- ============================================================================
-- SkillLink DBMS Academic Query Suite — Part 3: Aggregates, GROUP BY & HAVING
-- ============================================================================

-- Query 11: Top 5 most connected users (counting bidirectional accepted connections)
SELECT u.id, u.username, u.full_name, u.college,
       COUNT(c.id) as total_accepted_connections
FROM users u
JOIN connections c ON (u.id = c.requester_id OR u.id = c.receiver_id)
WHERE c.status = 'accepted'
GROUP BY u.id, u.username, u.full_name, u.college
ORDER BY total_accepted_connections DESC
LIMIT 5;

-- Query 12: Most popular skills ranked by user adoption and peer endorsements
SELECT s.id, s.name, s.category,
       COUNT(DISTINCT us.user_id) as total_users_with_skill,
       COUNT(DISTINCT e.id) as total_endorsements_received,
       COALESCE(AVG(e.rating), 0) as avg_endorsement_rating
FROM skills s
LEFT JOIN user_skills us ON s.id = us.skill_id
LEFT JOIN endorsements e ON s.id = e.skill_id
GROUP BY s.id, s.name, s.category
ORDER BY total_endorsements_received DESC, total_users_with_skill DESC;

-- Query 13: Providers with the most completed bookings & total cash volume delivered
SELECT u.id as provider_id, u.username, u.full_name,
       COUNT(b.id) as completed_bookings_count,
       SUM(b.price) as total_cash_volume_inr,
       AVG(b.price) as avg_booking_price
FROM users u
JOIN bookings b ON u.id = b.provider_id
WHERE b.status = 'completed'
GROUP BY u.id, u.username, u.full_name
ORDER BY completed_bookings_count DESC, total_cash_volume_inr DESC;

-- Query 14: Average Star Rating per Service with HAVING clause filter (min 1 review)
SELECT svc.id as service_id, svc.title as service_title, svc.category,
       u.full_name as provider_name,
       COUNT(r.id) as review_count,
       AVG(r.rating) as average_star_rating,
       MIN(r.rating) as lowest_rating,
       MAX(r.rating) as highest_rating
FROM services svc
JOIN user_skills us ON svc.user_skill_id = us.id
JOIN users u ON us.user_id = u.id
JOIN bookings b ON b.service_id = svc.id
JOIN reviews r ON r.booking_id = b.id
GROUP BY svc.id, svc.title, svc.category, u.full_name
HAVING COUNT(r.id) >= 1
ORDER BY average_star_rating DESC;

-- Query 15: Monthly Booking Growth & Volume (Date Aggregation using DATE_FORMAT)
SELECT DATE_FORMAT(booking_date, '%Y-%m') as booking_month,
       COUNT(*) as total_bookings,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
       SUM(price) as total_volume_inr
FROM bookings
GROUP BY DATE_FORMAT(booking_date, '%Y-%m')
ORDER BY booking_month ASC;

-- Query 16: Admin Workload Distribution (Resolved complaints, reports, and tickets per admin)
SELECT adm.id as admin_id, adm.username, adm.full_name,
       COUNT(DISTINCT c.id) as resolved_complaints,
       COUNT(DISTINCT r.id) as resolved_reports,
       COUNT(DISTINCT t.id) as resolved_tickets,
       (COUNT(DISTINCT c.id) + COUNT(DISTINCT r.id) + COUNT(DISTINCT t.id)) as total_actions_completed
FROM users adm
LEFT JOIN complaints c ON adm.id = c.assigned_admin_id AND c.status = 'resolved'
LEFT JOIN reports r ON adm.id = r.resolved_by AND r.status IN ('resolved', 'dismissed')
LEFT JOIN helpdesk_tickets t ON adm.id = t.assigned_admin_id AND t.status IN ('resolved', 'closed')
WHERE adm.role = 'admin'
GROUP BY adm.id, adm.username, adm.full_name
ORDER BY total_actions_completed DESC;
