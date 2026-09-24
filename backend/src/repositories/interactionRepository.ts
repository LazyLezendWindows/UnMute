import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { dbTimestamp } from '../utils/time';
import { activeUser, blockedBetween } from './sql';

export class InteractionRepository {
  /** Idempotent: repeating a like is a no-op (unique (liker_id, likee_id)). */
  static async like(likerId: string, likeeId: string): Promise<void> {
    await getDatabase().run(
      'INSERT INTO likes (id, liker_id, likee_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
      [crypto.randomUUID(), likerId, likeeId, dbTimestamp()]
    );
  }

  static async pass(passerId: string, passeeId: string): Promise<void> {
    await getDatabase().run(
      'INSERT INTO passes (id, passer_id, passee_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
      [crypto.randomUUID(), passerId, passeeId, dbTimestamp()]
    );
  }

  static async hasLiked(likerId: string, likeeId: string): Promise<boolean> {
    return Boolean(
      await getDatabase().get('SELECT id FROM likes WHERE liker_id = ? AND likee_id = ?', [likerId, likeeId])
    );
  }

  /** Likes awaiting `userId`'s answer from active members with no block either way, newest first. */
  static incomingLikes(userId: string): Promise<{ liker_id: string; created_at: string }[]> {
    return getDatabase().query(
      `SELECT l.liker_id, l.created_at
       FROM likes l
       WHERE l.likee_id = ?
         AND NOT EXISTS (SELECT 1 FROM likes mine WHERE mine.liker_id = ? AND mine.likee_id = l.liker_id)
         AND NOT EXISTS (SELECT 1 FROM passes ps WHERE ps.passer_id = ? AND ps.passee_id = l.liker_id)
         AND NOT ${blockedBetween('l.liker_id', 'l.likee_id')}
         AND ${activeUser('l.liker_id')}
       ORDER BY l.created_at DESC
       LIMIT 100`,
      [userId, userId, userId]
    );
  }
}
