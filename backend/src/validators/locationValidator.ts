import { z } from 'zod';
import { idSchema } from './common';

/** Indian PIN codes are six digits and never start with 0. */
export const pincodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

export const precisionSchema = z.enum(['locality', 'city', 'state'], {
  errorMap: () => ({ message: 'Choose how much of your area to show: locality, city or state' }),
});

const placeKindSchema = z.enum(['state', 'district', 'subdistrict', 'city', 'town', 'village']);

/** How a member sets their area: pick a place, enter a PIN code, or share the device position once. */
export const setLocationSchema = z.discriminatedUnion(
  'mode',
  [
    z.object({ mode: z.literal('place'), placeId: idSchema, precision: precisionSchema.default('city') }).strict(),
    z.object({ mode: z.literal('pincode'), pincode: pincodeSchema, precision: precisionSchema.default('city') }).strict(),
    z
      .object({
        mode: z.literal('device'),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        precision: precisionSchema.default('city'),
      })
      .strict(),
  ],
  { errorMap: () => ({ message: 'Choose a place, enter a PIN code, or use your current location' }) }
);

export type SetLocationInput = z.infer<typeof setLocationSchema>;

export const updatePrecisionSchema = z.object({ precision: precisionSchema }).strict();

export const placeSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least 2 letters to search').max(100),
  kinds: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const parsed = z.array(placeKindSchema).max(6).safeParse(v.split(','));
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Unknown place type' });
        return z.NEVER;
      }
      return parsed.data;
    }),
  stateId: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const placeChildrenQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const pincodeParamsSchema = z.object({ pincode: pincodeSchema });
