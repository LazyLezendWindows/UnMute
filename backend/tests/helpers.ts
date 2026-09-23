import { getDatabase, initDatabase } from '../src/config/database';
import { config } from '../src/config/env';
import { seedInterests, seedReferenceData } from '../src/utils/seed';

/** Migrates the test database and empties every table except the migration ledger. */
export async function resetTestDatabase(): Promise<void> {
  if (!/_test_db$/.test(config.mariadb.database)) {
    throw new Error(`Refusing to reset non-test database "${config.mariadb.database}"`);
  }
  await initDatabase();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const tables = await tx.query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name <> 'schema_migrations'`
    );
    await tx.exec('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name } of tables) {
      await tx.exec(`DELETE FROM \`${name}\``);
    }
    await tx.exec('SET FOREIGN_KEY_CHECKS = 1');
  });
  await seedInterests();
  await seedReferenceData();
}

/**
 * Fake Google credentials for the mocked verifier, shaped `google-test-credential:<sub>:<email>[:unverified]`.
 * Real Google ID tokens cannot be minted in tests; everything after verification is real.
 */
export function fakeGoogleCredential(sub: string, email: string, verified = true): string {
  return `google-test-credential:${sub}:${email}${verified ? '' : ':unverified'}`;
}
