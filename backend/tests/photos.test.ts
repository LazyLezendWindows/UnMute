import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { config } from '../src/config/env';
import { authRateLimiter } from '../src/middleware/rateLimiter';
import { cloudinarySignature } from '../src/services/photoService';
import { resetTestDatabase } from './helpers';

const CLOUD = { cloudName: 'unmute-test', apiKey: '123456789012345', apiSecret: 'test-api-secret-value' };
const PASSWORD = 'Password123!';
const GOOGLE_PHOTO = 'https://lh3.googleusercontent.com/a/member-photo';

// Cloudinary itself is not called: the browser uploads to it directly, and the server only
// signs requests and deletes old photos (captured here instead of sent).
const destroyed: Record<string, string>[] = [];
const realFetch = globalThis.fetch;

Object.assign(config.cloudinary, CLOUD);
const { createApp } = await import('../src/app');
const app = createApp();

async function member(email: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: PASSWORD, displayName: 'Photo Member', dateOfBirth: '1995-05-05' });
  expect(res.status).toBe(201);
  return { agent, id: res.body.data.user.id as string };
}

/** What Cloudinary answers after a successful upload: its signature covers public_id and version. */
function cloudinaryResponse(publicId: string, version = 1712345678) {
  return { publicId, version, signature: cloudinarySignature({ public_id: publicId, version }, CLOUD.apiSecret) };
}

async function upload(m: Awaited<ReturnType<typeof member>>) {
  const res = await m.agent.post('/api/v1/users/me/photo/upload');
  expect(res.status).toBe(200);
  return res.body.data as { uploadUrl: string; fields: Record<string, string | number> };
}

const waitForDestroy = () => new Promise((r) => setTimeout(r, 50));

