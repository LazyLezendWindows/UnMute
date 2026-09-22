import { z } from 'zod';
import { REPORT_CATEGORIES } from '../config/constants';

export const blockUserSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  reason: z.string().max(200).optional(),
});

export const reportUserSchema = z.object({
  reportedUserId: z.string().min(1, 'Reported user ID is required'),
  category: z.enum(REPORT_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid report category' }),
  }),
  details: z.string().max(1000, 'Details cannot exceed 1000 characters').optional(),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type ReportUserInput = z.infer<typeof reportUserSchema>;
