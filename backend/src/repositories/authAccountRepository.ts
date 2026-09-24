import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { AccountStatus } from './userRepository';
import { dbTimestamp } from '../utils/time';

export type AuthProvider = 'google' | 'password';

export class AuthAccountRepository {
  /** The user linked to an external identity (e.g. a Google `sub`). */
  static findUser(provider: AuthProvider, providerAccountId: string): Promise<{ id: string; status: AccountStatus } | null> {
    return getDatabase().get(
      `SELECT u.id, u.status FROM auth_accounts a
       JOIN users u ON u.id = a.user_id
       WHERE a.provider = ? AND a.provider_account_id = ?`,
      [provider, providerAccountId]
    );
  }

  /** Email lookup for password sign-in; password_hash is null when the account has no password. */
  static findPasswordLogin(email: string): Promise<{ id: string; status: AccountStatus; password_hash: string | null } | null> {
    return getDatabase().get(
      `SELECT u.id, u.status, a.password_hash
       FROM users u
       LEFT JOIN auth_accounts a ON a.user_id = u.id AND a.provider = 'password'
       WHERE u.email = ?`,
      [email]
    );
  }

  /** Password credentials are keyed by user id so an email change never orphans them. */
  static async insert(
    db: IDatabase,
    account: { userId: string; provider: AuthProvider; providerAccountId?: string; passwordHash?: string }
  ): Promise<void> {
    const now = dbTimestamp();
    await db.run(
      `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        account.userId,
        account.provider,
        account.providerAccountId ?? account.userId,
        account.passwordHash ?? null,
        now,
        now,
      ]
    );
  }

  /** Sign-in methods linked to a user, for the data export. */
  static listForUser(userId: string): Promise<{ provider: AuthProvider; created_at: string }[]> {
    return getDatabase().query('SELECT provider, created_at FROM auth_accounts WHERE user_id = ? ORDER BY created_at', [userId]);
  }

  static async deletePassword(db: IDatabase, userId: string): Promise<void> {
    await db.run("DELETE FROM auth_accounts WHERE user_id = ? AND provider = 'password'", [userId]);
  }
}