describe('Profile photo uploads (Cloudinary)', () => {
  let a: Awaited<ReturnType<typeof member>>;
  let b: Awaited<ReturnType<typeof member>>;

  beforeAll(async () => {
    await resetTestDatabase();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).startsWith('https://api.cloudinary.com/')) {
        destroyed.push({ url: String(url), ...Object.fromEntries(new URLSearchParams(String(init?.body))) });
        return new Response('{"result":"ok"}', { status: 200 });
      }
      return realFetch(url, init);
    });
    a = await member('photo-a@example.com');
    b = await member('photo-b@example.com');
  });
  beforeEach(() => {
    destroyed.length = 0;
    authRateLimiter.resetKey('::ffff:127.0.0.1');
  });
  afterAll(() => {
    vi.restoreAllMocks();
    Object.assign(config.cloudinary, { cloudName: '', apiKey: '', apiSecret: '' });
  });

  it("signs requests exactly as Cloudinary documents (its published example)", () => {
    expect(
      cloudinarySignature({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd')
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('tells the client uploads are available', async () => {
    const res = await request(app).get('/api/v1/auth/config');
    expect(res.body.data.photoUploads).toBe(true);
  });

  it('issues a signed upload into the member’s own folder, with processing the browser cannot change', async () => {
    expect((await request(app).post('/api/v1/users/me/photo/upload')).status).toBe(401);
    const { uploadUrl, fields } = await upload(a);
    expect(uploadUrl).toBe('https://api.cloudinary.com/v1_1/unmute-test/image/upload');
    expect(String(fields.public_id)).toMatch(new RegExp(`^unmute/avatars/${a.id}/[a-f0-9]{24}$`));
    expect(fields.transformation).toBe('c_limit,w_1600,h_1600/q_auto:good');
    expect(fields.allowed_formats).toBe('jpg,jpeg,png,webp,heic,heif');
    expect(Math.abs(Number(fields.timestamp) - Date.now() / 1000)).toBeLessThan(5);
    expect(fields.api_key).toBe(CLOUD.apiKey);
    const { signature, api_key: _key, ...signed } = fields;
    expect(signature).toBe(cloudinarySignature(signed, CLOUD.apiSecret));
    // Changing any signed field (e.g. writing into someone else's folder) breaks the signature.
    expect(cloudinarySignature({ ...signed, public_id: `unmute/avatars/${b.id}/x` }, CLOUD.apiSecret)).not.toBe(signature);
    expect(JSON.stringify(fields)).not.toContain(CLOUD.apiSecret);
    // A fresh destination every time.
    expect((await upload(a)).fields.public_id).not.toBe(fields.public_id);
  });

  it('sets a verified upload as the profile photo, delivered as a face-centred square', async () => {
    const { fields } = await upload(a);
    const res = await a.agent.put('/api/v1/users/me/photo').send(cloudinaryResponse(String(fields.public_id)));
    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toBe(
      `https://res.cloudinary.com/unmute-test/image/upload/c_fill,g_face,w_512,h_512/q_auto,f_auto/v1712345678/${fields.public_id}`
    );
    expect(destroyed).toHaveLength(0); // there was no previous upload to delete
  });

  it('rejects confirmations Cloudinary did not sign, or for another member’s folder', async () => {
    const { fields } = await upload(a);
    const good = cloudinaryResponse(String(fields.public_id));
    const bad = [
      { ...good, signature: 'f'.repeat(40) },
      { ...good, version: good.version + 1 }, // signature no longer matches
      cloudinaryResponse(`unmute/avatars/${b.id}/stolen`), // validly signed, but B's photo
      cloudinaryResponse('someone-else/photo'),
    ];
    for (const body of bad) {
      expect((await a.agent.put('/api/v1/users/me/photo').send(body)).status).toBe(400);
    }
    expect((await a.agent.put('/api/v1/users/me/photo').send({ publicId: '../../x', version: 1, signature: 'x' })).status).toBe(400);
  });

  it('does not let members point their photo at another member’s upload or another Cloudinary account', async () => {
    const bPhoto = await b.agent.put('/api/v1/users/me/photo').send(cloudinaryResponse(`unmute/avatars/${b.id}/mine`));
    const bUrl = bPhoto.body.data.avatarUrl;
    expect((await a.agent.patch('/api/v1/users/me').send({ avatarUrl: bUrl })).status).toBe(400);
    const otherAccount = bUrl.replace('/unmute-test/', '/attacker-cloud/');
    expect((await a.agent.patch('/api/v1/users/me').send({ avatarUrl: otherAccount })).status).toBe(400);
  });

  it('deletes the previous upload from Cloudinary when the photo is replaced or removed', async () => {
    const before = (await a.agent.get('/api/v1/users/me')).body.data.avatarUrl as string;
    const oldId = before.split('/v1712345678/')[1];

    const { fields } = await upload(a);
    await a.agent.put('/api/v1/users/me/photo').send(cloudinaryResponse(String(fields.public_id), 1712349999));
    await waitForDestroy();
    expect(destroyed).toHaveLength(1);
    const call = destroyed[0];
    expect(call.url).toBe('https://api.cloudinary.com/v1_1/unmute-test/image/destroy');
    expect(call.public_id).toBe(oldId);
    expect(call.invalidate).toBe('true');
    expect(call.signature).toBe(
      cloudinarySignature({ public_id: oldId, timestamp: call.timestamp, invalidate: 'true' }, CLOUD.apiSecret)
    );

    destroyed.length = 0;
    const removed = await a.agent.delete('/api/v1/users/me/photo');
    expect(removed.body.data.avatarUrl).toBe('');
    await waitForDestroy();
    expect(destroyed.map((d) => d.public_id)).toEqual([String(fields.public_id)]);
  });

  it('leaves Google photos alone (they are not ours to delete)', async () => {
    await a.agent.patch('/api/v1/users/me').send({ avatarUrl: GOOGLE_PHOTO });
    const { fields } = await upload(a);
    await a.agent.put('/api/v1/users/me/photo').send(cloudinaryResponse(String(fields.public_id)));
    await a.agent.patch('/api/v1/users/me').send({ avatarUrl: GOOGLE_PHOTO }); // back to Google via the profile form
    await waitForDestroy();
    expect(destroyed.map((d) => d.public_id)).toEqual([String(fields.public_id)]);
  });

  it('never breaks when Cloudinary is unreachable', async () => {
    const { fields } = await upload(b);
    await b.agent.put('/api/v1/users/me/photo').send(cloudinaryResponse(String(fields.public_id)));
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('network down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const res = await b.agent.delete('/api/v1/users/me/photo');
    expect(res.status).toBe(200);
    await waitForDestroy();
    expect(warn).toHaveBeenCalledWith('[Photos] Cloudinary delete failed:', 'network down');
  });

  it('deletes the uploaded photo together with the account', async () => {
    const c = await member('photo-c@example.com');
    const { fields } = await upload(c);
    await c.agent.put('/api/v1/users/me/photo').send(cloudinaryResponse(String(fields.public_id)));
    destroyed.length = 0;
    expect((await c.agent.delete('/api/v1/users/me').send({ confirm: 'DELETE' })).status).toBe(200);
    await waitForDestroy();
    expect(destroyed.map((d) => d.public_id)).toEqual([String(fields.public_id)]);
  });

  it('allows the photo host and upload endpoint of this Cloudinary account only, in the production CSP', async () => {
    (config as any).isProduction = true;
    let prod;
    try {
      prod = createApp();
    } finally {
      (config as any).isProduction = false;
    }
    const csp = (await request(prod).get('/health')).headers['content-security-policy'];
    expect(csp).toMatch(/img-src [^;]*https:\/\/res\.cloudinary\.com\/unmute-test\//);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/api\.cloudinary\.com\/v1_1\/unmute-test\//);
    expect(csp).not.toMatch(/https:\/\/res\.cloudinary\.com(;| )/);
  });

  it('is unavailable (503) without Cloudinary credentials', async () => {
    const saved = config.cloudinary.apiSecret;
    config.cloudinary.apiSecret = '';
    try {
      expect((await request(app).get('/api/v1/auth/config')).body.data.photoUploads).toBe(false);
      expect((await a.agent.post('/api/v1/users/me/photo/upload')).status).toBe(503);
      expect((await a.agent.put('/api/v1/users/me/photo').send(cloudinaryResponse(`unmute/avatars/${a.id}/x`))).status).toBe(503);
    } finally {
      config.cloudinary.apiSecret = saved;
    }
  });

  it('rejects a malformed CLOUDINARY_URL at startup', async () => {
    vi.resetModules();
    const saved = process.env.CLOUDINARY_URL;
    process.env.CLOUDINARY_URL = 'https://not-a-cloudinary-url';
    try {
      await expect(import('../src/config/env')).rejects.toThrow(/CLOUDINARY_URL must look like/);
      process.env.CLOUDINARY_URL = 'cloudinary://111:s%2Fecret@my-cloud';
      vi.resetModules();
      expect((await import('../src/config/env')).config.cloudinary).toEqual({ apiKey: '111', apiSecret: 's/ecret', cloudName: 'my-cloud' });
    } finally {
      if (saved === undefined) delete process.env.CLOUDINARY_URL;
      else process.env.CLOUDINARY_URL = saved;
    }
  });
});
