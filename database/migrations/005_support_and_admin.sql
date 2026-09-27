-- Migration 005: Complaints, Reports, Helpdesk, Help Articles, and Admin Audit Logs

CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  complainant_id BIGINT NOT NULL,
  reported_user_id BIGINT DEFAULT NULL,
  complaint_type ENUM('user', 'service', 'booking', 'review', 'connection', 'privacy', 'technical', 'other') NOT NULL,
  service_id BIGINT DEFAULT NULL,
  booking_id BIGINT DEFAULT NULL,
  review_id BIGINT DEFAULT NULL,
  subject VARCHAR(150) NOT NULL,
  description VARCHAR(3000) NOT NULL,
  status ENUM('open', 'under_review', 'resolved', 'rejected', 'withdrawn') NOT NULL DEFAULT 'open',
  priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  assigned_admin_id BIGINT DEFAULT NULL,
  admin_response VARCHAR(2000) DEFAULT NULL,
  resolution_note VARCHAR(2000) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_complaints_complainant FOREIGN KEY (complainant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_complaints_reported_user FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_complaints_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_complaints_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  CONSTRAINT fk_complaints_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL,
  CONSTRAINT fk_complaints_admin FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_priority (priority),
  INDEX idx_complaints_admin (assigned_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reporter_id BIGINT NOT NULL,
  reported_user_id BIGINT DEFAULT NULL,
  content_type ENUM('profile', 'service', 'booking', 'review', 'endorsement', 'other') NOT NULL,
  content_id BIGINT DEFAULT NULL,
  reason ENUM('spam', 'fake_profile', 'harassment', 'inappropriate_content', 'misleading_service', 'suspicious_activity', 'other') NOT NULL,
  description VARCHAR(1000) DEFAULT NULL,
  status ENUM('pending', 'reviewing', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
  resolved_by BIGINT DEFAULT NULL,
  resolution_note VARCHAR(1000) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reports_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS helpdesk_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci UNIQUE NOT NULL,
  description VARCHAR(200) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS helpdesk_tickets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  subject VARCHAR(150) NOT NULL,
  description VARCHAR(3000) NOT NULL,
  status ENUM('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  assigned_admin_id BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_helpdesk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_helpdesk_category FOREIGN KEY (category_id) REFERENCES helpdesk_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_helpdesk_admin FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_helpdesk_status (status),
  INDEX idx_helpdesk_admin (assigned_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS helpdesk_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  message VARCHAR(3000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_helpdesk_msg_ticket FOREIGN KEY (ticket_id) REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_helpdesk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS helpdesk_attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  message_id BIGINT DEFAULT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  uploaded_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES helpdesk_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_attachments_message FOREIGN KEY (message_id) REFERENCES helpdesk_messages(id) ON DELETE SET NULL,
  CONSTRAINT fk_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS help_articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci UNIQUE NOT NULL,
  category VARCHAR(60) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  author_id BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_articles_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT NOT NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id BIGINT DEFAULT NULL,
  reason VARCHAR(500) DEFAULT NULL,
  old_data JSON DEFAULT NULL,
  new_data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
