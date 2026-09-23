import fs from 'fs';
import mysql from 'mysql2/promise';
import { config } from './env';

/** Connection options shared by the app pool, the migrator and test setup. */
export function mariaConnectionOptions({ withDatabase = true } = {}): mysql.ConnectionOptions {
  const dbUrl = process.env.DATABASE_URL || process.env.MARIADB_URL;
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      const opts: mysql.ConnectionOptions = {
        host: parsed.hostname,
        port: parseInt(parsed.port || '3306', 10),
        user: decodeURIComponent(parsed.username || ''),
        password: decodeURIComponent(parsed.password || ''),
        ...(withDatabase && parsed.pathname && parsed.pathname !== '/'
          ? { database: parsed.pathname.replace(/^\//, '') }
          : {}),
      };
      if (
        parsed.searchParams.get('ssl') === 'true' ||
        parsed.searchParams.get('ssl-mode') ||
        process.env.MARIADB_SSL === 'true' ||
        config.isProduction
      ) {
        opts.ssl = { rejectUnauthorized: false };
      }
      return opts;
    } catch (e) {
      console.warn('[DB] Failed to parse DATABASE_URL, falling back to individual variables:', e);
    }
  }

  const opts: mysql.ConnectionOptions = {
    user: config.mariadb.user,
    password: config.mariadb.password,
    ...(withDatabase ? { database: config.mariadb.database } : {}),
  };

  if (fs.existsSync(config.mariadb.socketPath)) {
    opts.socketPath = config.mariadb.socketPath;
  } else {
    opts.host = config.mariadb.host;
    opts.port = config.mariadb.port;
    if (process.env.MARIADB_SSL === 'true') {
      opts.ssl = { rejectUnauthorized: false };
    }
  }
  return opts;
}
