import { z } from 'zod';
import { idSchema, paginationSchema } from './common';

export const reportListQuerySchema = paginationSchema(25, 100).extend({
  status: z.enum(['pending', 'reviewed', 'resolved', 'rejected']).default('pending'),
});

const note = z.string().trim().max(2000, 'Note cannot exceed 2000 characters');

export const reportDecisionSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'rejected']),
  note: note.default(''),
  suspendUser: z.boolean().default(false),
});

export const suspendSchema = z.object({
  note: note.min(1, 'Explain why the account is suspended'),
  reportId: idSchema.optional(),
});

export const unsuspendSchema = z.object({
  note: note.min(1, 'Explain why the suspension is lifted'),
});

export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type ReportDecisionInput = z.infer<typeof reportDecisionSchema>;
