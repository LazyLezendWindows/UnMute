import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io as connect, Socket } from 'socket.io-client';
import { config } from '../src/config/env';
import { getDatabase } from '../src/config/database';
import { authRateLimiter } from '../src/middleware/rateLimiter';
import { cloudinarySignature } from '../src/services/photoService';
import { resetTestDatabase } from './helpers';

// Profiles with several photos and a profession, Discover tabs, "liked you", online status and
// photos in chat. Cloudinary is not called: uploads go browser → Cloudinary directly, and the
// server's deletions are captured instead of sent.
const CLOUD = { cloudName: 'unmute-test', apiKey: '123456789012345', apiSecret: 'test-api-secret-value' };
Object.assign(config.cloudinary, CLOUD);
const { createApp } = await import('../src/app');
const { initSocketServer } = await import('../src/sockets/chatSocket');
const app = createApp();
const server = http.createServer(app);
let baseUrl = '';
const sockets: Socket[] = [];
const destroyed: string[] = [];
const realFetch = globalThis.fetch;
let counter = 0;

type Member = Awaited<ReturnType<typeof member>>;

async function member(name: string) {
  const agent = request.agent(app);
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${++counter}@example.com`;
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'Password123!', displayName: name, dateOfBirth: '1995-05-05' });
  expect(res.status).toBe(201);
  const cookie = ([] as string[]).concat(res.headers['set-cookie'])[0].split(';')[0];
  return { agent, id: res.body.data.user.id as string, cookie };
}

const receipt = (publicId: string, version = 1712345678) => ({
  publicId,
  version,
  signature: cloudinarySignature({ public_id: publicId, version }, CLOUD.apiSecret),
});

async function uploadPhoto(m: Member) {
  const signed = await m.agent.post('/api/v1/users/me/photo/upload');
  return receipt(String(signed.body.data.fields.public_id));
}

async function placeId(name: string) {
  return (await getDatabase().get<{ id: string }>("SELECT id FROM places WHERE name = ? AND kind = 'city'", [name]))!.id;
}

async function match(a: Member, b: Member): Promise<string> {
  await a.agent.post('/api/v1/interactions/like').send({ targetUserId: b.id });
  const res = await b.agent.post('/api/v1/interactions/like').send({ targetUserId: a.id });
  return res.body.data.conversationId;
}

function openSocket(m: Member): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(baseUrl, { transports: ['websocket'], extraHeaders: { Cookie: m.cookie }, reconnection: false });
    sockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

describe('Phase 2: photos, profession, discover tabs, likes, presence, chat photos', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).startsWith('https://api.cloudinary.com/')) {
        destroyed.push(new URLSearchParams(String(init?.body)).get('public_id') || '');
        return new Response('{"result":"ok"}', { status: 200 });
      }
      return realFetch(url, init);
    });
    initSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => {
    destroyed.length = 0;
    authRateLimiter.resetKey('::ffff:127.0.0.1');
  });
  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    vi.restoreAllMocks();
    Object.assign(config.cloudinary, { cloudName: '', apiKey: '', apiSecret: '' });
    await new Promise((resolve) => server.close(resolve));
  });

  describe('photo grid', () => {
    it('holds up to six photos; the first becomes the main photo; any can be made main', async () => {
      const m = await member('Grid');
      const receipts = [];
      for (let i = 0; i < 6; i++) {
        const r = await uploadPhoto(m);
        receipts.push(r);
        expect((await m.agent.post('/api/v1/users/me/photos').send(r)).status).toBe(201);
      }
      const seventh = await m.agent.post('/api/v1/users/me/photos').send(await uploadPhoto(m));
      expect(seventh.status).toBe(400);
      expect(seventh.body.code).toBe('TOO_MANY_PHOTOS');

      let me = (await m.agent.get('/api/v1/users/me')).body.data;
      expect(me.photos).toHaveLength(6);
      expect(me.photos[0].isMain).toBe(true);
      expect(me.avatarUrl).toBe(me.photos[0].url);
      expect(me.photos[0].url).toContain(receipts[0].publicId);

      const chosen = me.photos[3];
      me = (await m.agent.put(`/api/v1/users/me/photos/${chosen.id}/main`)).body.data;
      expect(me.avatarUrl).toBe(chosen.url);
      expect(me.photos[0]).toMatchObject({ id: chosen.id, isMain: true });
      expect(me.photos.filter((p: any) => p.isMain)).toHaveLength(1);
    });

    it('removing the main photo promotes the next one and deletes the file', async () => {
      const m = await member('Remove');
      for (let i = 0; i < 3; i++) await m.agent.post('/api/v1/users/me/photos').send(await uploadPhoto(m));
      const before = (await m.agent.get('/api/v1/users/me')).body.data.photos;
      const after = (await m.agent.delete(`/api/v1/users/me/photos/${before[0].id}`)).body.data;
      expect(after.photos.map((p: any) => p.id)).toEqual([before[1].id, before[2].id]);
      expect(after.avatarUrl).toBe(before[1].url);
      await new Promise((r) => setTimeout(r, 50));
      expect(destroyed).toHaveLength(1);
    });

    it('never lets a member use or change someone else’s photos', async () => {
      const [a, b] = [await member('Owner'), await member('Other')];
      const photoId = (await a.agent.post('/api/v1/users/me/photos').send(await uploadPhoto(a))).body.data.photos[0].id;
      expect((await b.agent.put(`/api/v1/users/me/photos/${photoId}/main`)).status).toBe(404);
      expect((await b.agent.delete(`/api/v1/users/me/photos/${photoId}`)).status).toBe(404);
      expect((await b.agent.post('/api/v1/users/me/photos').send(receipt(`unmute/avatars/${a.id}/stolen`))).status).toBe(400);
      expect((await a.agent.get('/api/v1/users/me')).body.data.photos).toHaveLength(1);
    });

    it('shows others the main photo first, then the rest', async () => {
      const [a, viewer] = [await member('Photogenic'), await member('Viewer')];
      for (let i = 0; i < 3; i++) await a.agent.post('/api/v1/users/me/photos').send(await uploadPhoto(a));
      const mine = (await a.agent.get('/api/v1/users/me')).body.data.photos;
      await a.agent.put(`/api/v1/users/me/photos/${mine[2].id}/main`);
      const card = (await viewer.agent.get('/api/v1/discover', { params: {} })).body.data.find((c: any) => c.id === a.id);
      expect(card.photos).toEqual([mine[2].url, mine[0].url, mine[1].url]);
    });
  });

  describe('profile fields', () => {
    it('saves a profession (shown to others) and the online-status setting', async () => {
      const [a, viewer] = [await member('Worker'), await member('Looker')];
      const res = await a.agent.patch('/api/v1/users/me').send({ profession: '  Software Engineer ', showOnline: false });
      expect(res.body.data).toMatchObject({ profession: 'Software Engineer', showOnline: false });
      expect((await a.agent.patch('/api/v1/users/me').send({ profession: 'x'.repeat(81) })).status).toBe(400);
      const card = (await viewer.agent.get('/api/v1/discover')).body.data.find((c: any) => c.id === a.id);
      expect(card.profession).toBe('Software Engineer');
      expect(card).not.toHaveProperty('showOnline');
    });
  });

  describe('discover tabs', () => {
    it('Nearby sorts nearest first and needs your area; Interests keeps only shared interests', async () => {
      const viewer = await member('Tabber');
      const near = await member('Near Nita');
      const far = await member('Far Farhan');
      const [secunderabad, hyderabad, visakhapatnam] = [await placeId('Secunderabad'), await placeId('Hyderabad'), await placeId('Visakhapatnam')];

      expect((await viewer.agent.get('/api/v1/discover?sort=nearby')).status).toBe(400);
      await viewer.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: secunderabad });
      await near.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: hyderabad });
      await far.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: visakhapatnam });

      const interests = (await viewer.agent.get('/api/v1/users/interests')).body.data;
      await viewer.agent.patch('/api/v1/users/me').send({ interestIds: [interests[0].id] });
      await far.agent.patch('/api/v1/users/me').send({ interestIds: [interests[0].id, interests[1].id] });

      const nearby = (await viewer.agent.get('/api/v1/discover?sort=nearby&limit=50')).body.data;
      const order = nearby.map((c: any) => c.id).filter((id: string) => id === near.id || id === far.id);
      expect(order).toEqual([near.id, far.id]);
      expect(nearby.find((c: any) => c.id === near.id).distanceKm).toBeLessThan(nearby.find((c: any) => c.id === far.id).distanceKm);

      const shared = (await viewer.agent.get('/api/v1/discover?sharedInterests=true&limit=50')).body.data;
      expect(shared.map((c: any) => c.id)).toContain(far.id);
      expect(shared.map((c: any) => c.id)).not.toContain(near.id);
      expect(shared.every((c: any) => c.commonInterestsCount > 0)).toBe(true);
    });
  });

  describe('people who liked you', () => {
    it('lists pending likes; answering, blocking or matching removes them', async () => {
      const [me, fan, other, blocked] = [await member('Liked'), await member('Fan'), await member('Other Fan'), await member('Blocked Fan')];
      for (const liker of [fan, other, blocked]) await liker.agent.post('/api/v1/interactions/like').send({ targetUserId: me.id });
      let list = (await me.agent.get('/api/v1/interactions/incoming')).body.data;
      expect(list.map((l: any) => l.user.id).sort()).toEqual([fan.id, other.id, blocked.id].sort());
      expect(list[0].user).not.toHaveProperty('email');
      expect((await fan.agent.get('/api/v1/interactions/incoming')).body.data).toHaveLength(0);

      await me.agent.post('/api/v1/interactions/like').send({ targetUserId: fan.id }); // match
      await me.agent.post('/api/v1/interactions/pass').send({ targetUserId: other.id });
      await me.agent.post('/api/v1/safety/block').send({ targetUserId: blocked.id });
      list = (await me.agent.get('/api/v1/interactions/incoming')).body.data;
      expect(list).toHaveLength(0);
      const matches = (await me.agent.get('/api/v1/matches')).body.data;
      expect(matches.map((m: any) => m.user.id)).toEqual([fan.id]);
      expect(matches[0].isNew).toBe(true);
    });
  });

  describe('online status', () => {
    it('shows chat partners when you come online and go offline, and hides it if you choose', async () => {
      const [a, b, stranger] = [await member('Online A'), await member('Online B'), await member('Stranger')];
      await match(a, b);
      const aSocket = await openSocket(a);
      const strangerSocket = await openSocket(stranger);
      const strangerHeard = vi.fn();
      strangerSocket.on('presence_changed', strangerHeard);

      const online = new Promise<any>((resolve) => aSocket.once('presence_changed', resolve));
      const bSocket = await openSocket(b);
      expect(await online).toMatchObject({ userId: b.id, online: true });
      let chat = (await a.agent.get('/api/v1/conversations')).body.data[0];
      expect(chat.otherUser.presence).toMatchObject({ online: true });
      expect((await a.agent.get('/api/v1/matches')).body.data[0].user.presence.online).toBe(true);

      const offline = new Promise<any>((resolve) => aSocket.once('presence_changed', resolve));
      bSocket.disconnect();
      const event = await offline;
      expect(event).toMatchObject({ userId: b.id, online: false });
      expect(Date.now() - new Date(event.lastSeenAt).getTime()).toBeLessThan(10_000);
      chat = (await a.agent.get('/api/v1/conversations')).body.data[0];
      expect(chat.otherUser.presence.online).toBe(false);
      expect(chat.otherUser.presence.lastSeenAt).toBeTruthy();

      await b.agent.patch('/api/v1/users/me').send({ showOnline: false });
      const hidden = vi.fn();
      aSocket.on('presence_changed', hidden);
      await openSocket(b);
      await new Promise((r) => setTimeout(r, 200));
      expect(hidden).not.toHaveBeenCalled();
      chat = (await a.agent.get('/api/v1/conversations')).body.data[0];
      expect(chat.otherUser.presence).toBeNull();
      expect(strangerHeard).not.toHaveBeenCalled();
    });
  });

  describe('photos in chat', () => {
    it('sends a verified photo in an approved chat only, and deletes it with the sender’s account', async () => {
      const [a, b, outsider] = [await member('Pic A'), await member('Pic B'), await member('Pic Outsider')];
      const conversationId = await match(a, b);

      const signed = await a.agent.post(`/api/v1/conversations/${conversationId}/attachments`);
      expect(signed.status).toBe(200);
      const publicId = String(signed.body.data.fields.public_id);
      expect(publicId).toMatch(new RegExp(`^unmute/chat/${conversationId}/[a-f0-9]{24}$`));
      expect((await outsider.agent.post(`/api/v1/conversations/${conversationId}/attachments`)).status).toBe(404);

      const sent = await a.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ attachment: receipt(publicId) });
      expect(sent.status).toBe(201);
      expect(sent.body.data.content).toBe('');
      expect(sent.body.data.attachmentUrl).toBe(
        `https://res.cloudinary.com/unmute-test/image/upload/c_limit,w_1200,h_1200/q_auto,f_auto/v1712345678/${publicId}`
      );
      const history = (await b.agent.get(`/api/v1/conversations/${conversationId}/messages`)).body.data.messages;
      expect(history.at(-1).attachmentUrl).toBe(sent.body.data.attachmentUrl);

      // Forged, from another chat's folder, or empty: refused.
      const bad = [
        { attachment: { ...receipt(publicId), signature: 'f'.repeat(40) } },
        { attachment: receipt(`unmute/chat/${crypto.randomUUID()}/x`) },
        { attachment: receipt(`unmute/avatars/${a.id}/x`) },
        { content: '   ' },
      ];
      for (const body of bad) {
        expect((await a.agent.post(`/api/v1/conversations/${conversationId}/messages`).send(body)).status).toBe(400);
      }

      destroyed.length = 0;
      expect((await a.agent.delete('/api/v1/users/me').send({ confirm: 'DELETE' })).status).toBe(200);
      await new Promise((r) => setTimeout(r, 50));
      expect(destroyed).toContain(publicId);
    });

    it('cannot attach photos to a chat request', async () => {
      const [a, b] = [await member('Req A'), await member('Req B')];
      const id = (await a.agent.post('/api/v1/chat-requests').send({ recipientId: b.id, content: 'hi' })).body.data.conversationId;
      expect((await a.agent.post(`/api/v1/conversations/${id}/attachments`)).status).toBe(403);
      expect((await b.agent.post(`/api/v1/conversations/${id}/attachments`)).status).toBe(403);
    });
  });
});
