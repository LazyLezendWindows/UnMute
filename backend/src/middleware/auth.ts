import { Request, Response, NextFunction } from 'express';
import { ResolvedSession, SessionService } from '../services/sessionService';
import { UserRole } from '../repositories/userRepository';

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

/**
 * Restricts a route to staff (must run after requireAuth). Everyone else gets the same 404 as an
 * unknown route, so ordinary members cannot even discover that moderation endpoints exist.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(404).json({ success: false, error: 'Resource not found' });
      return;
    }
    next();
  };
}
