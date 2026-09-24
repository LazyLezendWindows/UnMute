import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AccountService } from '../services/accountService';
import { SessionService } from '../services/sessionService';

export class AccountController {
  static async exportData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AccountService.exportData(req.user!.userId);
      res.setHeader('Content-Disposition', 'attachment; filename="unmute-data-export.json"');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async deactivate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await AccountService.deactivate(req.user!.userId);
      SessionService.clearCookie(res);
      res.status(200).json({ success: true, message: 'Your account has been deactivated. Sign in again any time to reactivate it.' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await AccountService.deleteAccount(req.user!);
      SessionService.clearCookie(res);
      res.status(200).json({ success: true, message: 'Your account has been permanently deleted.' });
    } catch (err) {
      next(err);
    }
  }
}
