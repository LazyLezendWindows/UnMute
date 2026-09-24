import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { dbTimestamp } from '../utils/time';

/** Why an account is (not) usable; `is_active` is derived from it (status = 'active'). */
export type AccountStatus = 'active' | 'deactivated' | 'suspended';

/** Staff roles unlock moderation; they are granted from the command line only (see cli/grantRole). */
export type UserRole = 'member' | 'moderator' | 'admin';

export interface UserRow {
  id: string;
  email: string;
  is_active: number;
  status: AccountStatus;
  role: UserRole;
}

const USER_COLUMNS = 'id, email, is_active, status, role';

export class UserRepository {
  static findById(id: string): Promise<UserRow | null> {
    return getDatabase().get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
  }

  static findByEmail(email: string): Promise<UserRow | null> {
    return getDatabase().get(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, [email]);
  }

  static async isActive(id: string): Promise<boolean> {
    return Boolean(await getDatabase().get('SELECT id FROM users WHERE id = ? AND is_active = 1', [id]));
  }

  static async insert(tx: IDatabase, email: string): Promise<string> {
    const id = crypto.randomUUID();
    await tx.run("INSERT INTO users (id, email, status, created_at) VALUES (?, ?, 'active', ?)", [
      id,
      email,
      dbTimestamp(),
    ]);
    return id;
  }

  static async setRole(db: IDatabase, id: string, role: UserRole): Promise<void> {
    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  }

  static async setStatus(db: IDatabase, id: string, status: AccountStatus): Promise<void> {
    await db.run('UPDATE users SET status = ?, status_changed_at = UTC_TIMESTAMP() WHERE id = ?', [status, id]);
  }

  /** Permanently deletes the account; owned rows cascade, reports keep a NULL reference. */
  static async delete(db: IDatabase, id: string): Promise<void> {
    await db.run('DELETE FROM users WHERE id = ?', [id]);
  }
}
