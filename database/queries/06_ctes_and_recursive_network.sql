-- ============================================================================
-- SkillLink DBMS Academic Query Suite — Part 6: CTEs & Recursive Graph Traversal (MySQL 8.0+)
-- ============================================================================

-- Query 27: RECURSIVE CTE: Finding Network Connections Within 2 Degrees (Degrees of Separation)
-- Traverses bidirectional graph from a starting user (e.g. User ID 2 - Alice Sharma)
WITH RECURSIVE ConnectionGraph AS (
  -- Anchor Member: 1st Degree Direct Connections
  SELECT
    CASE WHEN c.requester_id = 2 THEN c.receiver_id ELSE c.requester_id END as connected_user_id,
    1 as degree,
    CAST(CONCAT('2->', CASE WHEN c.requester_id = 2 THEN c.receiver_id ELSE c.requester_id END) AS CHAR(200)) as path
  FROM connections c
  WHERE (c.requester_id = 2 OR c.receiver_id = 2)
    AND c.status = 'accepted'

  UNION ALL

  -- Recursive Member: 2nd Degree Connections
  SELECT
    CASE WHEN c2.requester_id = cg.connected_user_id THEN c2.receiver_id ELSE c2.requester_id END as connected_user_id,
    cg.degree + 1 as degree,
    CAST(CONCAT(cg.path, '->', CASE WHEN c2.requester_id = cg.connected_user_id THEN c2.receiver_id ELSE c2.requester_id END) AS CHAR(200)) as path
  FROM connections c2
  JOIN ConnectionGraph cg ON (c2.requester_id = cg.connected_user_id OR c2.receiver_id = cg.connected_user_id)
  WHERE c2.status = 'accepted'
    AND cg.degree < 2
    -- Prevent cycles back to origin
    AND (CASE WHEN c2.requester_id = cg.connected_user_id THEN c2.receiver_id ELSE c2.requester_id END) <> 2
)
SELECT DISTINCT cg.connected_user_id, u.username, u.full_name, u.college, cg.degree, cg.path
FROM ConnectionGraph cg
JOIN users u ON cg.connected_user_id = u.id
ORDER BY cg.degree ASC, u.full_name ASC;

-- Query 28: CTE with Multiple Aggregations: Comprehensive User Profile Completeness Score
WITH UserStats AS (
  SELECT u.id as user_id, u.username, u.full_name,
         COUNT(DISTINCT us.id) as skill_count,
         COUNT(DISTINCT ep.id) as social_links_count,
         COUNT(DISTINCT svc.id) as active_services_count,
         CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 10 THEN 1 ELSE 0 END as has_bio,
         CASE WHEN u.profile_picture IS NOT NULL THEN 1 ELSE 0 END as has_avatar,
         CASE WHEN u.college IS NOT NULL THEN 1 ELSE 0 END as has_college
  FROM users u
  LEFT JOIN user_skills us ON u.id = us.user_id
  LEFT JOIN external_profiles ep ON u.id = ep.user_id
  LEFT JOIN services svc ON svc.user_skill_id = us.id AND svc.is_active = TRUE
  GROUP BY u.id, u.username, u.full_name, u.bio, u.profile_picture, u.college
)
SELECT user_id, username, full_name, skill_count, social_links_count, active_services_count,
       (
         (has_bio * 20) +
         (has_avatar * 20) +
         (has_college * 20) +
         (LEAST(skill_count, 3) * 10) +
         (LEAST(social_links_count, 2) * 5)
       ) as profile_completeness_percentage
FROM UserStats
ORDER BY profile_completeness_percentage DESC;

-- Query 29: CTE + CASE: Complaint Resolution Rate and Turnaround SLA Tracking
WITH ComplaintMetrics AS (
  SELECT
    complaint_type,
    COUNT(*) as total_filed,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as total_resolved,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as total_rejected,
    SUM(CASE WHEN status IN ('open', 'under_review') THEN 1 ELSE 0 END) as total_pending,
    AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) ELSE NULL END) as avg_resolution_hours
  FROM complaints
  GROUP BY complaint_type
)
SELECT
  complaint_type,
  total_filed,
  total_resolved,
  total_rejected,
  total_pending,
  ROUND((total_resolved / total_filed) * 100, 1) as resolution_rate_percent,
  COALESCE(ROUND(avg_resolution_hours, 1), 0) as avg_turnaround_hours
FROM ComplaintMetrics
ORDER BY total_filed DESC;

-- Query 30: CTE: Mutual Connections Count between two specific users
WITH UserA_Connections AS (
  SELECT CASE WHEN requester_id = 2 THEN receiver_id ELSE requester_id END as peer_id
  FROM connections
  WHERE (requester_id = 2 OR receiver_id = 2) AND status = 'accepted'
),
UserB_Connections AS (
  SELECT CASE WHEN requester_id = 4 THEN receiver_id ELSE requester_id END as peer_id
  FROM connections
  WHERE (requester_id = 4 OR receiver_id = 4) AND status = 'accepted'
)
SELECT COUNT(*) as mutual_connections_count
FROM UserA_Connections a
JOIN UserB_Connections b ON a.peer_id = b.peer_id;

-- Query 31: Advanced Audit Trail Analysis (Admin Actions Aggregated by Target Entity Type)
SELECT l.target_type, l.action,
       COUNT(*) as occurrence_count,
       MIN(l.created_at) as first_recorded_at,
       MAX(l.created_at) as latest_recorded_at
FROM admin_audit_logs l
GROUP BY l.target_type, l.action
ORDER BY occurrence_count DESC;

-- Query 32: Helpdesk Ticket SLA Performance by Category and Priority
SELECT c.name as category_name, t.priority,
       COUNT(t.id) as ticket_count,
       SUM(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as closed_count,
       AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at) ELSE NULL END) as avg_resolution_hours
FROM helpdesk_tickets t
JOIN helpdesk_categories c ON t.category_id = c.id
GROUP BY c.name, t.priority
ORDER BY ticket_count DESC;
