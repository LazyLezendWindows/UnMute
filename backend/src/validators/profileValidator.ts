import { z } from 'zod';
import { idSchema } from './common';

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
  // Only https images: rejects javascript:, data: and plain-http URLs that would be rendered to other users.
  avatarUrl: z
    .string()
    .max(500)
    .url('Invalid avatar URL')
    .refine((url) => url.startsWith('https://'), 'Avatar URL must use https')
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
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
