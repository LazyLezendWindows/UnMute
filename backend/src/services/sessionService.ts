import crypto from 'crypto';
import { Request, Response } from 'express';
import { parse as parseCookies } from 'cookie';
import { SessionRepository } from '../repositories/sessionRepository';
import { UserRole } from '../repositories/userRepository';
import { config } from '../config/env';

export interface ResolvedSession {
  sessionId: string;
  userId: string;
  /** Seconds since the member signed in with this session (for recent-authentication checks). */
  ageSeconds: number;
  role: UserRole;
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
    return { sessionId: row.id, userId: row.user_id, ageSeconds: Number(row.age_seconds), role: row.role };
  }

  static async revoke(token: string | undefined): Promise<string | null> {
    return token ? SessionRepository.revokeByTokenHash(hashToken(token)) : null;
  }

  static readToken(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    return parseCookies(cookieHeader)[config.session.cookieName];
  }

  /**
   * The session token of a request: the HttpOnly cookie (web), or `Authorization: Bearer` (native
   * apps). A bearer token is never sent automatically by a browser, so it carries no CSRF risk.
   */
  static tokenFromRequest(req: Request): string | undefined {
    return this.readToken(req.headers.cookie) ?? this.bearerToken(req.headers.authorization);
  }

  static bearerToken(header: string | undefined): string | undefined {
    const match = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(header || '');
    return match?.[1];
  }

  /** True when the request comes from one of the configured native app origins. */
  static isNativeAppRequest(req: Request): boolean {
    const origin = req.headers.origin;
    return Boolean(origin && config.nativeAppOrigins.includes(origin));
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
