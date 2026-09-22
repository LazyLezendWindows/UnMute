import { Response, NextFunction } from 'express';
import { SafetyService } from '../services/safetyService';
import { AuthRequest } from '../middleware/auth';

export class SafetyController {
  static async blockUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { targetUserId, reason } = req.body;
      const result = await SafetyService.blockUser(req.user!.userId, targetUserId, reason);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async unblockUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { targetUserId } = req.body;
      const result = await SafetyService.unblockUser(req.user!.userId, targetUserId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getBlockedUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SafetyService.getBlockedUsers(req.user!.userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reportUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportedUserId, category, details } = req.body;
      const result = await SafetyService.reportUser(
        req.user!.userId,
        reportedUserId,
        category,
        details
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
