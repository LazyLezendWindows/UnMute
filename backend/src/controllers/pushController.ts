import { Response, NextFunction } from 'express';
import { PushService } from '../services/pushService';
import { AuthRequest } from '../middleware/auth';

export class PushController {
  static async getConfig(_req: AuthRequest, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: PushService.publicConfig() });
  }

  static async subscribe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PushService.subscribe(req.user!.userId, req.user!.sessionId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async unsubscribe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PushService.unsubscribe(req.user!.sessionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
