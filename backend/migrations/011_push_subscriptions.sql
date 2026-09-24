-- Web Push: one browser push subscription per signed-in session.
-- Tying a subscription to its session means signing out (or any session revocation) stops the
-- notifications for that device, and a browser that another member later signs into on the same
-- device never receives the previous member's notifications (the endpoint is unique).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  session_id CHAR(36) NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_push_endpoint (endpoint_hash),
  UNIQUE KEY uq_push_session (session_id),
  KEY idx_push_user (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_push_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
