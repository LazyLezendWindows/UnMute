import { Request, Response, NextFunction } from 'express';
import { ResolvedSession, SessionService } from '../services/sessionService';

export interface AuthRequest extends Request {
  user?: ResolvedSession;
}

/** Authenticates the request from the HttpOnly session cookie; the server is the only authority. */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await SessionService.resolve(SessionService.tokenFromRequest(req));
    if (!session) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in.',
      });
      return;
    }
    req.user = session;
    next();
  } catch (err) {
    next(err);
  }
}
