import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';

function setSessionCookie(res: Response, sessionToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('unmute_session', sessionToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

function clearSessionCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('unmute_session', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      if (result.sessionToken) {
        setSessionCookie(res, result.sessionToken);
      }
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      if (result.sessionToken) {
        setSessionCookie(res, result.sessionToken);
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.googleAuth(req.body);
      if (result.sessionToken) {
        setSessionCookie(res, result.sessionToken);
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async snapchatAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.snapchatAuth(req.body);
      if (result.sessionToken) {
        setSessionCookie(res, result.sessionToken);
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async instagramAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.instagramAuth(req.body);
      if (result.sessionToken) {
        setSessionCookie(res, result.sessionToken);
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionToken = req.cookies?.unmute_session;
      if (sessionToken) {
        await AuthService.revokeSession(sessionToken);
      }
      clearSessionCookie(res);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async session(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const user = await AuthService.getCurrentUser(req.user.userId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    return AuthController.session(req, res, next);
  }
}
