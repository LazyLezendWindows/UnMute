import { z } from 'zod';

export const interactionSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
});

export type InteractionInput = z.infer<typeof interactionSchema>;
