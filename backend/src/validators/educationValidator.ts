import { z } from 'zod';
import { idSchema } from './common';

const currentYear = () => new Date().getFullYear();

export const institutionSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least 2 letters to search').max(100).optional(),
  stateId: idSchema.optional(),
  districtId: idSchema.optional(),
  kind: z.enum(['university', 'college', 'standalone']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(15),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

const yearSchema = z.number().int().min(1950, 'Enter a year after 1950');

export const setEducationSchema = z
  .object({
    institutionId: idSchema,
    course: z.string().trim().max(100, 'Course cannot exceed 100 characters').default(''),
    startYear: yearSchema.nullable().default(null),
    endYear: yearSchema.nullable().default(null),
  })
  .strict()
  .refine((e) => e.startYear === null || e.startYear <= currentYear(), {
    message: 'Start year cannot be in the future',
    path: ['startYear'],
  })
  .refine((e) => e.endYear === null || e.endYear <= currentYear() + 8, {
    message: 'End year is too far in the future',
    path: ['endYear'],
  })
  .refine((e) => e.startYear === null || e.endYear === null || e.endYear >= e.startYear, {
    message: 'End year cannot be before start year',
    path: ['endYear'],
  });

export type SetEducationInput = z.infer<typeof setEducationSchema>;
