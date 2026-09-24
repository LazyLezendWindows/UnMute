-- Chat reliability, and a minimal moderation foundation.
-- Re-runnable: every structural step checks information_schema first.

-- 1. Messages get a server-assigned sequence: a total order that timestamps (millisecond ties,
--    clock skew) cannot give, and a stable cursor for paging back through history.
--    Existing messages are numbered in their current display order before it becomes AUTO_INCREMENT.
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE messages ADD COLUMN seq BIGINT UNSIGNED NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'seq');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE messages m
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS n FROM messages) ordered ON ordered.id = m.id
SET m.seq = ordered.n
WHERE m.seq IS NULL;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE messages MODIFY seq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, ADD UNIQUE KEY uq_messages_seq (seq)',
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'seq' AND EXTRA LIKE '%auto_increment%');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'CREATE INDEX idx_messages_conv_seq ON messages (conversation_id, seq)', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_messages_conv_seq');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. A client-generated id per message makes sending idempotent: a retry after a dropped
--    connection returns the stored message instead of posting it twice.
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE messages ADD COLUMN client_message_id CHAR(36) NULL, ADD UNIQUE KEY uq_messages_client (conversation_id, sender_id, client_message_id)',
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'client_message_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Staff roles. Granted from the command line (npm run grant-role), never through the API.
SET @sql = (SELECT IF(COUNT(*) = 0,
  "ALTER TABLE users ADD COLUMN role ENUM('member', 'moderator', 'admin') NOT NULL DEFAULT 'member'",
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Reports: a review workflow, the conversation they concern, and an evidence snapshot taken
--    when the report is filed (so it survives message or account deletion).
SET @sql = (SELECT IF(COUNT(*) = 0,
  "ALTER TABLE reports
     MODIFY status ENUM('pending', 'reviewed', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
     ADD COLUMN conversation_id VARCHAR(64) NULL,
     ADD COLUMN evidence MEDIUMTEXT NULL,
     ADD COLUMN reviewed_by VARCHAR(64) NULL,
     ADD COLUMN reviewed_at DATETIME NULL,
     ADD COLUMN resolution_note TEXT NULL,
     ADD INDEX idx_reports_status (status, created_at),
     ADD CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL",
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reports' AND COLUMN_NAME = 'evidence');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Audit trail of every moderation decision. Rows outlive the accounts they mention.
CREATE TABLE IF NOT EXISTS moderation_actions (
  id CHAR(36) PRIMARY KEY,
  moderator_id VARCHAR(64) NULL,
  target_user_id VARCHAR(64) NULL,
  report_id VARCHAR(64) NULL,
  action ENUM('review', 'resolve', 'reject', 'suspend', 'unsuspend') NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_moderation_target (target_user_id, created_at),
  KEY idx_moderation_report (report_id),
  CONSTRAINT fk_moderation_moderator FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_moderation_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_moderation_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
