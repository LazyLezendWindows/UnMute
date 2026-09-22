-- Unmute Database Schema
-- Compatible with PostgreSQL and SQLite

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  bio TEXT DEFAULT '',
  approximate_location TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  interaction_preferences TEXT DEFAULT '[]',
  is_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interests (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  icon TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  liker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  likee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(liker_id, likee_id)
);

CREATE TABLE IF NOT EXISTS passes (
  id TEXT PRIMARY KEY,
  passer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(passer_id, passee_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  match_id TEXT UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason_category TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_liker ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_likes_likee ON likes(likee_id);
CREATE INDEX IF NOT EXISTS idx_passes_passer ON passes(passer_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_conv_users ON conversations(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
