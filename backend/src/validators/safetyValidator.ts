import { z } from 'zod';
import { REPORT_CATEGORIES } from '../config/constants';
import { idSchema } from './common';

export const blockUserSchema = z.object({
  targetUserId: idSchema,
  reason: z.string().max(200).optional(),
});

export const reportUserSchema = z.object({
  reportedUserId: idSchema,
  category: z.enum(REPORT_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid report category' }),
  }),
  details: z.string().max(1000, 'Details cannot exceed 1000 characters').optional(),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type ReportUserInput = z.infer<typeof reportUserSchema>;
