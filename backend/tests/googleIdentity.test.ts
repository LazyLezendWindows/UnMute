import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OAuth2Client } from 'google-auth-library';
import { verifyGoogleCredential } from '../src/services/auth/googleIdentity';
import { config } from '../src/config/env';

// The real verifier runs against tokens signed with a local key. Only the download of Google's
// public certificates is replaced (with ours), so signature, issuer, audience and expiry checks
// are exercised exactly as in production.
const KID = 'test-key';
const signingKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function mintToken(claims: Record<string, unknown>, key = signingKey.privateKey, kid = KID): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'https://accounts.google.com',
    aud: config.googleClientId,
    sub: '1234567890',
    email: 'member@gmail.com',
    email_verified: true,
    name: 'Member',
    iat: now,
    exp: now + 3600,
    ...claims,
  };
  const signed = `${b64url({ alg: 'RS256', typ: 'JWT', kid })}.${b64url(payload)}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signed), key).toString('base64url');
  return `${signed}.${signature}`;
}

describe('verifyGoogleCredential (real verification path)', () => {
  beforeAll(() => {
    vi.spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync').mockResolvedValue({
      certs: { [KID]: signingKey.publicKey.export({ type: 'spki', format: 'pem' }).toString() },
    } as any);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('accepts a valid token and returns the identity it asserts', async () => {
    const identity = await verifyGoogleCredential(mintToken({}));
    expect(identity).toEqual({
      subject: '1234567890',
      email: 'member@gmail.com',
      emailVerified: true,
      emailIsGoogleManaged: true,
      name: 'Member',
      picture: '',
    });
  });

  it.each([
    ['a token signed by another key', () => mintToken({}, otherKey.privateKey)],
    ['a token for another client ID (audience)', () => mintToken({ aud: 'someone-else.apps.googleusercontent.com' })],
    ['an expired token', () => mintToken({ iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 })],
    ['a token from another issuer', () => mintToken({ iss: 'https://evil.example.com' })],
    ['a token without an email', () => mintToken({ email: undefined })],
    ['an unknown signing key', () => mintToken({}, signingKey.privateKey, 'unknown-kid')],
    ['a tampered payload', () => {
      const [header, , signature] = mintToken({}).split('.');
      return `${header}.${b64url({ iss: 'https://accounts.google.com', aud: config.googleClientId, sub: 'attacker', email: 'victim@gmail.com', email_verified: true, exp: Math.floor(Date.now() / 1000) + 3600 })}.${signature}`;
    }],
    ['garbage', () => 'not-a-jwt'],
  ])('rejects %s', async (_label, token) => {
    await expect(verifyGoogleCredential(token())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('reports an unverified email as unverified and not Google-managed', async () => {
    const identity = await verifyGoogleCredential(mintToken({ email_verified: false }));
    expect(identity.emailVerified).toBe(false);
    expect(identity.emailIsGoogleManaged).toBe(false);
  });

  it('treats a verified non-Gmail address as verified but not Google-managed', async () => {
    const identity = await verifyGoogleCredential(mintToken({ email: 'Member@Example.com' }));
    expect(identity.email).toBe('member@example.com');
    expect(identity.emailVerified).toBe(true);
    expect(identity.emailIsGoogleManaged).toBe(false);
  });

  it('treats a verified Workspace address (hd claim) as Google-managed', async () => {
    const identity = await verifyGoogleCredential(mintToken({ email: 'dev@company.test', hd: 'company.test' }));
    expect(identity.emailIsGoogleManaged).toBe(true);
  });

  it('accepts tokens issued for the configured iOS client, and only when one is configured', async () => {
    const ios = 'ios-client.apps.googleusercontent.com';
    await expect(verifyGoogleCredential(mintToken({ aud: ios }))).rejects.toMatchObject({ statusCode: 401 });
    (config as any).googleIosClientId = ios;
    try {
      await expect(verifyGoogleCredential(mintToken({ aud: ios }))).resolves.toMatchObject({ subject: '1234567890' });
      await expect(verifyGoogleCredential(mintToken({ aud: 'other.apps.googleusercontent.com' }))).rejects.toMatchObject({ statusCode: 401 });
    } finally {
      (config as any).googleIosClientId = '';
    }
  });

  it('refuses to verify anything when no client ID is configured', async () => {
    const original = config.googleClientId;
    (config as any).googleClientId = '';
    try {
      await expect(verifyGoogleCredential(mintToken({}))).rejects.toMatchObject({ statusCode: 503 });
    } finally {
      (config as any).googleClientId = original;
    }
  });
});
