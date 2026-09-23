import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';

export type AuthProvider = 'google' | 'password';

export class AuthAccountRepository {
  /** The user linked to an external identity (e.g. a Google `sub`). */
  static findUser(provider: AuthProvider, providerAccountId: string): Promise<{ id: string; is_active: number } | null> {
    return getDatabase().get(
      `SELECT u.id, u.is_active FROM auth_accounts a
       JOIN users u ON u.id = a.user_id
       WHERE a.provider = ? AND a.provider_account_id = ?`,
      [provider, providerAccountId]
    );
  }

  /** Email lookup for password sign-in; password_hash is null when the account has no password. */
  static findPasswordLogin(email: string): Promise<{ id: string; is_active: number; password_hash: string | null } | null> {
    return getDatabase().get(
      `SELECT u.id, u.is_active, a.password_hash
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
    const now = new Date().toISOString();
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
}
