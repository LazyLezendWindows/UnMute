import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { UserRole } from './userRepository';

export class SessionRepository {
  static async insert(session: { userId: string; tokenHash: string; ip: string; userAgent: string; ttlDays: number }) {
    await getDatabase().run(
      `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, created_at, last_used_at, expires_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
      [crypto.randomUUID(), session.userId, session.tokenHash, session.ip, session.userAgent, session.ttlDays]
    );
  }

  /** A live session: not revoked, not expired, and belonging to an active user. */
  static findLiveByTokenHash(
    tokenHash: string
  ): Promise<{ id: string; user_id: string; role: UserRole; age_seconds: number } | null> {
    return getDatabase().get(
      `SELECT s.id, s.user_id, u.role, TIMESTAMPDIFF(SECOND, s.created_at, UTC_TIMESTAMP()) AS age_seconds
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > UTC_TIMESTAMP()
         AND u.is_active = 1`,
      [tokenHash]
    );
  }

  /** Throttled activity stamp: at most one write per session every 5 minutes. */
  static async touch(sessionId: string): Promise<void> {
    await getDatabase().run(
      `UPDATE sessions SET last_used_at = UTC_TIMESTAMP()
       WHERE id = ? AND last_used_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)`,
      [sessionId]
    );
  }

  /** Revokes the session with this token hash; returns its id, or null if unknown. */
  static async revokeByTokenHash(tokenHash: string): Promise<string | null> {
    const db = getDatabase();
    const row = await db.get<{ id: string }>('SELECT id FROM sessions WHERE token_hash = ?', [tokenHash]);
    if (!row) return null;
    await db.run('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL', [row.id]);
    // A signed-out device stops receiving notifications.
    await db.run('DELETE FROM push_subscriptions WHERE session_id = ?', [row.id]);
    return row.id;
  }

  /** Revokes every live session of a user (e.g. when their credentials change). */
  static async revokeAllForUser(db: IDatabase, userId: string): Promise<void> {
    await db.run('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL', [userId]);
    await db.run('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
  }
}
