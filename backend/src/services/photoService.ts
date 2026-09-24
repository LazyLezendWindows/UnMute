import crypto from 'crypto';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { ProfileRepository } from '../repositories/profileRepository';
import { getDatabase } from '../config/database';
import { photoFolder, uploadedPhotoId } from '../utils/avatar';
import { ProfileService } from './profileService';

/**
 * Applied by Cloudinary before it stores an upload (an "incoming transformation"): photos are
 * scaled down to at most 1600px and re-encoded, which also removes their metadata (camera
 * details, GPS location). The original file is never kept.
 */
const INCOMING_TRANSFORMATION = 'c_limit,w_1600,h_1600/q_auto:good';
/** How profile photos are delivered: a 512px face-centred square in the best format per browser. */
const DELIVERY_TRANSFORMATION = 'c_fill,g_face,w_512,h_512/q_auto,f_auto';
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic,heif';

/**
 * Cloudinary's request signature: the parameters sorted by name, joined as `k=v&k=v`, followed by
 * the API secret, SHA-1 hashed (https://cloudinary.com/documentation/authentication_signatures).
 */
export function cloudinarySignature(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== '' && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(payload + apiSecret).digest('hex');
}

export function photoUrl(publicId: string, version: number): string {
  return `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/${DELIVERY_TRANSFORMATION}/v${version}/${publicId}`;
}

function requireEnabled() {
  if (!PhotoService.isEnabled()) {
    throw new AppError('Photo uploads are not available right now', 503);
  }
}

export class PhotoService {
  static isEnabled(): boolean {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    return Boolean(cloudName && apiKey && apiSecret);
  }

  /**
   * Permission for one direct browser-to-Cloudinary upload. Everything that matters is signed:
   * where the photo goes (a fresh ID in the member's own folder), the formats accepted and the
   * processing applied, so the browser cannot change any of it. Valid for one hour (Cloudinary).
   */
  static createUploadSignature(userId: string) {
    requireEnabled();
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    const params = {
      public_id: `${photoFolder(userId)}/${crypto.randomBytes(12).toString('hex')}`,
      timestamp: Math.floor(Date.now() / 1000),
      allowed_formats: ALLOWED_FORMATS,
      transformation: INCOMING_TRANSFORMATION,
    };
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: { ...params, api_key: apiKey, signature: cloudinarySignature(params, apiSecret) },
    };
  }

  /**
   * Makes an uploaded photo the member's profile photo. Cloudinary's response signature proves
   * the upload really happened, and the folder check that the photo is the member's own.
   */
  static async confirmUpload(userId: string, upload: { publicId: string; version: number; signature: string }) {
    requireEnabled();
    const expected = cloudinarySignature({ public_id: upload.publicId, version: upload.version }, config.cloudinary.apiSecret);
    const valid =
      upload.signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(upload.signature), Buffer.from(expected));
    if (!valid || !upload.publicId.startsWith(`${photoFolder(userId)}/`)) {
      throw new AppError('This photo upload could not be verified. Please try again.', 400);
    }
    return this.replacePhoto(userId, photoUrl(upload.publicId, upload.version));
  }

  static async removePhoto(userId: string) {
    return this.replacePhoto(userId, '');
  }

  private static async replacePhoto(userId: string, avatarUrl: string) {
    const current = await ProfileRepository.findByUserId(userId);
    if (!current) throw new AppError('Profile not found', 404);
    await getDatabase().transaction((tx) => ProfileRepository.update(tx, userId, { avatar_url: avatarUrl }));
    if (current.avatar_url !== avatarUrl) void this.deleteUploaded(current.avatar_url);
    return ProfileService.getProfile(userId);
  }

  /**
   * Deletes a photo from Cloudinary if it is one of ours (other URLs, e.g. Google photos, are
   * left alone). Best effort: a failure leaves an orphaned file, never a failed request.
   */
  static async deleteUploaded(avatarUrl: string | null | undefined): Promise<void> {
    const publicId = uploadedPhotoId(avatarUrl);
    if (!publicId || !this.isEnabled()) return;
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: 'true' };
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        body: new URLSearchParams({
          ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
          api_key: apiKey,
          signature: cloudinarySignature(params, apiSecret),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) console.warn('[Photos] Cloudinary delete failed:', res.status);
    } catch (err) {
      console.warn('[Photos] Cloudinary delete failed:', (err as Error).message);
    }
  }
}
