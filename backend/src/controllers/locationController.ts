import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GeocodingService } from '../services/location/geocoding.service';
import { UserLocationService } from '../services/location/geolocation.service';
import { ProfileService } from '../services/profileService';

export class LocationController {
  static async states(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await GeocodingService.states() });
    } catch (err) {
      next(err);
    }
  }

  static async children(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, limit, offset } = req.query as unknown as { q?: string; limit: number; offset: number };
      res.status(200).json({ success: true, data: await GeocodingService.children(req.params.id, q, limit, offset) });
    } catch (err) {
      next(err);
    }
  }

  static async search(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, kinds, stateId, limit } = req.query as any;
      res.status(200).json({ success: true, data: await GeocodingService.search(q, { kinds, stateId, limit }) });
    } catch (err) {
      next(err);
    }
  }

  static async pincode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await GeocodingService.describePincode(req.params.pincode) });
    } catch (err) {
      next(err);
    }
  }

  /** Responds with the updated own profile so the client can refresh in one round trip. */
  static async setMyLocation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserLocationService.setLocation(req.user!.userId, req.body);
      res.status(200).json({ success: true, data: await ProfileService.getProfile(req.user!.userId) });
    } catch (err) {
      next(err);
    }
  }

  static async updateMyPrecision(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserLocationService.setPrecision(req.user!.userId, req.body.precision);
      res.status(200).json({ success: true, data: await ProfileService.getProfile(req.user!.userId) });
    } catch (err) {
      next(err);
    }
  }

  static async clearMyLocation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserLocationService.clearLocation(req.user!.userId);
      res.status(200).json({ success: true, data: await ProfileService.getProfile(req.user!.userId) });
    } catch (err) {
      next(err);
    }
  }
}
