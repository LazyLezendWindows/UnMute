import fs from 'fs';
import mysql from 'mysql2/promise';
import { config } from './env';

/** Connection options shared by the app pool, the migrator and test setup. */
export function mariaConnectionOptions({ withDatabase = true } = {}): mysql.ConnectionOptions {
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
  }
  return opts;
}
