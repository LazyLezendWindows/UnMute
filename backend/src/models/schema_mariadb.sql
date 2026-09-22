-- Unmute MariaDB Schema

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  date_of_birth VARCHAR(20) NOT NULL,
  bio TEXT,
  approximate_location VARCHAR(100) DEFAULT '',
  avatar_url VARCHAR(500) DEFAULT '',
  interaction_preferences TEXT,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interests (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_interests (
  user_id VARCHAR(64) NOT NULL,
  interest_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (user_id, interest_id),
  CONSTRAINT fk_ui_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ui_interest FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS likes (
  id VARCHAR(64) PRIMARY KEY,
  liker_id VARCHAR(64) NOT NULL,
  likee_id VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_likes (liker_id, likee_id),
  CONSTRAINT fk_likes_liker FOREIGN KEY (liker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_likee FOREIGN KEY (likee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS passes (
  id VARCHAR(64) PRIMARY KEY,
  passer_id VARCHAR(64) NOT NULL,
  passee_id VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_passes (passer_id, passee_id),
  CONSTRAINT fk_passes_passer FOREIGN KEY (passer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_passes_passee FOREIGN KEY (passee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matches (
  id VARCHAR(64) PRIMARY KEY,
  user_a_id VARCHAR(64) NOT NULL,
  user_b_id VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_matches (user_a_id, user_b_id),
  CONSTRAINT fk_matches_a FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_b FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  match_id VARCHAR(64) UNIQUE,
  user_a_id VARCHAR(64) NOT NULL,
  user_b_id VARCHAR(64) NOT NULL,
  last_message_at VARCHAR(64),
  created_at VARCHAR(64) NOT NULL,
  CONSTRAINT fk_conv_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_user_a FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_user_b FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at VARCHAR(64) NOT NULL,
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blocks (
  id VARCHAR(64) PRIMARY KEY,
  blocker_id VARCHAR(64) NOT NULL,
  blocked_id VARCHAR(64) NOT NULL,
  reason VARCHAR(255) DEFAULT '',
  created_at VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_blocks (blocker_id, blocked_id),
  CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  reporter_id VARCHAR(64) NOT NULL,
  reported_id VARCHAR(64) NOT NULL,
  reason_category VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at VARCHAR(64) NOT NULL,
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reported FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token TEXT NOT NULL,
  expires_at VARCHAR(64) NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
