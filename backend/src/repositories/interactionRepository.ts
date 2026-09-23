import crypto from 'crypto';
import { getDatabase } from '../config/database';

export class InteractionRepository {
  /** Idempotent: repeating a like is a no-op (unique (liker_id, likee_id)). */
  static async like(likerId: string, likeeId: string): Promise<void> {
    await getDatabase().run(
      'INSERT INTO likes (id, liker_id, likee_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
      [crypto.randomUUID(), likerId, likeeId, new Date().toISOString()]
    );
  }

  static async pass(passerId: string, passeeId: string): Promise<void> {
    await getDatabase().run(
      'INSERT INTO passes (id, passer_id, passee_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
      [crypto.randomUUID(), passerId, passeeId, new Date().toISOString()]
    );
  }

  static async hasLiked(likerId: string, likeeId: string): Promise<boolean> {
    return Boolean(
      await getDatabase().get('SELECT id FROM likes WHERE liker_id = ? AND likee_id = ?', [likerId, likeeId])
    );
  }
}
