import { Response, NextFunction } from 'express';
import { MatchingService } from '../services/matchingService';
import { AuthRequest } from '../middleware/auth';

export class InteractionController {
  static async like(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { targetUserId } = req.body;
      const result = await MatchingService.recordLike(req.user!.userId, targetUserId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async pass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { targetUserId } = req.body;
      const result = await MatchingService.recordPass(req.user!.userId, targetUserId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async incomingLikes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await MatchingService.getIncomingLikes(req.user!.userId) });
    } catch (err) {
      next(err);
    }
  }
}
