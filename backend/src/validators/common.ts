import { z } from 'zod';

/** Every entity id in Unmute is a server-generated UUID. */
export const idSchema = z.string().uuid('Invalid id');

export const idParamsSchema = z.object({ id: idSchema });

/** Bounded pagination for list endpoints; query strings are coerced to integers. */
export function paginationSchema(defaultLimit: number, maxLimit: number) {
  return z.object({
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  });
}

export type Pagination = z.infer<ReturnType<typeof paginationSchema>>;
