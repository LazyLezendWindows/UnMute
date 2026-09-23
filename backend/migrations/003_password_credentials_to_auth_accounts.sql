-- Password credentials move from users.password_hash into auth_accounts (provider 'password',
-- keyed by user id so an email change never orphans the credential). users keeps only identity data.
-- Re-runnable: rows are rebuilt from users.password_hash, which stays authoritative until 004 drops it.
-- 'local' rows are leftovers from an unreleased experiment and were never read by the application.
DELETE FROM auth_accounts WHERE provider IN ('local', 'password');

INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, password_hash, created_at, updated_at)
SELECT UUID(), id, 'password', id, password_hash, created_at, created_at
FROM users
WHERE password_hash IS NOT NULL AND password_hash <> '';
