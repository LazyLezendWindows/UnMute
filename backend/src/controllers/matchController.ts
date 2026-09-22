import { Response, NextFunction } from 'express';
import { MatchingService } from '../services/matchingService';
import { AuthRequest } from '../middleware/auth';

export class MatchController {
  static async getMatches(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const matches = await MatchingService.getMatches(req.user!.userId);
      res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (err) {
      next(err);
    }
  }
}
