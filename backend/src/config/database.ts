import fs from 'fs';
import path from 'path';
import mysql, { Pool } from 'mysql2/promise';
import Database from 'better-sqlite3';
import { config } from './env';

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

class MariaDatabase implements IDatabase {
  private pool: Pool;

  constructor() {
    const opts: mysql.PoolOptions = {
      user: config.mariadb.user,
      password: config.mariadb.password,
      database: config.mariadb.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    };

    if (fs.existsSync(config.mariadb.socketPath)) {
      opts.socketPath = config.mariadb.socketPath;
    } else {
      opts.host = config.mariadb.host;
      opts.port = config.mariadb.port;
    }

    this.pool = mysql.createPool(opts);
  }

  private prepareParams(sql: string, params: any[]): { normalizedSql: string; boundParams: any[] } {
    if (!/\$\d+/.test(sql)) {
      return { normalizedSql: sql, boundParams: params };
    }
    const boundParams: any[] = [];
    const normalizedSql = sql.replace(/\$(\d+)/g, (_, idx) => {
      const paramIndex = parseInt(idx, 10) - 1;
      boundParams.push(params[paramIndex]);
      return '?';
    });
    return { normalizedSql, boundParams };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { normalizedSql, boundParams } = this.prepareParams(sql, params);
    const [rows] = await this.pool.query(normalizedSql, boundParams);
    return (rows as unknown) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { normalizedSql, boundParams } = this.prepareParams(sql, params);
    const [rows] = await this.pool.query(normalizedSql, boundParams);
    const arr = (rows as unknown) as T[];
    return arr.length > 0 ? arr[0] : null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const { normalizedSql, boundParams } = this.prepareParams(sql, params);
    const [result] = await this.pool.execute(normalizedSql, boundParams);
    const res = result as mysql.ResultSetHeader;
    return { changes: res.affectedRows || 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class SQLiteDatabase implements IDatabase {
  private db: Database.Database;

  constructor(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  private prepare(sql: string, params: any[]): { stmt: Database.Statement; boundParams: any[] } {
    const boundParams: any[] = [];
    if (/\$\d+/.test(sql)) {
      const normalized = sql.replace(/\$(\d+)/g, (_, idx) => {
        const paramIndex = parseInt(idx, 10) - 1;
        boundParams.push(params[paramIndex]);
        return '?';
      });
      return { stmt: this.db.prepare(normalized), boundParams };
    }
    return { stmt: this.db.prepare(sql), boundParams: params };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { stmt, boundParams } = this.prepare(sql, params);
    return stmt.all(...boundParams) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { stmt, boundParams } = this.prepare(sql, params);
    const result = stmt.get(...boundParams);
    return (result as T) || null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const { stmt, boundParams } = this.prepare(sql, params);
    const info = stmt.run(...boundParams);
    return { changes: info.changes };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

let dbInstance: IDatabase | null = null;
let isMariaDBActive = false;

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    try {
      console.log(`[DB] Connecting to MariaDB (${config.mariadb.database})...`);
      dbInstance = new MariaDatabase();
      isMariaDBActive = true;
    } catch (err) {
      console.warn('[DB] MariaDB connection failed, falling back to local SQLite:', err);
      const dbPath = path.resolve(__dirname, '../../data/unmute.sqlite');
      dbInstance = new SQLiteDatabase(dbPath);
      isMariaDBActive = false;
    }
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = getDatabase();
  try {
    if (isMariaDBActive) {
      const schemaPath = path.resolve(__dirname, '../models/schema_mariadb.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
      await db.exec(schemaSQL);
      console.log('[DB] MariaDB schema initialized successfully (unmute_db)');
    } else {
      const schemaPath = path.resolve(__dirname, '../models/schema.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
      await db.exec(schemaSQL);
      console.log('[DB] SQLite schema initialized successfully');
    }
  } catch (err) {
    console.error('[DB] Schema initialization error:', err);
    throw err;
  }
}
