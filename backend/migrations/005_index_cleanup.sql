-- Converge indexes between databases created before and after the baseline migration.
-- MySQL has no CREATE/DROP INDEX IF [NOT] EXISTS, so each change runs only when information_schema
-- says it is needed.

-- Message history is always read per conversation in time order.
SET @sql = (SELECT IF(COUNT(*) = 0, 'CREATE INDEX idx_messages_conv ON messages (conversation_id, created_at)', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_messages_conv');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) > 0, 'DROP INDEX fk_msg_conv ON messages', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'fk_msg_conv');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Redundant: each is a leftmost prefix of the table's unique key (which also serves the foreign key).
SET @sql = (SELECT IF(COUNT(*) > 0, 'DROP INDEX idx_likes_liker ON likes', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'likes' AND INDEX_NAME = 'idx_likes_liker');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) > 0, 'DROP INDEX idx_passes_passer ON passes', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'passes' AND INDEX_NAME = 'idx_passes_passer');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) > 0, 'DROP INDEX idx_matches_users ON matches', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND INDEX_NAME = 'idx_matches_users');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) > 0, 'DROP INDEX idx_blocks_blocker ON blocks', 'DO 0')
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blocks' AND INDEX_NAME = 'idx_blocks_blocker');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
