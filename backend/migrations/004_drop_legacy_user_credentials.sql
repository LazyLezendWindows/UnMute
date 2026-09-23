-- Credentials now live exclusively in auth_accounts (002 moved Google links, 003 moved passwords).
-- status/updated_at only exist on databases that ran an unreleased experiment; nothing reads them.
ALTER TABLE users
  DROP COLUMN IF EXISTS google_id,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS updated_at;
