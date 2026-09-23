import mysql from 'mysql2/promise';
import { mariaConnectionOptions } from '../src/config/connection';
import { config } from '../src/config/env';

/** Drops and recreates a disposable database (end-to-end runs). Refuses anything not named *_e2e_db / *_test_db. */
async function main() {
  const name = config.mariadb.database;
  if (!/_(e2e|test)_db$/.test(name)) {
    throw new Error(`Refusing to reset "${name}": only *_e2e_db or *_test_db databases can be reset`);
  }
  const conn = await mysql.createConnection(mariaConnectionOptions({ withDatabase: false }));
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await conn.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`[DB] Reset ${name}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
