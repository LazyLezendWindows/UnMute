import { config } from '../config/env';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { SessionService } from '../services/sessionService';
import { AuthRequest } from '../middleware/auth';
import { getSocketServer } from '../sockets/chatSocket';

/** Opens a server-side session for `userId`, sets the HttpOnly cookie and returns the user. */
async function startSession(req: Request, res: Response, userId: string) {
  const { token, expiresAt } = await SessionService.create(userId, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  SessionService.setCookie(res, token, expiresAt);
  return AuthService.getCurrentUser(userId);
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await AuthService.register(req.body);
      const user = await startSession(req, res, userId);
      console.info(`[Auth] Registered user ${userId} (password)`);
      res.status(201).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await AuthService.login(req.body);
      const user = await startSession(req, res, userId);
      res.status(200).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  }

  static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.googleAuth(req.body);
      if (result.requiresDob) {
        res.status(200).json({ success: true, data: result });
        return;
      }
      const user = await startSession(req, res, result.userId);
      res.status(200).json({
        success: true,
        data: { requiresDob: false, isNewUser: result.isNewUser, user },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = await SessionService.revoke(SessionService.tokenFromRequest(req));
      if (sessionId) {
        // Drop realtime connections that were authenticated by the revoked session.
        getSocketServer()?.in(`session:${sessionId}`).disconnectSockets(true);
      }
      SessionService.clearCookie(res);
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  /** Session restoration: always 200 so an anonymous visit is not reported as an error. */
  /**
   * Public sign-in settings for the client. A Google OAuth client ID is public by design (it is
   * embedded in every page that shows the button); only the backend verifies tokens against it.
   */
  static config(_req: Request, res: Response): void {
    res.status(200).json({ success: true, data: { googleClientId: config.googleClientId || null } });
  }

  static async session(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = SessionService.tokenFromRequest(req);
      const session = await SessionService.resolve(token);
      if (!session) {
        if (token) SessionService.clearCookie(res);
        res.status(200).json({ success: true, data: { authenticated: false, user: null } });
        return;
      }
      const user = await AuthService.getCurrentUser(session.userId);
      res.status(200).json({ success: true, data: { authenticated: true, user } });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser(req.user!.userId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
}
