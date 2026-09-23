import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';

export interface UserRow {
  id: string;
  email: string;
  is_active: number;
}

export class UserRepository {
  static findById(id: string): Promise<UserRow | null> {
    return getDatabase().get('SELECT id, email, is_active FROM users WHERE id = ?', [id]);
  }

  static findByEmail(email: string): Promise<UserRow | null> {
    return getDatabase().get('SELECT id, email, is_active FROM users WHERE email = ?', [email]);
  }

  static async isActive(id: string): Promise<boolean> {
    return Boolean(await getDatabase().get('SELECT id FROM users WHERE id = ? AND is_active = 1', [id]));
  }

  static async insert(tx: IDatabase, email: string): Promise<string> {
    const id = crypto.randomUUID();
    await tx.run('INSERT INTO users (id, email, is_active, created_at) VALUES (?, ?, 1, ?)', [
      id,
      email,
      new Date().toISOString(),
    ]);
    return id;
  }
}
