-- Migration 004: Services, Availability Schedules, Bookings, and Reviews

CREATE TABLE IF NOT EXISTS services (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_skill_id BIGINT UNIQUE NOT NULL,
  category ENUM(
    'Tutoring', 'Consulting', 'Freelancing', 'Mentoring',
    'Design', 'Development', 'Photography', 'Writing',
    'Music', 'Fitness', 'Academic Help', 'Other'
  ) NOT NULL DEFAULT 'Other',
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  pricing_type ENUM('hourly', 'per_session', 'fixed_project') NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  duration_minutes SMALLINT DEFAULT NULL,
  online_available BOOLEAN DEFAULT TRUE,
  in_person_available BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_user_skill FOREIGN KEY (user_skill_id) REFERENCES user_skills(id) ON DELETE CASCADE,
  CONSTRAINT chk_service_price CHECK (price >= 0),
  CONSTRAINT chk_service_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  CONSTRAINT chk_service_availability_mode CHECK (online_available = TRUE OR in_person_available = TRUE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS availability (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  provider_id BIGINT NOT NULL,
  day_of_week TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_availability_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT chk_availability_time CHECK (end_time > start_time),
  CONSTRAINT uq_provider_slot UNIQUE (provider_id, day_of_week, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  service_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  mode ENUM('online', 'in_person') NOT NULL,
  status ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  notes VARCHAR(500) DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL DEFAULT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_booking_price CHECK (price >= 0),
  CONSTRAINT chk_no_self_booking CHECK (customer_id <> provider_id),
  CONSTRAINT chk_booking_time_order CHECK (end_time > start_time),
  INDEX idx_provider_booking_slot (provider_id, booking_date, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNIQUE NOT NULL,
  reviewer_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,
  comment VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
