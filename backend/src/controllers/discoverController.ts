import { Response, NextFunction } from 'express';
import { DiscoverService } from '../services/discoverService';
import { AuthRequest } from '../middleware/auth';
import { Pagination } from '../validators/common';

export class DiscoverController {
  static async getFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = req.query as unknown as Pagination;
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
