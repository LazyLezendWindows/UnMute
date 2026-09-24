import crypto from 'crypto';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { ProfileRepository } from '../repositories/profileRepository';
import { getDatabase, IDatabase } from '../config/database';
import { cloudinaryAssetId, photoFolder } from '../utils/avatar';
import { PhotoRepository, PhotoRow } from '../repositories/photoRepository';
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

/** Photos a member may have (the brief: a grid of six). */
export const MAX_PHOTOS = 6;

export interface UploadReceipt {
  publicId: string;
  version: number;
  signature: string;
}

const tooMany = () => new AppError(`You can have up to ${MAX_PHOTOS} photos. Remove one to add another.`, 400, 'TOO_MANY_PHOTOS');

/** Chat photos: scaled to fit 1200px, in the best format per browser. */
export function chatPhotoUrl(publicId: string, version: number): string {
  return `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/c_limit,w_1200,h_1200/q_auto,f_auto/v${version}/${publicId}`;
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
   * Permission for one direct browser-to-Cloudinary upload into `folder`. Everything that matters
   * is signed: where the photo goes (a fresh ID in that folder), the formats accepted and the
   * processing applied, so the browser cannot change any of it. Valid for one hour (Cloudinary).
   */
  static signUpload(folder: string) {
    requireEnabled();
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    const params = {
      public_id: `${folder}/${crypto.randomBytes(12).toString('hex')}`,
      timestamp: Math.floor(Date.now() / 1000),
      allowed_formats: ALLOWED_FORMATS,
      transformation: INCOMING_TRANSFORMATION,
    };
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: { ...params, api_key: apiKey, signature: cloudinarySignature(params, apiSecret) },
    };
  }

  static createUploadSignature(userId: string) {
    return this.signUpload(photoFolder(userId));
  }

  /**
   * Checks what the browser reports after an upload: Cloudinary's response signature proves the
   * upload really happened, and the folder that it went where this permission allowed.
   */
  static verifyUpload(folder: string, upload: UploadReceipt): void {
    requireEnabled();
    const expected = cloudinarySignature({ public_id: upload.publicId, version: upload.version }, config.cloudinary.apiSecret);
    const valid =
      upload.signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(upload.signature), Buffer.from(expected));
    if (!valid || !upload.publicId.startsWith(`${folder}/`)) {
      throw new AppError('This photo upload could not be verified. Please try again.', 400);
    }
  }

  /** Replaces the main photo with an upload (the previous uploaded main photo is deleted). */
  static async confirmUpload(userId: string, upload: UploadReceipt) {
    this.verifyUpload(photoFolder(userId), upload);
    const url = photoUrl(upload.publicId, upload.version);
    const removed = await getDatabase().transaction(async (tx) => {
      const profile = await PhotoRepository.lockFor(tx, userId);
      if (!profile) throw new AppError('Profile not found', 404);
      const photos = await PhotoRepository.list(userId, tx);
      const oldMain = photos.find((p) => p.url === profile.avatar_url);
      if (oldMain) await PhotoRepository.delete(tx, userId, oldMain.id);
      else if (photos.length >= MAX_PHOTOS) throw tooMany();
      // A free slot (existing positions are 0-5); reorder() then puts it first.
      const id = await PhotoRepository.insert(tx, userId, url, 99);
      await PhotoRepository.reorder(tx, userId, [id, ...photos.filter((p) => p !== oldMain).map((p) => p.id)]);
      await ProfileRepository.update(tx, userId, { avatar_url: url });
      return oldMain?.url ?? profile.avatar_url;
    });
    if (removed !== url) void this.deleteUploaded(removed);
    return ProfileService.getProfile(userId);
  }

  /** Adds an upload to the member's photos (it becomes the main photo if there is none). */
  static async addPhoto(userId: string, upload: UploadReceipt) {
    this.verifyUpload(photoFolder(userId), upload);
    const url = photoUrl(upload.publicId, upload.version);
    await getDatabase().transaction(async (tx) => {
      const profile = await PhotoRepository.lockFor(tx, userId);
      if (!profile) throw new AppError('Profile not found', 404);
      const photos = await PhotoRepository.list(userId, tx);
      if (photos.some((p) => p.url === url)) return; // a retried confirmation
      if (photos.length >= MAX_PHOTOS) throw tooMany();
      await PhotoRepository.insert(tx, userId, url, photos.length);
      if (!profile.avatar_url) await ProfileRepository.update(tx, userId, { avatar_url: url });
    });
    return ProfileService.getProfile(userId);
  }

  /** Makes one of the member's uploads the main photo (first in the order, and the avatar). */
  static async setMain(userId: string, photoId: string) {
    await getDatabase().transaction(async (tx) => {
      await PhotoRepository.lockFor(tx, userId);
      const photos = await PhotoRepository.list(userId, tx);
      const chosen = photos.find((p) => p.id === photoId);
      if (!chosen) throw new AppError('Photo not found', 404);
      await PhotoRepository.reorder(tx, userId, [chosen.id, ...photos.filter((p) => p !== chosen).map((p) => p.id)]);
      await ProfileRepository.update(tx, userId, { avatar_url: chosen.url });
    });
    return ProfileService.getProfile(userId);
  }

  /** Deletes one upload; if it was the main photo, the next one takes its place. */
  static async removePhotoById(userId: string, photoId: string) {
    const removed = await getDatabase().transaction(async (tx) => {
      const profile = await PhotoRepository.lockFor(tx, userId);
      const photos = await PhotoRepository.list(userId, tx);
      const target = photos.find((p) => p.id === photoId);
      if (!profile || !target) throw new AppError('Photo not found', 404);
      await this.removeWithin(tx, userId, profile.avatar_url, photos, target);
      return target.url;
    });
    void this.deleteUploaded(removed);
    return ProfileService.getProfile(userId);
  }

  /** Removes the main photo (an upload or a Google photo); the next upload, if any, takes its place. */
  static async removePhoto(userId: string) {
    const removed = await getDatabase().transaction(async (tx) => {
      const profile = await PhotoRepository.lockFor(tx, userId);
      if (!profile) throw new AppError('Profile not found', 404);
      const photos = await PhotoRepository.list(userId, tx);
      const main = photos.find((p) => p.url === profile.avatar_url);
      if (main) await this.removeWithin(tx, userId, profile.avatar_url, photos, main);
      else await ProfileRepository.update(tx, userId, { avatar_url: photos[0]?.url ?? '' });
      return profile.avatar_url;
    });
    void this.deleteUploaded(removed);
    return ProfileService.getProfile(userId);
  }

  private static async removeWithin(tx: IDatabase, userId: string, avatarUrl: string, photos: PhotoRow[], target: PhotoRow) {
    const rest = photos.filter((p) => p !== target);
    await PhotoRepository.delete(tx, userId, target.id);
    await PhotoRepository.reorder(tx, userId, rest.map((p) => p.id));
    if (avatarUrl === target.url) await ProfileRepository.update(tx, userId, { avatar_url: rest[0]?.url ?? '' });
  }

  /** Deletes every upload of a member from Cloudinary (after their account is deleted). */
  static async deleteAllFor(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.deleteUploaded(url)));
  }

  /**
   * Deletes a photo from Cloudinary if it is one of ours (other URLs, e.g. Google photos, are
   * left alone). Best effort: a failure leaves an orphaned file, never a failed request.
   */
  static async deleteUploaded(url: string | null | undefined): Promise<void> {
    const publicId = cloudinaryAssetId(url);
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
