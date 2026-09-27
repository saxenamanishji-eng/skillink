-- ============================================================================
-- SkillLink DBMS Academic Query Suite — Part 2: Joins & Relational Graphs
-- ============================================================================

-- Query 6: INNER JOIN: User profiles with listed skills and proficiency ratings
SELECT u.id as user_id, u.username, u.full_name, u.college,
       s.name as skill_name, s.category as skill_category, us.proficiency
FROM users u
INNER JOIN user_skills us ON u.id = us.user_id
INNER JOIN skills s ON us.skill_id = s.id
ORDER BY u.full_name ASC, us.proficiency DESC;

-- Query 7: MULTI-TABLE JOIN: Detailed bookings with customer, provider, service, and skill info
SELECT b.id as booking_id, b.booking_date, b.start_time, b.end_time, b.mode, b.status, b.price,
       cust.username as customer_username, cust.full_name as customer_name,
       prov.username as provider_username, prov.full_name as provider_name,
       svc.title as service_title, s.name as skill_name
FROM bookings b
JOIN users cust ON b.customer_id = cust.id
JOIN users prov ON b.provider_id = prov.id
JOIN services svc ON b.service_id = svc.id
JOIN user_skills us ON svc.user_skill_id = us.id
JOIN skills s ON us.skill_id = s.id
ORDER BY b.booking_date DESC;

-- Query 8: LEFT JOIN with COALESCE: User profiles with external social links (handling NULLs)
SELECT u.id, u.username, u.full_name,
       COALESCE(MAX(CASE WHEN ep.platform = 'github' THEN ep.profile_url END), 'Not Linked') as github_url,
       COALESCE(MAX(CASE WHEN ep.platform = 'linkedin' THEN ep.profile_url END), 'Not Linked') as linkedin_url,
       COALESCE(MAX(CASE WHEN ep.platform = 'portfolio' THEN ep.profile_url END), 'Not Linked') as portfolio_url
FROM users u
LEFT JOIN external_profiles ep ON u.id = ep.user_id
GROUP BY u.id, u.username, u.full_name
ORDER BY u.id ASC;

-- Query 9: SELF JOIN: Bidirectional peer network connections
SELECT c.id as connection_id, c.status, c.where_we_met,
       u1.username as requester_username, u1.full_name as requester_name,
       u2.username as receiver_username, u2.full_name as receiver_name
FROM connections c
JOIN users u1 ON c.requester_id = u1.id
JOIN users u2 ON c.receiver_id = u2.id
ORDER BY c.created_at DESC;

-- Query 10: 3-WAY LEFT JOIN: Booking reviews linked to service providers and customer reviewers
SELECT b.id as booking_id, svc.title as service_title,
       cust.full_name as reviewer_name, prov.full_name as provider_name,
       r.rating, r.comment, r.created_at as review_date
FROM reviews r
JOIN bookings b ON r.booking_id = b.id
JOIN services svc ON b.service_id = svc.id
JOIN users cust ON r.reviewer_id = cust.id
JOIN users prov ON r.provider_id = prov.id
ORDER BY r.rating DESC, r.created_at DESC;
