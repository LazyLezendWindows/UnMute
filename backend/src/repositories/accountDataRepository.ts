import { getDatabase } from '../config/database';

/** Read-only queries behind the member's own data export (their rows only, keyed by user id). */
export class AccountDataRepository {
  static account(userId: string): Promise<{ id: string; email: string; status: string; created_at: string } | null> {
    return getDatabase().get('SELECT id, email, status, created_at FROM users WHERE id = ?', [userId]);
  }

  static likesGiven(userId: string) {
    return getDatabase().query<{ user_id: string; created_at: string }>(
      'SELECT likee_id AS user_id, created_at FROM likes WHERE liker_id = ? ORDER BY created_at',
      [userId]
    );
  }

  static passesGiven(userId: string) {
    return getDatabase().query<{ user_id: string; created_at: string }>(
      'SELECT passee_id AS user_id, created_at FROM passes WHERE passer_id = ? ORDER BY created_at',
      [userId]
    );
  }

  static matches(userId: string) {
    return getDatabase().query<{ id: string; user_id: string; created_at: string }>(
      `SELECT id, CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END AS user_id, created_at
       FROM matches WHERE user_a_id = ? OR user_b_id = ? ORDER BY created_at`,
      [userId, userId, userId]
    );
  }

  /** Messages the member wrote (other people's messages are theirs, not part of this export). */
  static messagesSent(userId: string) {
    return getDatabase().query<{ conversation_id: string; content: string; created_at: string }>(
      'SELECT conversation_id, content, created_at FROM messages WHERE sender_id = ? ORDER BY created_at',
      [userId]
    );
  }

  static blocks(userId: string) {
    return getDatabase().query<{ user_id: string; reason: string; created_at: string }>(
      'SELECT blocked_id AS user_id, reason, created_at FROM blocks WHERE blocker_id = ? ORDER BY created_at',
      [userId]
    );
  }

  static reportsFiled(userId: string) {
    return getDatabase().query<{ user_id: string | null; reason_category: string; details: string | null; status: string; created_at: string }>(
      `SELECT reported_id AS user_id, reason_category, details, status, created_at
       FROM reports WHERE reporter_id = ? ORDER BY created_at`,
      [userId]
    );
  }

  static sessions(userId: string) {
    return getDatabase().query<{ created_at: string; last_used_at: string; expires_at: string; revoked_at: string | null; ip_address: string; user_agent: string }>(
      `SELECT created_at, last_used_at, expires_at, revoked_at, ip_address, user_agent
       FROM sessions WHERE user_id = ? ORDER BY created_at`,
      [userId]
    );
  }
}
