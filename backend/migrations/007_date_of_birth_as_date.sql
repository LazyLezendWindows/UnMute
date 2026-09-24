-- Dates of birth become a real DATE so the database itself rejects impossible values (2000-02-31).
-- Existing values are already YYYY-MM-DD strings. In strict SQL mode (the MySQL/MariaDB default) an
-- invalid stored value makes this migration fail loudly instead of being silently coerced; fix that
-- row by hand, then restart. Re-running on an already-converted column is a no-op.
ALTER TABLE profiles MODIFY date_of_birth DATE NOT NULL;
