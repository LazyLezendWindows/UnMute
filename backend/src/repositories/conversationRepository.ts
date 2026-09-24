import { getDatabase } from '../config/database';
import { activeUser, blockedBetween } from './sql';
import { isoToDbTimestamp } from '../utils/time';

export interface ConversationSummaryRow {
  id: string;
  match_id: string;
  last_message_at: string | null;
  created_at: string;
  other_user_id: string;
}

export class ConversationRepository {
  /**
   * The conversation if `userId` is a participant and the other participant's account is active
   * (a deactivated or suspended member's chats are hidden until they return).
   */
  static findForParticipant(
    conversationId: string,
    userId: string
  ): Promise<{ id: string; other_user_id: string; blocked: number } | null> {
    return getDatabase().get(
      `SELECT c.id,
              IF(c.user_a_id = $2, c.user_b_id, c.user_a_id) AS other_user_id,
              ${blockedBetween('c.user_a_id', 'c.user_b_id')} AS blocked
       FROM conversations c
       WHERE c.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2)
         AND ${activeUser('IF(c.user_a_id = $2, c.user_b_id, c.user_a_id)')}`,
      [conversationId, userId]
    );
  }

  /** Conversations of `userId` with active members and no block between them, newest activity first. */
  static listForUser(userId: string): Promise<ConversationSummaryRow[]> {
    return getDatabase().query(
      `SELECT c.id, c.match_id, c.last_message_at, c.created_at,
              IF(c.user_a_id = $1, c.user_b_id, c.user_a_id) AS other_user_id
       FROM conversations c
       WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
         AND NOT ${blockedBetween('c.user_a_id', 'c.user_b_id')}
         AND ${activeUser('IF(c.user_a_id = $1, c.user_b_id, c.user_a_id)')}
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
      [userId]
    );
  }

  static async idsBetween(userX: string, userY: string): Promise<string[]> {
    const rows = await getDatabase().query<{ id: string }>(
      `SELECT id FROM conversations
       WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)`,
      [userX, userY, userY, userX]
    );
    return rows.map((r) => r.id);
  }

  static async touch(conversationId: string, at: string): Promise<void> {
    await getDatabase().run('UPDATE conversations SET last_message_at = ? WHERE id = ?', [isoToDbTimestamp(at), conversationId]);
  }
}
