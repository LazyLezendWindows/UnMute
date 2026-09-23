import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { mariaConnectionOptions } from '../src/config/connection';
import { runMigrations } from '../src/config/migrate';

// A throwaway database shaped like a pre-migration install (credentials on `users`).
const LEGACY_DB = 'unmute_migration_test_db';
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

let conn: mysql.Connection;

async function columns(table: string): Promise<string[]> {
  const [rows] = await conn.query(
    'SELECT column_name AS name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?',
    [LEGACY_DB, table]
  );
  return (rows as { name: string }[]).map((r) => r.name);
}

describe('Schema migrations', () => {
  beforeAll(async () => {
    const admin = await mysql.createConnection(mariaConnectionOptions({ withDatabase: false }));
    await admin.query(`DROP DATABASE IF EXISTS \`${LEGACY_DB}\``);
    await admin.query(`CREATE DATABASE \`${LEGACY_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await admin.end();

    conn = await mysql.createConnection({ ...mariaConnectionOptions(), database: LEGACY_DB, multipleStatements: true });
    // Legacy install: baseline schema only, with credentials stored on users.
    await conn.query(fs.readFileSync(path.join(MIGRATIONS_DIR, '001_baseline.sql'), 'utf-8'));
    await conn.query(
      `CREATE TABLE schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at DATETIME NOT NULL);
       INSERT INTO schema_migrations VALUES ('001_baseline.sql', UTC_TIMESTAMP());
       INSERT INTO users (id, email, google_id, password_hash, is_active, created_at) VALUES
         ('u-pass', 'pass@example.com', NULL, '$2a$12$legacyhashlegacyhashlegacyhashlegacyhashlegacyhash12', 1, '2025-01-01T00:00:00.000Z'),
         ('u-goog', 'goog@example.com', 'google-sub-legacy', NULL, 1, '2025-01-01T00:00:00.000Z');
       INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, created_at, updated_at) VALUES
         ('stale', 'u-pass', 'local', 'pass@example.com', 'x', 'x');`
    );
  });

  afterAll(async () => {
    await conn.query(`DROP DATABASE IF EXISTS \`${LEGACY_DB}\``);
    await conn.end();
  });

  it('moves legacy credentials into auth_accounts and drops them from users', async () => {
    await runMigrations({ database: LEGACY_DB });

    const [accounts] = await conn.query(
      'SELECT user_id, provider, provider_account_id, password_hash FROM auth_accounts ORDER BY provider'
    );
    expect(accounts).toEqual([
      { user_id: 'u-goog', provider: 'google', provider_account_id: 'google-sub-legacy', password_hash: null },
      {
        user_id: 'u-pass',
        provider: 'password',
        provider_account_id: 'u-pass',
        password_hash: '$2a$12$legacyhashlegacyhashlegacyhashlegacyhashlegacyhash12',
      },
    ]);

    const userColumns = await columns('users');
    expect(userColumns).not.toContain('password_hash');
    expect(userColumns).not.toContain('google_id');
  });

  it('records every migration once and is a no-op when re-run', async () => {
    await runMigrations({ database: LEGACY_DB });
    const [rows] = await conn.query('SELECT version FROM schema_migrations ORDER BY version');
    const expected = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    expect((rows as { version: string }[]).map((r) => r.version)).toEqual(expected);
  });

  it('indexes message history by conversation and time', async () => {
    const [rows] = await conn.query(
      `SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = 'messages' AND index_name = 'idx_messages_conv'`,
      [LEGACY_DB]
    );
    expect((rows as { cols: string }[])[0].cols).toBe('conversation_id,created_at');
  });
});
