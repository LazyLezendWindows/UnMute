import { z } from 'zod';

const base64url = (max: number) =>
  z.string().min(1).max(max).regex(/^[A-Za-z0-9_-]+=*$/, 'Invalid key');

/** A browser PushSubscription, as `subscription.toJSON()` produces it. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: base64url(255),
    auth: base64url(255),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
