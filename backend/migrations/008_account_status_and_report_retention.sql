-- Account lifecycle: why an account is not active (the member deactivated it, or a moderator
-- suspended it). `is_active` stays as the flag every visibility query already uses, but becomes
-- derived from `status` so the two can never disagree.
-- Re-runnable: every step checks information_schema first (MySQL has no ADD/DROP ... IF EXISTS).

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE users ADD COLUMN status ENUM(\'active\', \'deactivated\', \'suspended\') NOT NULL DEFAULT \'active\', ADD COLUMN status_changed_at DATETIME NULL DEFAULT NULL',
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Accounts that were already inactive keep that state (as deactivated, the only kind that existed).
UPDATE users SET status = 'deactivated' WHERE is_active = 0 AND status = 'active';

SET @sql = (SELECT IF(COUNT(*) > 0,
  'ALTER TABLE users DROP COLUMN is_active, ADD COLUMN is_active TINYINT(1) AS (status = \'active\') STORED',
  'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'
    AND IFNULL(GENERATION_EXPRESSION, '') = '');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Reports are moderation evidence and must outlive the accounts involved: deleting an account
-- now clears the reference instead of cascading the report away. Constraint names are looked up
-- because databases created before the baseline may name them differently. Dropping and re-adding
-- are separate statements (MariaDB cannot reuse a constraint name within one ALTER).

SET @fk = (SELECT MIN(k.CONSTRAINT_NAME)
  FROM information_schema.KEY_COLUMN_USAGE k
  JOIN information_schema.REFERENTIAL_CONSTRAINTS r
    ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
  WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'reports' AND k.COLUMN_NAME = 'reporter_id'
    AND k.REFERENCED_TABLE_NAME = 'users' AND r.DELETE_RULE <> 'SET NULL');
SET @sql = IF(@fk IS NULL, 'DO 0', CONCAT('ALTER TABLE reports DROP FOREIGN KEY `', @fk, '`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE reports MODIFY reporter_id VARCHAR(64) NULL, ADD CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL',
  'DO 0')
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reports' AND COLUMN_NAME = 'reporter_id' AND REFERENCED_TABLE_NAME = 'users');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT MIN(k.CONSTRAINT_NAME)
  FROM information_schema.KEY_COLUMN_USAGE k
  JOIN information_schema.REFERENTIAL_CONSTRAINTS r
    ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
  WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'reports' AND k.COLUMN_NAME = 'reported_id'
    AND k.REFERENCED_TABLE_NAME = 'users' AND r.DELETE_RULE <> 'SET NULL');
SET @sql = IF(@fk IS NULL, 'DO 0', CONCAT('ALTER TABLE reports DROP FOREIGN KEY `', @fk, '`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
  'ALTER TABLE reports MODIFY reported_id VARCHAR(64) NULL, ADD CONSTRAINT fk_reports_reported FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE SET NULL',
  'DO 0')
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reports' AND COLUMN_NAME = 'reported_id' AND REFERENCED_TABLE_NAME = 'users');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
