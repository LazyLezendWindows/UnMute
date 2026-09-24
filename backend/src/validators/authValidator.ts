import { z } from 'zod';
import { isAtLeast18YearsOld, isPlausibleDateOfBirth } from '../utils/age';

/** Enforced server-side for every signup path: a real calendar date, then the 18+ policy. */
const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
  .refine((dob) => isPlausibleDateOfBirth(dob), { message: 'Please enter a valid date of birth' })
  .refine((dob) => !isPlausibleDateOfBirth(dob) || isAtLeast18YearsOld(dob), {
    message: 'You must be at least 18 years of age to join Unmute',
  });

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password is too long'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters'),
  dateOfBirth: dateOfBirthSchema,
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Only the Google ID token is accepted; profile fields are read from the verified token server-side.
// `.strict()` rejects client-asserted identity fields (email, googleId, ...) outright.
export const googleAuthSchema = z
  .object({
    credential: z.string().min(20, 'Google credential is required').max(4096),
    dateOfBirth: dateOfBirthSchema.optional(),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
