-- Chat requests: a conversation can now start as a request that the recipient must approve.
-- The existing conversations table carries the lifecycle (one row per pair of members), so
-- messages, read state and moderation evidence keep working unchanged. Conversations created by a
-- mutual like, and every existing conversation, are 'accepted'.
-- Blocking is not a status here: it stays in `blocks` (the single source of truth) and hides the
-- conversation in both directions; a block also closes any pending request.
-- Re-runnable: every structural step checks information_schema first.

-- 1. One conversation per pair: user_a_id < user_b_id, as the app has always written them.
--    Normalise any legacy row stored the other way round (via a derived table, because MySQL
--    assigns SET columns left to right and a plain swap would copy one value over the other).
UPDATE conversations c
JOIN (SELECT id, user_a_id AS a, user_b_id AS b FROM conversations WHERE user_a_id > user_b_id) s ON s.id = c.id
SET c.user_a_id = s.b, c.user_b_id = s.a;

-- 2. Request lifecycle columns.
SET @sql = (SELECT IF(COUNT(*) = 0,
  "ALTER TABLE conversations
     ADD COLUMN status ENUM('pending', 'accepted', 'declined', 'cancelled') NOT NULL DEFAULT 'accepted',
     ADD COLUMN requester_id VARCHAR(64) NULL,
     ADD COLUMN recipient_id VARCHAR(64) NULL,
     ADD COLUMN requested_at DATETIME(3) NULL,
     ADD COLUMN responded_at DATETIME(3) NULL,
     ADD COLUMN declined_at DATETIME(3) NULL",
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. The pair is unique, so concurrent requests, matches and acceptances converge on one row.
--    If duplicate pairs exist this fails loudly (they must be merged by hand) rather than guessing.
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE conversations ADD UNIQUE KEY uq_conversations_pair (user_a_id, user_b_id)', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND INDEX_NAME = 'uq_conversations_pair');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Inbox queries: a member's incoming requests, and the requests they sent.
SET @sql = (SELECT IF(COUNT(*) = 0, 'CREATE INDEX idx_conversations_incoming ON conversations (recipient_id, status, requested_at)', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND INDEX_NAME = 'idx_conversations_incoming');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'CREATE INDEX idx_conversations_sent ON conversations (requester_id, status, requested_at)', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND INDEX_NAME = 'idx_conversations_sent');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE conversations
     ADD CONSTRAINT fk_conv_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
     ADD CONSTRAINT fk_conv_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE',
  'DO 0')
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND CONSTRAINT_NAME = 'fk_conv_requester');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Request history (match_id is already nullable: requests have no match).: every transition is recorded, and survives the request changing state
--    again (a new request after a decline). Deleted with the conversation (i.e. with an account);
--    moderation keeps its own evidence snapshot in reports.
CREATE TABLE IF NOT EXISTS conversation_events (
  id CHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  actor_id VARCHAR(64) NULL,
  event ENUM('requested', 'accepted', 'declined', 'cancelled', 'blocked', 'matched') NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_conversation_events_conv (conversation_id, created_at),
  CONSTRAINT fk_conv_events_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_events_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
