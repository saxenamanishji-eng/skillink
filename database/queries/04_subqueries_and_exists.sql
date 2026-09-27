-- ============================================================================
-- SkillLink DBMS Academic Query Suite — Part 4: Subqueries & EXISTS
-- ============================================================================

-- Query 17: Scalar Subquery: Services priced above the platform average service price
SELECT svc.id, svc.title, svc.category, svc.price,
       (SELECT AVG(price) FROM services WHERE is_active = TRUE) as platform_avg_price,
       (svc.price - (SELECT AVG(price) FROM services WHERE is_active = TRUE)) as price_difference
FROM services svc
WHERE svc.is_active = TRUE
  AND svc.price > (SELECT AVG(price) FROM services WHERE is_active = TRUE)
ORDER BY svc.price DESC;

-- Query 18: Correlated Subquery: Users with higher skill proficiency than their college average
SELECT u.id as user_id, u.full_name, u.college, s.name as skill_name, us.proficiency,
       (
         SELECT AVG(us2.proficiency)
         FROM user_skills us2
         JOIN users u2 ON us2.user_id = u2.id
         WHERE u2.college = u.college AND us2.skill_id = us.skill_id
       ) as college_avg_skill_proficiency
FROM users u
JOIN user_skills us ON u.id = us.user_id
JOIN skills s ON us.skill_id = s.id
WHERE u.college IS NOT NULL
  AND us.proficiency > (
    SELECT AVG(us2.proficiency)
    FROM user_skills us2
    JOIN users u2 ON us2.user_id = u2.id
    WHERE u2.college = u.college AND us2.skill_id = us.skill_id
  )
ORDER BY u.college, s.name;

-- Query 19: EXISTS: Users who have both active bookable services AND at least one accepted connection
SELECT u.id, u.username, u.full_name, u.college
FROM users u
WHERE u.status = 'active'
  AND EXISTS (
    SELECT 1 FROM user_skills us
    JOIN services svc ON svc.user_skill_id = us.id
    WHERE us.user_id = u.id AND svc.is_active = TRUE
  )
  AND EXISTS (
    SELECT 1 FROM connections c
    WHERE (c.requester_id = u.id OR c.receiver_id = u.id) AND c.status = 'accepted'
  );

-- Query 20: NOT EXISTS: Master skills that have never been added by any student (Unadopted skills)
SELECT s.id, s.name, s.category, s.description
FROM skills s
WHERE NOT EXISTS (
  SELECT 1 FROM user_skills us WHERE us.skill_id = s.id
);

-- Query 21: Most Reported Users with Aggregated Policy Infractions Subquery
SELECT u.id as reported_user_id, u.username, u.full_name, u.status as account_status,
       COUNT(r.id) as total_reports_received,
       (SELECT COUNT(*) FROM complaints c WHERE c.reported_user_id = u.id) as total_complaints_received
FROM users u
JOIN reports r ON u.id = r.reported_user_id
GROUP BY u.id, u.username, u.full_name, u.status
HAVING COUNT(r.id) >= 1
ORDER BY total_reports_received DESC;
