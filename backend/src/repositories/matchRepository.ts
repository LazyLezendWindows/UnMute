import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { blockedBetween } from './sql';

export interface MatchSummaryRow {
  match_id: string;
  created_at: string;
  conversation_id: string;
  last_message_at: string | null;
  other_user_id: string;
}

export class MatchRepository {
  /**
   * Creates the match and its conversation atomically, or returns the existing conversation.
   * The upsert waits on a concurrent insert of the same pair and then yields to it, and the
   * locking reads see that committed row, so concurrent calls converge on one match/conversation.
   */
  static ensure(userX: string, userY: string): Promise<string> {
    const [userA, userB] = userX < userY ? [userX, userY] : [userY, userX];
    const now = new Date().toISOString();

    return getDatabase().transaction(async (tx) => {
      await tx.run(
        'INSERT INTO matches (id, user_a_id, user_b_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
        [crypto.randomUUID(), userA, userB, now]
      );
      const match = await tx.get<{ id: string }>(
        'SELECT id FROM matches WHERE user_a_id = ? AND user_b_id = ? FOR UPDATE',
        [userA, userB]
      );

      await tx.run(
        `INSERT INTO conversations (id, match_id, user_a_id, user_b_id, last_message_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [crypto.randomUUID(), match!.id, userA, userB, now, now]
      );
      const conversation = await tx.get<{ id: string }>(
        'SELECT id FROM conversations WHERE match_id = ? FOR UPDATE',
        [match!.id]
      );
      return conversation!.id;
    });
  }

  static listForUser(userId: string): Promise<MatchSummaryRow[]> {
    return getDatabase().query(
      `SELECT m.id AS match_id, m.created_at, c.id AS conversation_id, c.last_message_at,
              IF(m.user_a_id = $1, m.user_b_id, m.user_a_id) AS other_user_id
       FROM matches m
       JOIN conversations c ON c.match_id = m.id
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
         AND NOT ${blockedBetween('m.user_a_id', 'm.user_b_id')}
       ORDER BY COALESCE(c.last_message_at, m.created_at) DESC`,
      [userId]
    );
  }
}
