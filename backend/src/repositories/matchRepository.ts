import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { activeUser, blockedBetween } from './sql';
import { dbTimestamp } from '../utils/time';
import { ChatRequestRepository, orderedPair } from './chatRequestRepository';

export interface MatchSummaryRow {
  match_id: string;
  created_at: string;
  conversation_id: string;
  last_message_at: string | null;
  other_user_id: string;
}

export class MatchRepository {
  /**
   * Creates the match and makes the pair's conversation an accepted chat, atomically; returns the
   * conversation id. A mutual like is consent from both sides, so an open request between the two
   * (either direction) is accepted too. The upsert waits on a concurrent insert of the same pair
   * and the locking reads see that committed row, so concurrent calls converge on one match and
   * one conversation.
   */
  static ensure(userX: string, userY: string): Promise<string> {
    const [userA, userB] = orderedPair(userX, userY);

    return getDatabase().transaction(async (tx) => {
      await tx.run(
        'INSERT INTO matches (id, user_a_id, user_b_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
        [crypto.randomUUID(), userA, userB, dbTimestamp()]
      );
      const match = await tx.get<{ id: string }>(
        'SELECT id FROM matches WHERE user_a_id = ? AND user_b_id = ? FOR UPDATE',
        [userA, userB]
      );

      const { row } = await ChatRequestRepository.lockPair(tx, userA, userB);
      await tx.run('UPDATE conversations SET match_id = ? WHERE id = ? AND match_id IS NULL', [match!.id, row.id]);
      if (row.status !== 'accepted') {
        await ChatRequestRepository.setStatus(tx, row.id, 'accepted');
        await ChatRequestRepository.recordEvent(tx, row.id, null, 'matched');
      }
      return row.id;
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
         AND ${activeUser('IF(m.user_a_id = $1, m.user_b_id, m.user_a_id)')}
       ORDER BY COALESCE(c.last_message_at, m.created_at) DESC`,
      [userId]
    );
  }
}
