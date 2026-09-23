import crypto from 'crypto';
import { Request, Response } from 'express';
import { parse as parseCookies } from 'cookie';
import { getDatabase } from '../config/database';
import { config } from '../config/env';

export interface ResolvedSession {
  sessionId: string;
  userId: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class SessionService {
  /** Creates a session for `userId` and returns the raw token (only ever sent in the cookie). */
  static async create(userId: string, meta: { ip?: string; userAgent?: string }) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + config.session.ttlDays * 24 * 60 * 60 * 1000);

    await getDatabase().run(
      `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, created_at, last_used_at, expires_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
      [
        crypto.randomUUID(),
        userId,
        hashToken(token),
        (meta.ip || '').slice(0, 64),
        (meta.userAgent || '').slice(0, 255),
        config.session.ttlDays,
      ]
    );

    return { token, expiresAt };
  }

  /** Returns the live session for a raw token, or null if unknown, expired, revoked or the user is inactive. */
  static async resolve(token: string | undefined): Promise<ResolvedSession | null> {
    if (!token || token.length > 128) return null;

    const db = getDatabase();
    const row = await db.get<{ id: string; user_id: string }>(
      `SELECT s.id, s.user_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > UTC_TIMESTAMP()
         AND u.is_active = 1`,
      [hashToken(token)]
    );
    if (!row) return null;

    // Throttled activity stamp: at most one write per session every 5 minutes.
    await db.run(
      `UPDATE sessions SET last_used_at = UTC_TIMESTAMP()
       WHERE id = ? AND last_used_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)`,
      [row.id]
    );

    return { sessionId: row.id, userId: row.user_id };
  }

  static async revoke(token: string | undefined): Promise<string | null> {
    if (!token) return null;
    const db = getDatabase();
    const row = await db.get<{ id: string }>('SELECT id FROM sessions WHERE token_hash = ?', [hashToken(token)]);
    if (!row) return null;
    await db.run('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL', [row.id]);
    return row.id;
  }

  static readToken(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    return parseCookies(cookieHeader)[config.session.cookieName];
  }

  static tokenFromRequest(req: Request): string | undefined {
    return this.readToken(req.headers.cookie);
  }

  static setCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(config.session.cookieName, token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }

  static clearCookie(res: Response): void {
    res.clearCookie(config.session.cookieName, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
