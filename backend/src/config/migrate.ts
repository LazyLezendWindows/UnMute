import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { mariaConnectionOptions } from './connection';

// Resolves to backend/migrations from both src/config (tsx) and dist/config (compiled).
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const LOCK_NAME = 'unmute_schema_migrations';

/**
 * Applies pending `NNN_name.sql` files from backend/migrations in filename order and records
 * each in `schema_migrations`. MariaDB DDL auto-commits, so every migration must be safe to
 * re-run if it fails midway.
 */
export async function runMigrations(options: { database?: string } = {}): Promise<void> {
  // A dedicated connection: multi-statement execution is enabled here only, never on the app pool.
  const conn = await mysql.createConnection({
    ...mariaConnectionOptions(),
    ...(options.database ? { database: options.database } : {}),
    multipleStatements: true,
  });
  try {
    await conn.query("SET SESSION sql_mode = REPLACE(REPLACE(@@sql_mode, 'ANSI_QUOTES', ''), 'ANSI', '')");
    const [lockRows] = await conn.query('SELECT GET_LOCK(?, 30) AS acquired', [LOCK_NAME]);
    if ((lockRows as any[])[0]?.acquired !== 1) {
      throw new Error('Could not acquire the schema migration lock');
    }

    await conn.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version VARCHAR(255) PRIMARY KEY,
         applied_at DATETIME NOT NULL
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [appliedRows] = await conn.query('SELECT version FROM schema_migrations');
    const applied = new Set((appliedRows as { version: string }[]).map((r) => r.version));

    const pending = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d+_.+\.sql$/.test(f))
      .sort()
      .filter((f) => !applied.has(f));

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`[DB] Applying migration ${file}`);
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP())', [file]);
    }
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    await conn.end();
  }
}

// `npm run migrate`: apply migrations without starting the server (e.g. as a deploy step).
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[DB] Migrations are up to date');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB] Migration failed:', err);
      process.exit(1);
    });
}
