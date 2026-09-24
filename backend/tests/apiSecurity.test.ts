import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
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
const ID = '00000000-0000-4000-8000-000000000000';

describe('API security', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await request(app).post('/api/v1/auth/register').send({ email: 'known@example.com', password: PASSWORD, displayName: 'Known', dateOfBirth: '1995-01-01' });
    await request(app).post('/api/v1/auth/google').send({ credential: fakeGoogleCredential('sub-google-only', 'googleonly@gmail.com'), dateOfBirth: '1995-01-01' });
  });
  beforeEach(() => {
    for (const ip of ['::ffff:127.0.0.1', '127.0.0.1', '::1']) authRateLimiter.resetKey(ip);
  });

  it('answers unknown emails, Google-only accounts and wrong passwords identically (no enumeration)', async () => {
    const attempts = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: PASSWORD }),
      request(app).post('/api/v1/auth/login').send({ email: 'googleonly@gmail.com', password: PASSWORD }),
      request(app).post('/api/v1/auth/login').send({ email: 'known@example.com', password: 'wrong-password' }),
    ]);
    for (const res of attempts) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual(attempts[0].body);
    }
  });

  it('rejects anonymous requests to every protected endpoint', async () => {
    const endpoints: [string, string][] = [
      ['get', '/api/v1/auth/me'],
      ['get', '/api/v1/users/me'], ['patch', '/api/v1/users/me'], ['delete', '/api/v1/users/me'],
      ['get', '/api/v1/users/me/export'], ['post', '/api/v1/users/me/deactivate'], ['get', '/api/v1/users/interests'],
      ['put', '/api/v1/users/me/location'], ['delete', '/api/v1/users/me/location'], ['put', '/api/v1/users/me/education'],
      ['get', '/api/v1/discover'], ['post', '/api/v1/interactions/like'], ['post', '/api/v1/interactions/pass'],
      ['get', '/api/v1/matches'], ['get', '/api/v1/conversations'],
      ['get', `/api/v1/conversations/${ID}/messages`], ['post', `/api/v1/conversations/${ID}/messages`],
      ['post', '/api/v1/safety/block'], ['delete', `/api/v1/safety/blocks/${ID}`], ['get', '/api/v1/safety/blocked'],
      ['post', '/api/v1/safety/reports'], ['get', '/api/v1/locations/search?q=hyd'], ['get', '/api/v1/locations/states'],
      ['get', '/api/v1/education/institutions?q=iit'], ['get', '/api/v1/moderation/reports'],
    ];
    for (const [method, path] of endpoints) {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  it('blocks state-changing requests from other sites (CSRF), even with a valid session cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'known@example.com', password: PASSWORD });
    const res = await agent.patch('/api/v1/users/me').set('Origin', 'https://evil.example').send({ displayName: 'Pwned' });
    expect(res.status).toBe(403);
    expect((await agent.get('/api/v1/users/me')).body.data.displayName).toBe('Known');
  });

  it('rejects oversized bodies without leaking internals', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ success: false, error: 'Request body is too large' });
  });

  it('treats injection-style input as plain data', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'known@example.com', password: PASSWORD });
    for (const q of ["' OR 1=1 --", '%', '_', '"; DROP TABLE users; --', '\\']) {
      const places = await agent.get('/api/v1/locations/search').query({ q });
      expect([200, 400]).toContain(places.status);
      const colleges = await agent.get('/api/v1/education/institutions').query({ q });
      expect([200, 400]).toContain(colleges.status);
    }
    // Names are stored and returned verbatim (escaping is the renderer's job; the SPA never uses v-html).
    const xss = '<img src=x onerror=alert(1)>';
    const res = await agent.patch('/api/v1/users/me').send({ bio: xss });
    expect(res.body.data.bio).toBe(xss);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect((await agent.get('/api/v1/users/me')).status).toBe(200);
  });

  it('returns timestamps as UTC ISO-8601 strings', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'known@example.com', password: PASSWORD });
    const data = (await agent.get('/api/v1/users/me/export')).body.data;
    expect(data.account.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(data.sessions[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  describe('production headers', () => {
    let prod: ReturnType<typeof createApp>;
    beforeAll(() => {
      (config as any).isProduction = true;
      try {
        prod = createApp();
      } finally {
        (config as any).isProduction = false;
      }
    });

    it('sends a CSP that allows Google sign-in, fonts and profile photos, and nothing else external', async () => {
      const res = await request(prod).get('/health');
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("script-src 'self' https://accounts.google.com/gsi/client");
      expect(csp).toContain('frame-src https://accounts.google.com/gsi/');
      // The service worker's runtime font cache fetches under connect-src (repeat visits).
      expect(csp).toContain("connect-src 'self' https://accounts.google.com/gsi/ https://fonts.googleapis.com https://fonts.gstatic.com");
      expect(csp).toContain("img-src 'self' data: blob: https://*.googleusercontent.com");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toMatch(/script-src[^;]*('unsafe-inline'|'unsafe-eval'|\*(?!\.))/);
      expect(res.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
      expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });
});
