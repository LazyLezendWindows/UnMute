import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ModerationService } from '../services/moderationService';
import { ReportDecisionInput, ReportListQuery } from '../validators/moderationValidator';

export class ModerationController {
  static async listReports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, limit, offset } = req.query as unknown as ReportListQuery;
      res.status(200).json({ success: true, data: await ModerationService.listReports(status, limit, offset) });
    } catch (err) {
      next(err);
    }
  }

  static async getReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await ModerationService.getReport(req.params.id) });
    } catch (err) {
      next(err);
    }
  }

  static async decideReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ModerationService.decideReport(req.user!.userId, req.params.id, req.body as ReportDecisionInput);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async suspend(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ModerationService.suspend(req.user!.userId, req.params.id, req.body.note, req.body.reportId);
      res.status(200).json({ success: true, message: 'Account suspended' });
    } catch (err) {
      next(err);
    }
  }

  static async unsuspend(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ModerationService.unsuspend(req.user!.userId, req.params.id, req.body.note);
      res.status(200).json({ success: true, message: 'Suspension lifted' });
    } catch (err) {
      next(err);
    }
  }
}
