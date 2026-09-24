import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { dbTimestamp } from '../utils/time';

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function hashEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

export class PushSubscriptionRepository {
  /**
   * Stores the subscription of a session, replacing the session's previous one and taking the
   * endpoint over from any other session (the browser now belongs to whoever signed in last).
   */
  static async save(sub: { userId: string; sessionId: string; endpoint: string; p256dh: string; auth: string }) {
    const endpointHash = hashEndpoint(sub.endpoint);
    await getDatabase().transaction(async (tx) => {
      await tx.run('DELETE FROM push_subscriptions WHERE session_id = ? OR endpoint_hash = ?', [
        sub.sessionId,
        endpointHash,
      ]);
      await tx.run(
        `INSERT INTO push_subscriptions (id, user_id, session_id, endpoint, endpoint_hash, p256dh, auth, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), sub.userId, sub.sessionId, sub.endpoint, endpointHash, sub.p256dh, sub.auth, dbTimestamp()]
      );
    });
  }

  static async deleteForSession(sessionId: string): Promise<void> {
    await getDatabase().run('DELETE FROM push_subscriptions WHERE session_id = ?', [sessionId]);
  }

  static async delete(id: string): Promise<void> {
    await getDatabase().run('DELETE FROM push_subscriptions WHERE id = ?', [id]);
  }

  /** Subscriptions of the user's live sessions only; revoked or expired sessions never get pushes. */
  static listDeliverable(userId: string): Promise<PushSubscriptionRow[]> {
    return getDatabase().query(
      `SELECT p.id, p.endpoint, p.p256dh, p.auth
       FROM push_subscriptions p
       JOIN sessions s ON s.id = p.session_id
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > UTC_TIMESTAMP()
         AND u.is_active = 1`,
      [userId]
    );
  }
}
