import mysql from 'mysql2/promise';
import { mariaConnectionOptions } from '../src/config/connection';
import { config } from '../src/config/env';

export async function setup(): Promise<void> {
  const name = config.mariadb.database;
  if (!/_test_db$/.test(name)) {
    throw new Error(`Refusing to run tests against non-test database "${name}"`);
  }
  const conn = await mysql.createConnection(mariaConnectionOptions({ withDatabase: false }));
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await conn.end();
  }
}
