import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PhotoService } from '../services/photoService';

export class PhotoController {
  static createUpload(req: AuthRequest, res: Response, next: NextFunction): void {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ success: true, data: PhotoService.createUploadSignature(req.user!.userId) });
    } catch (err) {
      next(err);
    }
  }

  static async confirmUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await PhotoService.confirmUpload(req.user!.userId, req.body);
      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async removePhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await PhotoService.removePhoto(req.user!.userId);
      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
}
