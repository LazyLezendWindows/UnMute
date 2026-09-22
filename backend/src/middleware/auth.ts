import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.',
    });
    return;
  }

  req.user = payload;
  next();
}
