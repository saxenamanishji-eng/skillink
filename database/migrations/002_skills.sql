-- Migration 002: Skills, User Skills, and External Profiles

CREATE TABLE IF NOT EXISTS skills (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci UNIQUE NOT NULL,
  description VARCHAR(300) DEFAULT NULL,
  category VARCHAR(40) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_skills (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  proficiency TINYINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CONSTRAINT chk_proficiency_range CHECK (proficiency BETWEEN 1 AND 10),
  CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS external_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  platform ENUM('linkedin', 'github', 'instagram', 'portfolio', 'x') NOT NULL,
  username VARCHAR(100) DEFAULT NULL,
  profile_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_external_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_profile_url_https CHECK (profile_url REGEXP '^https://'),
  CONSTRAINT uq_user_platform UNIQUE (user_id, platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
