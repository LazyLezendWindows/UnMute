import rateLimit, { Options, Store } from 'express-rate-limit';
import { AuthRequest } from './auth';

/**
 * Where hit counts live. In memory is correct for the current deployment: a single Node process
 * (Render/Fly free instances do not cluster). Running several instances would let a client spread
 * attempts across them; at that point return a shared store here (e.g. `rate-limit-redis`), and
 * every limiter below moves with it without touching the routes.
 */
function sharedStore(): Store | undefined {
  return undefined;
}

function limiter(options: Partial<Options> & { max: number; windowMs: number }) {
  const store = sharedStore();
  return rateLimit({ standardHeaders: true, legacyHeaders: false, ...(store ? { store } : {}), ...options });
}

export const authRateLimiter = limiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

export const apiRateLimiter = limiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
});

/** Per-account cap on abuse reports (must run after requireAuth). */
export const reportRateLimiter = limiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => (req as AuthRequest).user!.userId,
  message: {
    success: false,
    error: 'You have submitted many reports recently. Please try again later.',
  },
});

/**
 * Per-account cap on changing one's area (must run after requireAuth). Moving a search origin
 * around repeatedly is how distance-based apps get trilaterated.
 */
export const locationRateLimiter = limiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => (req as AuthRequest).user!.userId,
  message: {
    success: false,
    error: 'You have changed your area many times recently. Please try again later.',
  },
});

/**
 * Per-account cap on sending chat messages (must run after requireAuth): generous for a real
 * conversation, but stops scripted flooding of a match.
 */
export const messageRateLimiter = limiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req) => (req as AuthRequest).user!.userId,
  message: {
    success: false,
    error: 'You are sending messages too quickly. Please wait a moment.',
  },
});

/** Per-account cap on photo upload permissions (must run after requireAuth); uploads use free-plan quota. */
export const photoRateLimiter = limiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => (req as AuthRequest).user!.userId,
  message: {
    success: false,
    error: 'You have changed your photo many times recently. Please try again later.',
  },
});
