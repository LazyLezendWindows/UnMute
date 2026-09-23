import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { config } from './env';
import { mariaConnectionOptions } from './connection';
import { runMigrations } from './migrate';

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  /** Runs `fn` inside a transaction on a single connection; commits on success, rolls back on error. */
  transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// Supports both `?` and `$1`-style placeholders; `$n` is rewritten to positional `?`.
function prepareParams(sql: string, params: any[]): { normalizedSql: string; boundParams: any[] } {
  if (!/\$\d+/.test(sql)) {
    return { normalizedSql: sql, boundParams: params };
  }
  const boundParams: any[] = [];
  const normalizedSql = sql.replace(/\$(\d+)/g, (_, idx) => {
    boundParams.push(params[parseInt(idx, 10) - 1]);
    return '?';
  });
  return { normalizedSql, boundParams };
}

class MariaDatabase implements IDatabase {
  constructor(private readonly executor: Pool | PoolConnection) {}

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { normalizedSql, boundParams } = prepareParams(sql, params);
    const [rows] = await this.executor.query(normalizedSql, boundParams);
    return rows as unknown as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const { normalizedSql, boundParams } = prepareParams(sql, params);
    const [result] = await this.executor.execute(normalizedSql, boundParams);
    return { changes: (result as mysql.ResultSetHeader).affectedRows || 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.executor.query(sql);
  }

  async transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T> {
    if (!('getConnection' in this.executor)) {
      // Already inside a transaction: reuse it.
      return fn(this);
    }
    const conn = await this.executor.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(new MariaDatabase(conn));
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async close(): Promise<void> {
    if ('getConnection' in this.executor) {
      await this.executor.end();
    }
  }
}

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    const pool = mysql.createPool({
      ...mariaConnectionOptions(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    dbInstance = new MariaDatabase(pool);
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  console.log(`[DB] Connecting to MariaDB (${config.mariadb.database})...`);
  await runMigrations();
  await getDatabase().get('SELECT 1 AS ok');
}
