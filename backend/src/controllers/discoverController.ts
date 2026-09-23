import { Response, NextFunction } from 'express';
import { DiscoverService } from '../services/discoverService';
import { AuthRequest } from '../middleware/auth';
import { DiscoverQuery } from '../validators/discoverValidator';

export class DiscoverController {
  static async getFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feed = await DiscoverService.getFeed(req.user!.userId, req.query as unknown as DiscoverQuery);
      res.status(200).json({
        success: true,
        data: feed,
      });
    } catch (err) {
      next(err);
    }
  }
}
