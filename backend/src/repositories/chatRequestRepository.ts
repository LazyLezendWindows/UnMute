import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { activeUser, blockedBetween } from './sql';
import { dbTimestamp } from '../utils/time';

export type ConversationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type ConversationEvent = 'requested' | 'accepted' | 'declined' | 'cancelled' | 'blocked' | 'matched';

export interface PairRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: ConversationStatus;
  requester_id: string | null;
  recipient_id: string | null;
  requested_at: string | null;
  declined_at: string | null;
}

export interface RequestSummaryRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConversationStatus;
  requested_at: string;
  other_user_id: string;
}

const PAIR_COLUMNS = 'id, user_a_id, user_b_id, status, requester_id, recipient_id, requested_at, declined_at';

/** Conversations are stored once per pair, with the smaller user id first. */
export function orderedPair(userX: string, userY: string): [string, string] {
  return userX < userY ? [userX, userY] : [userY, userX];
}

export class ChatRequestRepository {
  /**
   * The pair's conversation row, locked for the rest of the transaction; created (as `status`) if
   * the pair has none. Concurrent callers for the same pair wait on each other here, so every
   * state change below is decided on the latest committed row.
   */
  static async lockPair(tx: IDatabase, userX: string, userY: string): Promise<{ row: PairRow; created: boolean }> {
    const [userA, userB] = orderedPair(userX, userY);
    const id = crypto.randomUUID();
    const now = dbTimestamp();
    await tx.run(
      `INSERT INTO conversations (id, user_a_id, user_b_id, status, created_at, last_message_at)
       VALUES (?, ?, ?, 'pending', ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [id, userA, userB, now, now]
    );
    const row = await tx.get<PairRow>(
      `SELECT ${PAIR_COLUMNS} FROM conversations WHERE user_a_id = ? AND user_b_id = ? FOR UPDATE`,
      [userA, userB]
    );
    return { row: row!, created: row!.id === id };
  }

  /** A conversation row by id, locked, if `userId` is one of its two members. */
  static lockForMember(tx: IDatabase, conversationId: string, userId: string): Promise<PairRow | null> {
    return tx.get<PairRow>(
      `SELECT ${PAIR_COLUMNS} FROM conversations WHERE id = ? AND (user_a_id = ? OR user_b_id = ?) FOR UPDATE`,
      [conversationId, userId, userId]
    );
  }

  static findForMember(conversationId: string, userId: string): Promise<PairRow | null> {
    return getDatabase().get<PairRow>(
      `SELECT ${PAIR_COLUMNS} FROM conversations WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)`,
      [conversationId, userId, userId]
    );
  }

  static async startRequest(tx: IDatabase, conversationId: string, requesterId: string, recipientId: string) {
    await tx.run(
      `UPDATE conversations
       SET status = 'pending', requester_id = ?, recipient_id = ?, requested_at = ?, responded_at = NULL, last_message_at = ?
       WHERE id = ?`,
      [requesterId, recipientId, dbTimestamp(), dbTimestamp(), conversationId]
    );
  }

  static async setStatus(
    tx: IDatabase,
    conversationId: string,
    status: Exclude<ConversationStatus, 'pending'>,
    options: { declined?: boolean } = {}
  ) {
    await tx.run(
      `UPDATE conversations
       SET status = ?, responded_at = ?, declined_at = ${options.declined ? '?' : 'declined_at'}
       WHERE id = ?`,
      options.declined ? [status, dbTimestamp(), dbTimestamp(), conversationId] : [status, dbTimestamp(), conversationId]
    );
  }

  static async recordEvent(tx: IDatabase, conversationId: string, actorId: string | null, event: ConversationEvent) {
    await tx.run(
      'INSERT INTO conversation_events (id, conversation_id, actor_id, event, created_at) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), conversationId, actorId, event, dbTimestamp()]
    );
  }

  /** Requests awaiting `userId`'s decision from active members with no block between them, newest first. */
  static listIncoming(userId: string): Promise<RequestSummaryRow[]> {
    return getDatabase().query(
      `SELECT c.id, c.requester_id, c.recipient_id, c.status, c.requested_at, c.requester_id AS other_user_id
       FROM conversations c
       WHERE c.recipient_id = ? AND c.status = 'pending'
         AND NOT ${blockedBetween('c.requester_id', 'c.recipient_id')}
         AND ${activeUser('c.requester_id')}
       ORDER BY c.requested_at DESC`,
      [userId]
    );
  }

  /**
   * Requests `userId` sent that are still open from their point of view. A declined request is
   * shown as still pending until its cooldown ends, so the sender is never told they were declined.
   */
  static listSent(userId: string, declinedSince: string): Promise<RequestSummaryRow[]> {
    return getDatabase().query(
      `SELECT c.id, c.requester_id, c.recipient_id, c.status, c.requested_at, c.recipient_id AS other_user_id
       FROM conversations c
       WHERE c.requester_id = ?
         AND (c.status = 'pending' OR (c.status = 'declined' AND c.declined_at > ?))
         AND NOT ${blockedBetween('c.requester_id', 'c.recipient_id')}
         AND ${activeUser('c.recipient_id')}
       ORDER BY c.requested_at DESC`,
      [userId, declinedSince]
    );
  }

  /** How many of `userId`'s sent requests still await an answer (spam control). */
  static async countPendingSent(tx: IDatabase, userId: string): Promise<number> {
    const row = await tx.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM conversations WHERE requester_id = ? AND status = 'pending'",
      [userId]
    );
    return Number(row?.n ?? 0);
  }

  /** How many requests `userId` started since `since` (spam control across process restarts). */
  static async countStartedSince(tx: IDatabase, userId: string, since: string): Promise<number> {
    const row = await tx.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM conversation_events WHERE actor_id = ? AND event = 'requested' AND created_at > ?",
      [userId, since]
    );
    return Number(row?.n ?? 0);
  }

  /** A block closes an open request between the two (it never reopens on unblock). */
  static async closePendingBetween(tx: IDatabase, blockerId: string, blockedId: string): Promise<string | null> {
    const [userA, userB] = orderedPair(blockerId, blockedId);
    const row = await tx.get<PairRow>(
      `SELECT ${PAIR_COLUMNS} FROM conversations WHERE user_a_id = ? AND user_b_id = ? AND status = 'pending' FOR UPDATE`,
      [userA, userB]
    );
    if (!row) return null;
    // Blocking the sender counts as a decline (cooldown applies); blocking your own request withdraws it.
    const blockerIsRecipient = row.recipient_id === blockerId;
    await this.setStatus(tx, row.id, blockerIsRecipient ? 'declined' : 'cancelled', { declined: blockerIsRecipient });
    await this.recordEvent(tx, row.id, blockerId, 'blocked');
    return row.id;
  }

  /** First message of a request (its introduction), keyed by conversation. */
  static async introductions(conversationIds: string[]) {
    if (conversationIds.length === 0) return new Map<string, { content: string; created_at: string }>();
    const rows = await getDatabase().query<{ conversation_id: string; content: string; created_at: string }>(
      `SELECT m.conversation_id, m.content, m.created_at
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE m.conversation_id IN (${conversationIds.map(() => '?').join(', ')})
         AND m.sender_id = c.requester_id
         AND m.created_at >= c.requested_at
       ORDER BY m.seq ASC`,
      conversationIds
    );
    const byConversation = new Map<string, { content: string; created_at: string }>();
    for (const row of rows) if (!byConversation.has(row.conversation_id)) byConversation.set(row.conversation_id, row);
    return byConversation;
  }
}
