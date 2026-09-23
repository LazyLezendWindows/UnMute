import crypto from 'crypto';
import { Request, Response } from 'express';
import { parse as parseCookies } from 'cookie';
import { SessionRepository } from '../repositories/sessionRepository';
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
    await SessionRepository.insert({
      userId,
      tokenHash: hashToken(token),
      ip: (meta.ip || '').slice(0, 64),
      userAgent: (meta.userAgent || '').slice(0, 255),
      ttlDays: config.session.ttlDays,
    });
    return { token, expiresAt };
  }

  /** Returns the live session for a raw token, or null if unknown, expired, revoked or the user is inactive. */
  static async resolve(token: string | undefined): Promise<ResolvedSession | null> {
    if (!token || token.length > 128) return null;
    const row = await SessionRepository.findLiveByTokenHash(hashToken(token));
    if (!row) return null;
    await SessionRepository.touch(row.id);
    return { sessionId: row.id, userId: row.user_id };
  }

  static async revoke(token: string | undefined): Promise<string | null> {
    return token ? SessionRepository.revokeByTokenHash(hashToken(token)) : null;
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
      secure: config.session.secure,
      sameSite: config.session.sameSite,
      path: '/',
      expires: expiresAt,
    });
  }

  static clearCookie(res: Response): void {
    res.clearCookie(config.session.cookieName, {
      httpOnly: true,
      secure: config.session.secure,
      sameSite: config.session.sameSite,
      path: '/',
    });
  }
}
