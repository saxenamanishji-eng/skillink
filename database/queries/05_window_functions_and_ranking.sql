-- ============================================================================
-- SkillLink DBMS Academic Query Suite — Part 5: Window Functions & Ranking (MySQL 8.0+)
-- ============================================================================

-- Query 22: ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...): Top 2 highest-proficiency students per skill category
WITH RankedStudents AS (
  SELECT s.category as skill_category, s.name as skill_name,
         u.full_name as student_name, u.college, us.proficiency,
         ROW_NUMBER() OVER (
           PARTITION BY s.category
           ORDER BY us.proficiency DESC, u.created_at ASC
         ) as row_num
  FROM user_skills us
  JOIN skills s ON us.skill_id = s.id
  JOIN users u ON us.user_id = u.id
  WHERE u.status = 'active'
)
SELECT skill_category, skill_name, student_name, college, proficiency, row_num
FROM RankedStudents
WHERE row_num <= 2
ORDER BY skill_category ASC, row_num ASC;

-- Query 23: DENSE_RANK() OVER: Peer endorsement leaderboard with tied positions
SELECT u.id as user_id, u.full_name, u.college,
       COUNT(e.id) as total_endorsements,
       AVG(e.rating) as avg_rating,
       DENSE_RANK() OVER (ORDER BY COUNT(e.id) DESC, AVG(e.rating) DESC) as platform_rank
FROM users u
JOIN endorsements e ON u.id = e.to_user_id
GROUP BY u.id, u.full_name, u.college
ORDER BY platform_rank ASC;

-- Query 24: RANK() OVER (PARTITION BY ...): Service pricing ranking within each service category
SELECT svc.id, svc.category, svc.title, svc.price, u.full_name as provider_name,
       RANK() OVER (
         PARTITION BY svc.category
         ORDER BY svc.price DESC
       ) as price_rank_in_category
FROM services svc
JOIN user_skills us ON svc.user_skill_id = us.id
JOIN users u ON us.user_id = u.id
WHERE svc.is_active = TRUE
ORDER BY svc.category, price_rank_in_category ASC;

-- Query 25: Running Cumulative Booking Volume in INR over time using SUM() OVER ()
SELECT b.id as booking_id, b.booking_date, b.price, b.status,
       SUM(b.price) OVER (
         ORDER BY b.booking_date ASC, b.id ASC
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) as cumulative_revenue_volume_inr
FROM bookings b
WHERE b.status = 'completed'
ORDER BY b.booking_date ASC, b.id ASC;

-- Query 26: Complaint Resolution Performance with Turnaround Window Metrics
SELECT c.id as complaint_id, c.subject, c.status, c.priority,
       TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at) as resolution_hours,
       AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)) OVER (
         PARTITION BY c.priority
       ) as avg_priority_resolution_hours
FROM complaints c
WHERE c.resolved_at IS NOT NULL
ORDER BY resolution_hours ASC;
