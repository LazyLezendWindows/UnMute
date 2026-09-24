import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { config } from '../src/config/env';
import { createApp } from '../src/app';
import { AppError } from '../src/middleware/errorHandler';
import { authRateLimiter } from '../src/middleware/rateLimiter';
import { fakeGoogleCredential, resetTestDatabase } from './helpers';

vi.mock('../src/services/auth/googleIdentity', async () => {
  const { parseFakeGoogleCredential } = await import('./helpers');
  return {
    verifyGoogleCredential: vi.fn(async (credential: string) => {
      const identity = parseFakeGoogleCredential(credential);
      if (!identity) throw new AppError('Google sign-in could not be verified. Please try again.', 401);
      return identity;
    }),
  };
});

const app = createApp();
const PASSWORD = 'Password123!';
const register = (email: string) =>
  request(app).post('/api/v1/auth/register').send({ email, password: PASSWORD, displayName: 'Someone', dateOfBirth: '1995-01-01' });

describe('Google-only sign-up (password sign-up disabled)', () => {
  const original = config.passwordSignup;

  beforeAll(async () => {
    await resetTestDatabase();
    // An account created while password sign-up was still open.
    expect((await register('existing@example.com')).status).toBe(201);
    config.passwordSignup = false;
  });
  beforeEach(() => authRateLimiter.resetKey('::ffff:127.0.0.1'));
  afterAll(() => {
    config.passwordSignup = original;
  });

  it('is off by default in production and on elsewhere, unless ALLOW_PASSWORD_SIGNUP says otherwise', async () => {
    const load = async (env: Record<string, string | undefined>) => {
      vi.resetModules();
      const saved = { ...process.env };
      Object.assign(process.env, env);
      for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
      try {
        return (await import('../src/config/env')).config.passwordSignup;
      } finally {
        process.env = saved;
      }
    };
    expect(await load({ NODE_ENV: 'production', CORS_ORIGIN: 'https://x.test', ALLOW_PASSWORD_SIGNUP: undefined })).toBe(false);
    expect(await load({ NODE_ENV: 'production', CORS_ORIGIN: 'https://x.test', ALLOW_PASSWORD_SIGNUP: 'true' })).toBe(true);
    expect(await load({ NODE_ENV: 'development', ALLOW_PASSWORD_SIGNUP: undefined })).toBe(true);
    expect(await load({ NODE_ENV: 'development', ALLOW_PASSWORD_SIGNUP: 'false' })).toBe(false);
  });

  it('tells the client that sign-up is Google-only', async () => {
    const res = await request(app).get('/api/v1/auth/config');
    expect(res.body.data.passwordSignup).toBe(false);
  });

  it('refuses password sign-up identically for new and already-registered emails', async () => {
    const fresh = await register('new-person@example.com');
    const taken = await register('existing@example.com');
    for (const res of [fresh, taken]) {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PASSWORD_SIGNUP_DISABLED');
      expect(res.headers['set-cookie']).toBeUndefined();
    }
    expect(fresh.body).toEqual(taken.body); // nothing reveals which emails have accounts
  });

  it('still lets existing password accounts sign in', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'existing@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('existing@example.com');
  });

  it('creates new accounts through Google, with the 18+ date of birth step', async () => {
    const credential = fakeGoogleCredential('g-new-1', 'newcomer@gmail.com');
    const first = await request(app).post('/api/v1/auth/google').send({ credential });
    expect(first.body.data.requiresDob).toBe(true);

    const minor = await request(app).post('/api/v1/auth/google').send({ credential, dateOfBirth: '2015-01-01' });
    expect(minor.status).toBe(400);

    const done = await request(app).post('/api/v1/auth/google').send({ credential, dateOfBirth: '1996-05-05' });
    expect(done.status).toBe(200);
    expect(done.body.data).toMatchObject({ requiresDob: false, isNewUser: true });
    expect(done.body.data.user.email).toBe('newcomer@gmail.com');
  });
});
