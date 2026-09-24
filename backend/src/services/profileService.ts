import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { toOwnProfile } from '../mappers/profileMapper';
import { ProfileRepository } from '../repositories/profileRepository';
import { InterestRepository } from '../repositories/interestRepository';
import { UpdateProfileInput } from '../validators/profileValidator';
import { photoFolder, uploadedPhotoId } from '../utils/avatar';
import { PhotoService } from './photoService';
import { PhotoRepository } from '../repositories/photoRepository';

export class ProfileService {
  /** The signed-in user's own profile (includes date of birth). */
  static async getProfile(userId: string) {
    const [profile, interests, photos] = await Promise.all([
      ProfileRepository.findByUserId(userId),
      InterestRepository.forUser(userId),
      PhotoRepository.list(userId),
    ]);
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }
    return {
      ...toOwnProfile(profile, interests),
      // Uploaded photos in order; `isMain` marks the one shown as the profile photo.
      photos: photos.map((p) => ({ id: p.id, url: p.url, isMain: p.url === profile.avatar_url })),
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const current = await ProfileRepository.findByUserId(userId);
    if (!current) {
      throw new AppError('Profile not found', 404);
    }
    // An uploaded photo can only be made the main photo if it is one of the member's own.
    const uploadedId = uploadedPhotoId(input.avatarUrl);
    if (uploadedId && !uploadedId.startsWith(`${photoFolder(userId)}/`)) {
      throw new AppError('You can only use your own photos', 400);
    }
    const photos = await PhotoRepository.list(userId);
    if (uploadedId && !photos.some((p) => p.url === input.avatarUrl)) {
      throw new AppError('Upload the photo first', 400);
    }
    // Replacing an uploaded main photo (e.g. with a Google photo) removes that upload.
    const replacedUpload =
      input.avatarUrl !== undefined && input.avatarUrl !== current.avatar_url
        ? photos.find((p) => p.url === current.avatar_url)
        : undefined;

    const interestIds = input.interestIds !== undefined ? [...new Set(input.interestIds)] : undefined;
    if (interestIds && (await InterestRepository.countExisting(interestIds)) !== interestIds.length) {
      throw new AppError('One or more selected interests are no longer available', 400);
    }

    // Profile fields and the interest set change together or not at all.
    await getDatabase().transaction(async (tx) => {
      await ProfileRepository.update(tx, userId, {
        display_name: input.displayName,
        bio: input.bio,
        avatar_url: input.avatarUrl,
        interaction_preferences:
          input.interactionPreferences !== undefined ? JSON.stringify(input.interactionPreferences) : undefined,
        profession: input.profession,
        show_online: input.showOnline === undefined ? undefined : Number(input.showOnline),
      });
      if (interestIds !== undefined) {
        await InterestRepository.replaceForUser(tx, userId, interestIds);
      }
      if (replacedUpload) {
        await PhotoRepository.delete(tx, userId, replacedUpload.id);
        await PhotoRepository.reorder(tx, userId, photos.filter((p) => p !== replacedUpload).map((p) => p.id));
      }
    });

    if (replacedUpload) void PhotoService.deleteUploaded(replacedUpload.url);

    return this.getProfile(userId);
  }

  static getAllInterests() {
    return InterestRepository.listAll();
  }
}
