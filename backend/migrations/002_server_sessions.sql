-- Server-side sessions: an opaque random token lives only in an HttpOnly cookie;
-- the database stores its SHA-256 hash so a leaked table cannot be replayed.
-- Pre-existing session rows came from the stateless-JWT era and drifted schemas; they are discarded
-- (the only effect is that existing sign-ins must sign in again).
DROP TABLE IF EXISTS sessions;

CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  last_used_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  INDEX idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Google identities move from users.google_id to auth_accounts (provider-agnostic identity links).
INSERT IGNORE INTO auth_accounts (id, user_id, provider, provider_account_id, created_at, updated_at)
SELECT UUID(), id, 'google', google_id, created_at, created_at
FROM users
WHERE google_id IS NOT NULL AND google_id <> '';
