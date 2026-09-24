-- Timestamps stored as ISO-8601 text become DATETIME(3) (UTC, millisecond precision), so the
-- database validates them, compares them chronologically and supports date arithmetic.
-- In place, so existing indexes on these columns survive:
--   1. '2026-09-24T04:44:02.915Z' is rewritten to '2026-09-24 04:44:02.915' (only rows still in ISO form);
--   2. a value that is not a timestamp at all (never written by the app) becomes the migration time,
--      because these columns are NOT NULL (last_message_at, which is nullable, becomes NULL);
--   3. the column type changes. A well-formed but impossible value (e.g. 2026-02-31) fails loudly here.
-- Re-runnable: steps 1-2 match nothing once converted, and step 3 only runs on a VARCHAR column.
-- The application writes these columns as 'YYYY-MM-DD HH:MM:SS.fff' UTC (see utils/time.ts).

-- users.created_at
UPDATE users SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE users SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE users MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- auth_accounts.created_at
UPDATE auth_accounts SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE auth_accounts SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE auth_accounts MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_accounts' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- auth_accounts.updated_at
UPDATE auth_accounts SET updated_at = REPLACE(REPLACE(updated_at, 'T', ' '), 'Z', '') WHERE updated_at LIKE '____-__-__T%';
UPDATE auth_accounts SET updated_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE updated_at IS NOT NULL AND updated_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE auth_accounts MODIFY updated_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_accounts' AND COLUMN_NAME = 'updated_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- profiles.created_at
UPDATE profiles SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE profiles SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE profiles MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- profiles.updated_at
UPDATE profiles SET updated_at = REPLACE(REPLACE(updated_at, 'T', ' '), 'Z', '') WHERE updated_at LIKE '____-__-__T%';
UPDATE profiles SET updated_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE updated_at IS NOT NULL AND updated_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE profiles MODIFY updated_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'updated_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- likes.created_at
UPDATE likes SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE likes SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE likes MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'likes' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- passes.created_at
UPDATE passes SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE passes SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE passes MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'passes' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- matches.created_at
UPDATE matches SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE matches SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE matches MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- conversations.created_at
UPDATE conversations SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE conversations SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE conversations MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- conversations.last_message_at
UPDATE conversations SET last_message_at = REPLACE(REPLACE(last_message_at, 'T', ' '), 'Z', '') WHERE last_message_at LIKE '____-__-__T%';
UPDATE conversations SET last_message_at = NULL
  WHERE last_message_at IS NOT NULL AND last_message_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE conversations MODIFY last_message_at DATETIME(3) NULL DEFAULT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'last_message_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- messages.created_at
UPDATE messages SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE messages SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE messages MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- blocks.created_at
UPDATE blocks SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE blocks SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE blocks MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blocks' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- reports.created_at
UPDATE reports SET created_at = REPLACE(REPLACE(created_at, 'T', ' '), 'Z', '') WHERE created_at LIKE '____-__-__T%';
UPDATE reports SET created_at = DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%d %H:%i:%s.%f')
  WHERE created_at IS NOT NULL AND created_at NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}';
SET @sql = (SELECT IF(COUNT(*) > 0, 'ALTER TABLE reports MODIFY created_at DATETIME(3) NOT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reports' AND COLUMN_NAME = 'created_at' AND DATA_TYPE = 'varchar');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- conversation_members was created by the baseline but never read or written by the application
-- (membership is conversations.user_a_id / user_b_id). Its rows are derivable from conversations.
DROP TABLE IF EXISTS conversation_members;
