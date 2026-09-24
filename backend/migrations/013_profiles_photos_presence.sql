-- Richer profiles and chats: profession, several photos, online status, photos in chat.
-- Re-runnable: every structural step checks information_schema first.

-- 1. Profession (optional, shown on cards) and whether others may see when you are online.
SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE profiles
     ADD COLUMN profession VARCHAR(80) NOT NULL DEFAULT \'\',
     ADD COLUMN show_online TINYINT(1) NOT NULL DEFAULT 1',
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'profession');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. When the member was last connected (for "Active 2h ago").
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE users ADD COLUMN last_seen_at DATETIME(3) NULL DEFAULT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_seen_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Up to six uploaded photos per member; position 0 is the main photo (mirrored in
--    profiles.avatar_url, which everything that shows a single photo already reads).
CREATE TABLE IF NOT EXISTS user_photos (
  id CHAR(36) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  url VARCHAR(500) NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_user_photos_position (user_id, position),
  CONSTRAINT fk_user_photos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Photos uploaded before this migration (one per member) become that member's main photo.
INSERT INTO user_photos (id, user_id, url, position, created_at)
SELECT UUID(), p.user_id, p.avatar_url, 0, UTC_TIMESTAMP(3)
FROM profiles p
WHERE p.avatar_url LIKE 'https://res.cloudinary.com/%/unmute/avatars/%'
  AND NOT EXISTS (SELECT 1 FROM user_photos up WHERE up.user_id = p.user_id);

-- 4. A photo attached to a message (the text may then be empty).
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE messages ADD COLUMN attachment_url VARCHAR(500) NULL DEFAULT NULL', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'attachment_url');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
