-- Migration 003: Connections, Blocks, Endorsements, and Notifications

CREATE TABLE IF NOT EXISTS connections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  requester_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  where_we_met VARCHAR(200) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pair_key VARCHAR(41) AS (CONCAT(LEAST(requester_id, receiver_id), '_', GREATEST(requester_id, receiver_id))) STORED,
  CONSTRAINT fk_connections_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_connections_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_no_self_connection CHECK (requester_id <> receiver_id),
  CONSTRAINT uq_connection_pair UNIQUE (pair_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS blocks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  blocker_id BIGINT NOT NULL,
  blocked_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id),
  CONSTRAINT uq_block_pair UNIQUE (blocker_id, blocked_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS endorsements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,
  message VARCHAR(300) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_endorsements_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_endorsements_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_endorsements_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CONSTRAINT chk_endorsement_rating CHECK (rating BETWEEN 1 AND 10),
  CONSTRAINT chk_no_self_endorsement CHECK (from_user_id <> to_user_id),
  CONSTRAINT uq_endorsement UNIQUE (from_user_id, to_user_id, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(120) DEFAULT NULL,
  message VARCHAR(300) DEFAULT NULL,
  related_user_id BIGINT DEFAULT NULL,
  related_entity_type VARCHAR(30) DEFAULT NULL,
  related_entity_id BIGINT DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_related_user FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_notifications_user_read (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
