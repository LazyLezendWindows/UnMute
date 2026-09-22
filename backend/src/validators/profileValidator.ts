import { z } from 'zod';

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
  approximateLocation: z
    .string()
    .max(100, 'Location cannot exceed 100 characters')
    .optional(),
  avatarUrl: z
    .string()
    .url('Invalid avatar URL')
    .or(z.string().length(0))
    .optional(),
  interactionPreferences: z
    .array(z.string().max(50))
    .max(10, 'Cannot select more than 10 interaction preferences')
    .optional(),
  interestIds: z
    .array(z.string())
    .max(15, 'Cannot select more than 15 interests')
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
