import { z } from 'zod';
import { idSchema } from './common';

export const interactionSchema = z.object({
  targetUserId: idSchema,
});

export type InteractionInput = z.infer<typeof interactionSchema>;
