import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token';
import { AuthService } from '../services/authService';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Check HttpOnly cookie session token first (Production Standard)
    const cookieToken = req.cookies?.unmute_session;
    if (cookieToken) {
      const sessionUser = await AuthService.verifySession(cookieToken);
      if (sessionUser) {
        req.user = { userId: sessionUser.userId, email: sessionUser.email };
        return next();
      }
    }

    // 2. Check Authorization header (Bearer token fallback for mobile Capacitor & API clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // Try JWT token verification
      const payload = verifyToken(token);
      if (payload) {
        req.user = payload;
        return next();
      }

      // Try session token verification
      const sessionUser = await AuthService.verifySession(token);
      if (sessionUser) {
        req.user = { userId: sessionUser.userId, email: sessionUser.email };
        return next();
      }
    }

    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
  } catch (err) {
    next(err);
  }
}
