import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { MessageRow } from '../mappers/messageMapper';
import { placeholders } from './sql';

const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, content, status, created_at';

export class MessageRepository {
  static async insert(conversationId: string, senderId: string, content: string): Promise<MessageRow> {
    const row: MessageRow = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      status: 'sent',
      created_at: new Date().toISOString(),
    };
    await getDatabase().run(
      `INSERT INTO messages (${MESSAGE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?)`,
      [row.id, row.conversation_id, row.sender_id, row.content, row.status, row.created_at]
    );
    return row;
  }

  /** The newest `limit` messages (skipping `offset` newer ones), returned oldest-first for display. */
  static page(conversationId: string, limit: number, offset: number): Promise<MessageRow[]> {
    return getDatabase().query(
      `SELECT * FROM (
         SELECT ${MESSAGE_COLUMNS} FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?
       ) recent
       ORDER BY created_at ASC, id ASC`,
      [conversationId, limit, offset]
    );
  }

  /** Latest message per conversation, in one query. */
  static async latestFor(conversationIds: string[]): Promise<Map<string, MessageRow>> {
    if (conversationIds.length === 0) return new Map();
    const rows = await getDatabase().query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM (
         SELECT ${MESSAGE_COLUMNS},
                ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC, id DESC) AS rn
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
}
