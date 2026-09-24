import { z } from 'zod';
import { config } from '../config/env';
import { idSchema } from './common';

/** A first message to someone: the one introductory message of a chat request. */
export const createChatRequestSchema = z.object({
  recipientId: idSchema,
  content: z
    .string()
    .trim()
    .min(1, 'Write a short message to introduce yourself')
    // Read per request, so the limit follows configuration (CHAT_REQUEST_MESSAGE_MAX).
    .superRefine((value, ctx) => {
      const max = config.chatRequests.messageMaxLength;
      if (value.length > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Keep your first message under ${max} characters` });
      }
    }),
  /** Reused on retries, so a request's message is stored once. */
  clientMessageId: z.string().uuid('Invalid client message id').optional(),
});

export type CreateChatRequestInput = z.infer<typeof createChatRequestSchema>;
