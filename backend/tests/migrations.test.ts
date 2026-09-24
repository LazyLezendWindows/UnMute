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
         ('u-goog', 'goog@example.com', 'google-sub-legacy', NULL, 1, '2025-01-01T00:00:00.000Z'),
         ('u-off', 'off@example.com', NULL, NULL, 0, '2025-01-01T00:00:00.000Z');
       INSERT INTO profiles (id, user_id, display_name, date_of_birth, created_at, updated_at) VALUES
         ('p-pass', 'u-pass', 'Legacy', '1996-02-29', 'x', 'x');
       INSERT INTO reports (id, reporter_id, reported_id, reason_category, details, status, created_at) VALUES
         ('r-1', 'u-pass', 'u-goog', 'Spam', 'legacy evidence', 'pending', 'x');
       INSERT INTO matches (id, user_a_id, user_b_id, created_at) VALUES ('m-1', 'u-pass', 'u-off', 'x');
       INSERT INTO conversations (id, match_id, user_a_id, user_b_id, created_at) VALUES ('c-1', 'm-1', 'u-pass', 'u-off', 'x');
       INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES
         ('zz-first', 'c-1', 'u-pass', 'first', '2025-01-01T10:00:00.000Z'),
         ('mm-second', 'c-1', 'u-off', 'second', '2025-01-01T10:00:01.000Z'),
         ('aa-third', 'c-1', 'u-pass', 'third', '2025-01-01T10:00:02.000Z');
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
    // Runs every migration against the legacy schema; MySQL's DDL is slower than MariaDB's.
  }, 30_000);

  it('records every migration once and is a no-op when re-run', async () => {
    await runMigrations({ database: LEGACY_DB });
    const [rows] = await conn.query('SELECT version FROM schema_migrations ORDER BY version');
    const expected = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    expect((rows as { version: string }[]).map((r) => r.version)).toEqual(expected);
  });

  it('keeps legacy account state, dates of birth and reports through the lifecycle migrations', async () => {
    const [users] = await conn.query('SELECT id, status, is_active FROM users ORDER BY id');
    expect(users).toEqual([
      { id: 'u-goog', status: 'active', is_active: 1 },
      { id: 'u-off', status: 'deactivated', is_active: 0 },
      { id: 'u-pass', status: 'active', is_active: 1 },
    ]);

    const [dob] = await conn.query(
      "SELECT data_type AS type FROM information_schema.columns WHERE table_schema = ? AND table_name = 'profiles' AND column_name = 'date_of_birth'",
      [LEGACY_DB]
    );
    expect((dob as { type: string }[])[0].type.toLowerCase()).toBe('date');

    // Deleting an account keeps the report as moderation evidence.
    await conn.query("DELETE FROM users WHERE id = 'u-goog'");
    const [reports] = await conn.query("SELECT reporter_id, reported_id, details FROM reports WHERE id = 'r-1'");
    expect(reports).toEqual([{ reporter_id: 'u-pass', reported_id: null, details: 'legacy evidence' }]);
  });

  it('numbers existing messages in the order they were sent, then continues the sequence', async () => {
    const [rows] = await conn.query("SELECT content FROM messages WHERE conversation_id = 'c-1' ORDER BY seq");
    expect((rows as { content: string }[]).map((r) => r.content)).toEqual(['first', 'second', 'third']);
    await conn.query("INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES ('00-fourth', 'c-1', 'u-off', 'fourth', UTC_TIMESTAMP(3))");
    const [last] = await conn.query("SELECT content FROM messages ORDER BY seq DESC LIMIT 1");
    expect((last as { content: string }[])[0].content).toBe('fourth');
  });

  it('converts text timestamps to DATETIME(3), keeping their values and dropping the unused membership table', async () => {
    const [types] = await conn.query(
      `SELECT DISTINCT LOWER(column_type) AS type FROM information_schema.columns
       WHERE table_schema = ? AND column_name IN ('created_at', 'updated_at', 'last_message_at')
         AND table_name IN ('users', 'auth_accounts', 'profiles', 'likes', 'passes', 'matches', 'conversations', 'messages', 'blocks', 'reports')`,
      [LEGACY_DB]
    );
    expect(types).toEqual([{ type: 'datetime(3)' }]);

    const [users] = await conn.query("SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS at FROM users WHERE id = 'u-pass'");
    expect((users as { at: string }[])[0].at).toBe('2025-01-01 00:00:00.000000');
    const [messages] = await conn.query("SELECT DATE_FORMAT(created_at, '%H:%i:%s') AS at FROM messages WHERE id = 'mm-second'");
    expect((messages as { at: string }[])[0].at).toBe('10:00:01');
    // A value that was never a timestamp ('x') became the migration time rather than failing or NULL.
    const [profile] = await conn.query("SELECT created_at FROM profiles WHERE id = 'p-pass'");
    expect((profile as { created_at: string }[])[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const [tables] = await conn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'conversation_members'",
      [LEGACY_DB]
    );
    expect(tables).toEqual([]);
  });

  it('indexes message history by conversation and time', async () => {
    const [rows] = await conn.query(
      `SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = 'messages' AND index_name = 'idx_messages_conv'`,
      [LEGACY_DB]
    );
    expect((rows as { cols: string }[])[0].cols).toBe('conversation_id,created_at');
  });

  it('keeps existing conversations as accepted chats, one per pair, stored in pair order', async () => {
    const [rows] = await conn.query(
      `SELECT id, user_a_id, user_b_id, status, requester_id, match_id FROM \`${LEGACY_DB}\`.conversations WHERE id = 'c-1'`
    );
    // The legacy row was stored (u-pass, u-off): normalised so the pair key is unique.
    expect((rows as any[])[0]).toEqual({
      id: 'c-1',
      user_a_id: 'u-off',
      user_b_id: 'u-pass',
      status: 'accepted',
      requester_id: null,
      match_id: 'm-1',
    });
    const [keys] = await conn.query(
      `SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols, MIN(non_unique) AS non_unique
       FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = 'conversations' AND index_name = 'uq_conversations_pair'`,
      [LEGACY_DB]
    );
    expect((keys as any[])[0]).toMatchObject({ cols: 'user_a_id,user_b_id', non_unique: 0 });
    await expect(
      conn.query(
        `INSERT INTO \`${LEGACY_DB}\`.conversations (id, user_a_id, user_b_id, created_at) VALUES ('c-dup', 'u-off', 'u-pass', UTC_TIMESTAMP())`
      )
    ).rejects.toThrow(/Duplicate/);
    const [events] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'conversation_events'",
      [LEGACY_DB]
    );
    expect(Number((events as any[])[0].n)).toBe(1);
  });
});
