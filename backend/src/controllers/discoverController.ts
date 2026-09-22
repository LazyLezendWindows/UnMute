import { Response, NextFunction } from 'express';
import { DiscoverService } from '../services/discoverService';
import { AuthRequest } from '../middleware/auth';

export class DiscoverController {
  static async getFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const feed = await DiscoverService.getFeed(req.user!.userId, limit, offset);
      res.status(200).json({
        success: true,
        data: feed,
      });
    } catch (err) {
      next(err);
    }
  }
}
