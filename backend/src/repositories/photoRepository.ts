import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { placeholders } from './sql';
import { dbTimestamp } from '../utils/time';

export interface PhotoRow {
  id: string;
  user_id: string;
  url: string;
  position: number;
}

export class PhotoRepository {
  /** A member's uploaded photos in their chosen order. */
  static list(userId: string, db: IDatabase = getDatabase()): Promise<PhotoRow[]> {
    return db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = ? ORDER BY position', [userId]);
  }

  /** Locks the member's photo set (via their profile row) so concurrent changes apply one at a time. */
  static async lockFor(tx: IDatabase, userId: string): Promise<{ avatar_url: string } | null> {
    return tx.get('SELECT avatar_url FROM profiles WHERE user_id = ? FOR UPDATE', [userId]);
  }

  static async forUsers(userIds: string[]): Promise<Map<string, string[]>> {
    const byUser = new Map<string, string[]>();
    if (userIds.length === 0) return byUser;
    const rows = await getDatabase().query<PhotoRow>(
      `SELECT user_id, url FROM user_photos WHERE user_id IN (${placeholders(userIds.length)}) ORDER BY user_id, position`,
      userIds
    );
    for (const row of rows) byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.url]);
    return byUser;
  }

  static async insert(tx: IDatabase, userId: string, url: string, position: number): Promise<string> {
    const id = crypto.randomUUID();
    await tx.run('INSERT INTO user_photos (id, user_id, url, position, created_at) VALUES (?, ?, ?, ?, ?)', [
      id,
      userId,
      url,
      position,
      dbTimestamp(),
    ]);
    return id;
  }

  static async delete(tx: IDatabase, userId: string, photoId: string): Promise<void> {
    await tx.run('DELETE FROM user_photos WHERE id = ? AND user_id = ?', [photoId, userId]);
  }

  /** Stores `orderedIds` as positions 0..n-1 (two steps, because (user_id, position) is unique). */
  static async reorder(tx: IDatabase, userId: string, orderedIds: string[]): Promise<void> {
    await tx.run('UPDATE user_photos SET position = position + 100 WHERE user_id = ?', [userId]);
    for (const [index, id] of orderedIds.entries()) {
      await tx.run('UPDATE user_photos SET position = ? WHERE id = ? AND user_id = ?', [index, id, userId]);
    }
  }
}
