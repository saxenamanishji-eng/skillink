-- ============================================================================
-- SkillLink DBMS Academic Query Suite — Part 1: Basic & Filtering Queries
-- ============================================================================

-- Query 1: Active user profiles with graduation year and location filtering
SELECT id, username, full_name, college, branch, graduation_year, location
FROM users
WHERE status = 'active'
  AND (graduation_year >= 2025 OR graduation_year IS NULL)
ORDER BY college ASC, full_name ASC;

-- Query 2: Case-insensitive username lookup demonstrating utf8mb4_0900_ai_ci collation
SELECT id, username, full_name, email, role, status
FROM users
WHERE username = 'ALICE_TECH';

-- Query 3: Search bookable services with price range and duration filters
SELECT id, title, category, pricing_type, price, currency, duration_minutes, online_available, in_person_available
FROM services
WHERE is_active = TRUE
  AND price BETWEEN 200.00 AND 1000.00
  AND online_available = TRUE
ORDER BY price ASC;

-- Query 4: Bookings scheduled within a future date range using pattern and comparison
SELECT id, service_id, customer_id, provider_id, booking_date, start_time, end_time, mode, status, price
FROM bookings
WHERE booking_date >= CURRENT_DATE
  AND status IN ('pending', 'confirmed')
ORDER BY booking_date ASC, start_time ASC;

-- Query 5: Help articles published by specific category with search term filtering
SELECT id, title, slug, category, published_at
FROM help_articles
WHERE status = 'published'
  AND (title LIKE '%QR%' OR content LIKE '%QR%')
ORDER BY published_at DESC;
