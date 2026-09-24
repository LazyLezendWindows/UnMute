import crypto from 'crypto';
import { getDatabase, isDuplicateKeyError } from '../config/database';
import { MessageRow } from '../mappers/messageMapper';
import { placeholders } from './sql';
import { isoToDbTimestamp } from '../utils/time';

const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, content, status, created_at';

export class MessageRepository {
  /**
   * Stores a message. With a `clientMessageId`, a repeat of the same send (a retry after a dropped
   * connection) returns the originally stored message and `created: false` instead of a duplicate.
   */
  static async insert(
    conversationId: string,
    senderId: string,
    content: string,
    clientMessageId?: string
  ): Promise<{ row: MessageRow; created: boolean }> {
    const row: MessageRow = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      status: 'sent',
      created_at: new Date().toISOString(),
    };
    try {
      await getDatabase().run(
        `INSERT INTO messages (${MESSAGE_COLUMNS}, client_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.conversation_id, row.sender_id, row.content, row.status, isoToDbTimestamp(row.created_at), clientMessageId ?? null]
      );
      return { row, created: true };
    } catch (err) {
      if (!clientMessageId || !isDuplicateKeyError(err)) throw err;
      const existing = await getDatabase().get<MessageRow>(
        `SELECT ${MESSAGE_COLUMNS} FROM messages WHERE conversation_id = ? AND sender_id = ? AND client_message_id = ?`,
        [conversationId, senderId, clientMessageId]
      );
      if (!existing) throw err;
      return { row: existing, created: false };
    }
  }

  /**
   * Up to `limit` messages before the message `beforeId` (or the newest ones), oldest-first for
   * display. Ordered by the server-assigned sequence, so pages never overlap or skip messages
   * even while new ones arrive.
   */
  static async page(
    conversationId: string,
    limit: number,
    beforeId?: string
  ): Promise<{ rows: MessageRow[]; hasMore: boolean }> {
    const cursor = beforeId
      ? 'AND seq < (SELECT c.seq FROM messages c WHERE c.id = ? AND c.conversation_id = ?)'
      : '';
    const rows = await getDatabase().query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages
       WHERE conversation_id = ? ${cursor}
       ORDER BY seq DESC
       LIMIT ?`,
      [conversationId, ...(beforeId ? [beforeId, conversationId] : []), limit + 1]
    );
    const hasMore = rows.length > limit;
    return { rows: rows.slice(0, limit).reverse(), hasMore };
  }

  /** Latest message per conversation, in one query. */
  static async latestFor(conversationIds: string[]): Promise<Map<string, MessageRow>> {
    if (conversationIds.length === 0) return new Map();
    const rows = await getDatabase().query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM (
         SELECT ${MESSAGE_COLUMNS},
                ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY seq DESC) AS rn
         FROM messages
         WHERE conversation_id IN (${placeholders(conversationIds.length)})
       ) ranked
       WHERE rn = 1`,
      conversationIds
    );
    return new Map(rows.map((r) => [r.conversation_id, r]));
  }

  /** Unread messages addressed to `readerId`, per conversation. */
  static async unreadCounts(conversationIds: string[], readerId: string): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map();
    const rows = await getDatabase().query<{ conversation_id: string; n: number }>(
      `SELECT conversation_id, COUNT(*) AS n FROM messages
       WHERE conversation_id IN (${placeholders(conversationIds.length)}) AND sender_id <> ? AND status <> 'read'
       GROUP BY conversation_id`,
      [...conversationIds, readerId]
    );
    return new Map(rows.map((r) => [r.conversation_id, Number(r.n)]));
  }

  static async markRead(conversationId: string, readerId: string): Promise<void> {
    await getDatabase().run(
      `UPDATE messages SET status = 'read' WHERE conversation_id = ? AND sender_id <> ? AND status <> 'read'`,
      [conversationId, readerId]
    );
  }

  /** The latest messages exchanged between two members, oldest first (report evidence). */
  static recentBetween(conversationIds: string[], limit: number): Promise<MessageRow[]> {
    if (conversationIds.length === 0) return Promise.resolve([]);
    return getDatabase().query(
      `SELECT * FROM (
         SELECT ${MESSAGE_COLUMNS}, seq FROM messages
         WHERE conversation_id IN (${placeholders(conversationIds.length)})
         ORDER BY seq DESC
         LIMIT ?
       ) recent
       ORDER BY seq ASC`,
      [...conversationIds, limit]
    );
  }
}
