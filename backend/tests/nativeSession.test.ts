import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io as connect } from 'socket.io-client';
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

const ANDROID = 'https://localhost';
const IOS = 'capacitor://localhost';
const PASSWORD = 'Password123!';

// Native sessions are opt-in (NATIVE_APP_ORIGINS); enable them before the app is built.
config.nativeAppOrigins.push(ANDROID, IOS);
config.corsOrigins.push(ANDROID, IOS);
const { createApp } = await import('../src/app');
const { initSocketServer } = await import('../src/sockets/chatSocket');
const app = createApp();

describe('Native app sessions (bearer tokens)', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await request(app).post('/api/v1/auth/register').send({ email: 'native@example.com', password: PASSWORD, displayName: 'Native', dateOfBirth: '1995-01-01' });
  });
  afterAll(() => {
    config.nativeAppOrigins.length = 0;
    config.corsOrigins.splice(config.corsOrigins.indexOf(ANDROID), 2);
  });
  beforeEach(() => {
    for (const ip of ['::ffff:127.0.0.1', '127.0.0.1', '::1']) authRateLimiter.resetKey(ip);
  });

  const login = (origin?: string) => {
    const req = request(app).post('/api/v1/auth/login');
    if (origin) req.set('Origin', origin);
    return req.send({ email: 'native@example.com', password: PASSWORD });
  };

  it('never gives the token to web pages', async () => {
    for (const origin of [undefined, 'http://localhost:5173']) {
      const res = await login(origin);
      expect(res.status).toBe(200);
      expect(res.body.data.sessionToken).toBeUndefined();
    }
  });

  it('refuses other sites outright (no token, no session)', async () => {
    const res = await login('https://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.data).toBeUndefined();
  });

  it('gives the Android and iOS apps a token that works as a bearer credential until logout', async () => {
    for (const origin of [ANDROID, IOS]) {
      const res = await login(origin);
      const token: string = res.body.data.sessionToken;
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const me = await request(app).get('/api/v1/auth/me').set('Origin', origin).set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(200);
      expect(me.body.data.email).toBe('native@example.com');

      const logout = await request(app).post('/api/v1/auth/logout').set('Origin', origin).set('Authorization', `Bearer ${token}`);
      expect(logout.status).toBe(200);
      expect((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    }
  });

  it('rejects malformed, unknown and non-bearer tokens', async () => {
    const token: string = (await login(ANDROID)).body.data.sessionToken;
    for (const header of ['Bearer', 'Bearer x', `Basic ${token}`, `Bearer ${token}!`, `Bearer ${'a'.repeat(43)}`, `bearer${token}`]) {
      expect((await request(app).get('/api/v1/auth/me').set('Authorization', header)).status, header).toBe(401);
    }
  });

  it('returns a token for native Google sign-in too', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .set('Origin', IOS)
      .send({ credential: fakeGoogleCredential('sub-native', 'native.google@gmail.com'), dateOfBirth: '1995-01-01' });
    expect(res.status).toBe(200);
    expect(res.body.data.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body.data.user.email).toBe('native.google@gmail.com');
  });

  it('authenticates the realtime socket with the token instead of a cookie', async () => {
    const server = http.createServer(app);
    initSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const open = (auth: Record<string, unknown>) =>
      new Promise<void>((resolve, reject) => {
        const socket = connect(url, { transports: ['websocket'], reconnection: false, auth, extraHeaders: { Origin: ANDROID } });
        socket.on('connect', () => {
          socket.disconnect();
          resolve();
        });
        socket.on('connect_error', reject);
      });
    try {
      const token: string = (await login(ANDROID)).body.data.sessionToken;
      await expect(open({ token })).resolves.toBeUndefined();
      await expect(open({ token: 'forged-token-forged-token' })).rejects.toThrow(/Authentication required/);
      await expect(open({ token: { $ne: null } })).rejects.toThrow(/Authentication required/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
