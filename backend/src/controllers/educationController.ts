import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { EducationService } from '../services/educationService';
import { ProfileService } from '../services/profileService';

export class EducationController {
  static async searchInstitutions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await EducationService.searchInstitutions(req.query as any) });
    } catch (err) {
      next(err);
    }
  }

  static async getInstitution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await EducationService.getInstitution(req.params.id) });
    } catch (err) {
      next(err);
    }
  }

  static async setMyEducation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await EducationService.setEducation(req.user!.userId, req.body);
      res.status(200).json({ success: true, data: await ProfileService.getProfile(req.user!.userId) });
    } catch (err) {
      next(err);
    }
  }

  static async clearMyEducation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await EducationService.clearEducation(req.user!.userId);
      res.status(200).json({ success: true, data: await ProfileService.getProfile(req.user!.userId) });
    } catch (err) {
      next(err);
    }
  }
}
