import { z } from 'zod';
import { idSchema, paginationSchema } from './common';
import { pincodeSchema } from './locationValidator';
import { ALLOWED_RADII_KM } from '../services/location/distance.service';

const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
const ageSchema = z.coerce.number().int().min(18, 'Minimum age is 18').max(100, 'Maximum age is 100');

/** Discovery filters. Radius only takes fixed steps so repeated searches cannot pinpoint anyone. */
export const discoverQuerySchema = paginationSchema(20, 50)
  .extend({
    radiusKm: z.coerce
      .number()
      .refine((v) => (ALLOWED_RADII_KM as readonly number[]).includes(v), {
        message: `Distance must be one of ${ALLOWED_RADII_KM.join(', ')} km`,
      })
      .optional(),
    placeId: idSchema.optional(),
    pincode: pincodeSchema.optional(),
    institutionId: idSchema.optional(),
    sameInstitution: booleanQuery.optional(),
    minAge: ageSchema.optional(),
    maxAge: ageSchema.optional(),
  })
  .refine((q) => q.minAge === undefined || q.maxAge === undefined || q.minAge <= q.maxAge, {
    message: 'Minimum age cannot be above maximum age',
    path: ['minAge'],
  })
  .refine((q) => !(q.institutionId && q.sameInstitution), {
    message: 'Choose either a specific college or "same as mine", not both',
    path: ['institutionId'],
  });

export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
