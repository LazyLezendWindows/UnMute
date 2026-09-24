import { z } from 'zod';
import { idSchema } from './common';
import { isAllowedAvatarUrl } from '../utils/avatar';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio cannot exceed 500 characters')
    .optional(),
  // Only https images from allowed hosts (see isAllowedAvatarUrl); an empty string removes the photo.
  avatarUrl: z
    .string()
    .max(500)
    .url('Invalid avatar URL')
    .refine(isAllowedAvatarUrl, 'Upload a photo or use your Google profile photo')
    .or(z.string().length(0))
    .optional(),
  interactionPreferences: z
    .array(z.string().max(50))
    .max(10, 'Cannot select more than 10 interaction preferences')
    .optional(),
  interestIds: z
    .array(idSchema)
    .max(15, 'Cannot select more than 15 interests')
    .optional(),
  profession: z.string().trim().max(80, 'Profession cannot exceed 80 characters').optional(),
  /** Whether other members may see when you are online. */
  showOnline: z.boolean().optional(),
});

/** Deleting an account is irreversible, so the client must send an explicit confirmation. */
export const deleteAccountSchema = z.object({
  confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm account deletion' }) }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** What the browser reports back after uploading a photo to Cloudinary (Cloudinary's own response fields). */
export const confirmPhotoSchema = z.object({
  publicId: z.string().max(200).regex(/^[A-Za-z0-9_/-]+$/, 'Invalid photo'),
  version: z.number().int().positive(),
  signature: z.string().regex(/^[a-f0-9]{40}$/, 'Invalid photo'),
});

export const photoParamsSchema = z.object({ photoId: idSchema });
