import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import https from 'https';
import { execFileSync } from 'child_process';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import webpush from 'web-push';
// Web Push's payload encryption (RFC 8291); used here to read notifications as a browser would.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ece = require('http_ece');
import { io as connect, Socket } from 'socket.io-client';
import { createApp } from '../src/app';
import { initSocketServer } from '../src/sockets/chatSocket';
import { config } from '../src/config/env';
import { getDatabase } from '../src/config/database';
import { isAllowedPushEndpoint, PushService } from '../src/services/pushService';
import { resetTestDatabase } from './helpers';

// A local HTTPS "push service" stands in for FCM/Mozilla/Apple. Everything else is real: the
// VAPID signature, the payload encryption, and the HTTP request web-push makes.
interface Delivery {
  path: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}
const deliveries: Delivery[] = [];
const goneEndpoints = new Set<string>();
let pushService: https.Server;
let pushOrigin = '';

const app = createApp();
const server = http.createServer(app);
let baseUrl = '';
const sockets: Socket[] = [];

/** A browser-side subscription: its keys can decrypt what the server sends to it. */
function browserSubscription(name: string) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16).toString('base64url');
  return {
    ecdh,
    auth,
    json: {
      endpoint: `${pushOrigin}/push/${name}`,
      keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth },
    },
  };
}

function decrypt(delivery: Delivery, sub: ReturnType<typeof browserSubscription>) {
  const plain = ece.decrypt(delivery.body, { version: 'aes128gcm', privateKey: sub.ecdh, authSecret: sub.auth });
  return JSON.parse(plain.toString('utf8'));
}

function deliveriesTo(name: string) {
  return deliveries.filter((d) => d.path === `/push/${name}`);
}

async function signUp(email: string, displayName: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'Password123!', displayName, dateOfBirth: '1995-01-01' });
  const cookie = ([] as string[]).concat(res.headers['set-cookie'])[0].split(';')[0];
  return { id: res.body.data.user.id as string, cookie };
}

async function signIn(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123!' });
  return ([] as string[]).concat(res.headers['set-cookie'])[0].split(';')[0];
}

function openSocket(cookie: string, auth: { visible?: boolean } = {}): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(baseUrl, { transports: ['websocket'], extraHeaders: { Cookie: cookie }, auth, reconnection: false });
    sockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

const subscribe = (cookie: string, sub: object) => request(app).put('/api/v1/push/subscription').set('Cookie', cookie).send(sub);
const send = (cookie: string, conversationId: string, content: string) =>
  request(app).post(`/api/v1/conversations/${conversationId}/messages`).set('Cookie', cookie).send({ content });

describe('Web Push notifications', () => {
  let a: { id: string; cookie: string };
  let b: { id: string; cookie: string };
  let conversationId = '';
  const originalPush = { ...config.webPush };

  beforeAll(async () => {
    // Self-signed certificate for 127.0.0.1, trusted only by this test process's default agent.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unmute-push-'));
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
      '-keyout', path.join(dir, 'key.pem'), '-out', path.join(dir, 'cert.pem'),
      '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1', '-days', '1',
    ], { stdio: 'ignore' });
    const cert = fs.readFileSync(path.join(dir, 'cert.pem'));
    const key = fs.readFileSync(path.join(dir, 'key.pem'));
    fs.rmSync(dir, { recursive: true, force: true });
    https.globalAgent.options.ca = cert;

    pushService = https.createServer({ key, cert }, (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        deliveries.push({ path: req.url || '', headers: req.headers, body: Buffer.concat(chunks) });
        res.statusCode = goneEndpoints.has(req.url || '') ? 410 : 201;
        res.end();
      });
    });
    await new Promise<void>((resolve) => pushService.listen(0, '127.0.0.1', resolve));
    pushOrigin = `https://127.0.0.1:${(pushService.address() as AddressInfo).port}`;

    const keys = webpush.generateVAPIDKeys();
    Object.assign(config.webPush, {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      subject: 'mailto:ops@unmute.test',
      endpointHosts: [...originalPush.endpointHosts, '127.0.0.1'],
    });

    await resetTestDatabase();
    initSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    a = await signUp('push-a@example.com', 'Push A');
    b = await signUp('push-b@example.com', 'Push B');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    deliveries.length = 0;
    const open = sockets.splice(0);
    open.forEach((s) => s.disconnect());
    // Let the server notice the disconnects before the next test checks who is online.
    if (open.length) await new Promise((r) => setTimeout(r, 100));
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    Object.assign(config.webPush, originalPush);
    https.globalAgent.options.ca = undefined;
    vi.restoreAllMocks();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => pushService.close(resolve));
  });

  it('only accepts https endpoints on the configured push services', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
    expect(isAllowedPushEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.evil.test/abc')).toBe(false);
    expect(isAllowedPushEndpoint('https://evilpush.apple.com.attacker.test/abc')).toBe(false);
    expect(isAllowedPushEndpoint('https://user:pw@fcm.googleapis.com/abc')).toBe(false);
    expect(isAllowedPushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedPushEndpoint('not a url')).toBe(false);
  });

  it('exposes the public key to signed-in members only', async () => {
    expect((await request(app).get('/api/v1/push/config')).status).toBe(401);
    const res = await request(app).get('/api/v1/push/config').set('Cookie', a.cookie);
    expect(res.body.data).toEqual({ enabled: true, publicKey: config.webPush.publicKey });
    expect(JSON.stringify(res.body)).not.toContain(config.webPush.privateKey);
  });

  it('rejects subscriptions to other hosts and malformed keys', async () => {
    const sub = browserSubscription('x').json;
    expect((await subscribe(a.cookie, { ...sub, endpoint: 'https://internal.example.com/push' })).status).toBe(400);
    expect((await subscribe(a.cookie, { ...sub, keys: { p256dh: '<script>', auth: 'x' } })).status).toBe(400);
    expect((await subscribe(a.cookie, { endpoint: sub.endpoint })).status).toBe(400);
    expect((await request(app).put('/api/v1/push/subscription').send(sub)).status).toBe(401);
    const rows = await getDatabase().query('SELECT id FROM push_subscriptions');
    expect(rows).toHaveLength(0);
  });

  it('notifies an offline member with an encrypted, VAPID-signed, content-free notification', async () => {
    await request(app).post('/api/v1/interactions/like').set('Cookie', a.cookie).send({ targetUserId: b.id });
    const bDevice = browserSubscription('b-phone');
    expect((await subscribe(b.cookie, bDevice.json)).status).toBe(200);

    // A's like completes the match while B is offline: B is told about the match.
    const match = await request(app).post('/api/v1/interactions/like').set('Cookie', b.cookie).send({ targetUserId: a.id });
    expect(match.body.data.matched).toBe(true);
    // (B liked last, so the match notification goes to A, who has no subscription.)
    const aDevice = browserSubscription('a-laptop');
    await subscribe(a.cookie, aDevice.json);
    conversationId = match.body.data.conversationId;

    expect((await send(a.cookie, conversationId, 'Secret words about my day')).status).toBe(201);
    await vi.waitFor(() => expect(deliveriesTo('b-phone')).toHaveLength(1));

    const [delivery] = deliveriesTo('b-phone');
    expect(delivery.headers['content-encoding']).toBe('aes128gcm');
    expect(delivery.headers.urgency).toBe('high');
    expect(delivery.headers.ttl).toBe('86400');
    expect(delivery.headers.topic).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(delivery.headers.authorization).toMatch(new RegExp(`^vapid t=.+, k=${config.webPush.publicKey}$`));
    // Encrypted on the wire; the device's keys decrypt it.
    expect(delivery.body.toString('latin1')).not.toContain('message');
    const payload = decrypt(delivery, bDevice);
    expect(payload).toEqual({
      title: 'Unmute',
      body: 'You have a new message',
      url: `/chat/${conversationId}`,
      tag: `conversation:${conversationId}`,
    });
    // Lock screens must not show who wrote or what they wrote.
    expect(JSON.stringify(payload)).not.toMatch(/Secret|Push A/);
    expect(deliveriesTo('a-laptop')).toHaveLength(0);
  });

  it('sends a match notification to the member who was liked', async () => {
    const c = await signUp('push-c@example.com', 'Push C');
    const cDevice = browserSubscription('c-phone');
    await subscribe(c.cookie, cDevice.json);
    await request(app).post('/api/v1/interactions/like').set('Cookie', c.cookie).send({ targetUserId: a.id });
    const match = await request(app).post('/api/v1/interactions/like').set('Cookie', a.cookie).send({ targetUserId: c.id });
    expect(match.body.data.matched).toBe(true);

    await vi.waitFor(() => expect(deliveriesTo('c-phone')).toHaveLength(1));
    expect(decrypt(deliveriesTo('c-phone')[0], cDevice)).toMatchObject({
      body: 'You have a new match. Say hello!',
      url: `/chat/${match.body.data.conversationId}`,
    });
  });

  it('does not push while the member has the app on screen', async () => {
    await openSocket(b.cookie, { visible: true });
    await openSocket(b.cookie); // older clients that do not report visibility count as on screen
    await send(a.cookie, conversationId, 'Are you there?');
    await new Promise((r) => setTimeout(r, 300));
    expect(deliveriesTo('b-phone')).toHaveLength(0);
  });

  it('pushes while the app is connected but in the background, and stops once it is back on screen', async () => {
    // Backgrounded app / locked phone: the connection can outlive the member looking at it.
    const socket = await openSocket(b.cookie, { visible: false });
    await send(a.cookie, conversationId, 'Background 1');
    await vi.waitFor(() => expect(deliveriesTo('b-phone')).toHaveLength(1));

    socket.emit('presence', { visible: true });
    await new Promise((r) => setTimeout(r, 100));
    await send(a.cookie, conversationId, 'Foreground');
    await new Promise((r) => setTimeout(r, 300));
    expect(deliveriesTo('b-phone')).toHaveLength(1);

    socket.emit('presence', { visible: false });
    socket.emit('presence', 'garbage');
    await new Promise((r) => setTimeout(r, 100));
    await send(a.cookie, conversationId, 'Background 2');
    await vi.waitFor(() => expect(deliveriesTo('b-phone')).toHaveLength(2));
  });

  it('does not push to a blocked sender’s target (the message itself is refused)', async () => {
    const d = await signUp('push-d@example.com', 'Push D');
    await request(app).post('/api/v1/interactions/like').set('Cookie', a.cookie).send({ targetUserId: d.id });
    const match = await request(app).post('/api/v1/interactions/like').set('Cookie', d.cookie).send({ targetUserId: a.id });
    await subscribe(d.cookie, browserSubscription('d-phone').json);
    await request(app).post('/api/v1/safety/block').set('Cookie', d.cookie).send({ targetUserId: a.id });

    expect((await send(a.cookie, match.body.data.conversationId, 'hello?')).status).toBe(403);
    await new Promise((r) => setTimeout(r, 300));
    expect(deliveriesTo('d-phone')).toHaveLength(0);
  });

  it('stops pushing to a device once its session signs out', async () => {
    const bSecond = await signIn('push-b@example.com');
    await subscribe(bSecond, browserSubscription('b-tablet').json);
    await request(app).post('/api/v1/auth/logout').set('Cookie', bSecond);

    await send(a.cookie, conversationId, 'One more');
    await vi.waitFor(() => expect(deliveriesTo('b-phone')).toHaveLength(1));
    expect(deliveriesTo('b-tablet')).toHaveLength(0);
    const rows = await getDatabase().query('SELECT id FROM push_subscriptions WHERE user_id = ?', [b.id]);
    expect(rows).toHaveLength(1);
  });

  it('moves a shared browser’s endpoint to whoever signed in last', async () => {
    // B's phone now belongs to C: B's notifications must not reach it any more.
    const c = await signIn('push-c@example.com');
    const shared = browserSubscription('b-phone');
    await subscribe(c, shared.json);

    await send(a.cookie, conversationId, 'Still there?');
    await new Promise((r) => setTimeout(r, 300));
    expect(deliveriesTo('b-phone')).toHaveLength(0);
    const owner = await getDatabase().query<{ user_id: string }>('SELECT user_id FROM push_subscriptions WHERE endpoint LIKE ?', ['%/push/b-phone']);
    expect(owner.map((r) => r.user_id)).not.toContain(b.id);
  });

  it('unsubscribes this device on request', async () => {
    await subscribe(b.cookie, browserSubscription('b-watch').json);
    expect((await request(app).delete('/api/v1/push/subscription').set('Cookie', b.cookie)).status).toBe(200);
    await send(a.cookie, conversationId, 'Ping');
    await new Promise((r) => setTimeout(r, 300));
    expect(deliveriesTo('b-watch')).toHaveLength(0);
  });

  it('removes a subscription the push service reports as gone', async () => {
    await subscribe(b.cookie, browserSubscription('b-old').json);
    goneEndpoints.add('/push/b-old');

    await send(a.cookie, conversationId, 'Hello again');
    await vi.waitFor(async () => {
      expect(deliveriesTo('b-old')).toHaveLength(1);
      const rows = await getDatabase().query('SELECT id FROM push_subscriptions WHERE user_id = ?', [b.id]);
      expect(rows).toHaveLength(0);
    });
  });

  it('never pushes to deactivated accounts, and is off without VAPID keys', async () => {
    await subscribe(b.cookie, browserSubscription('b-new').json);
    await getDatabase().run("UPDATE users SET status = 'deactivated' WHERE id = ?", [b.id]);
    // Chat already refuses to message a deactivated member; the push layer checks independently.
    await PushService.notifyIfAway(b.id, { title: 'Unmute', body: 'x', url: '/', tag: 't' });
    expect(deliveriesTo('b-new')).toHaveLength(0);
    await getDatabase().run("UPDATE users SET status = 'active' WHERE id = ?", [b.id]);

    const saved = config.webPush.privateKey;
    config.webPush.privateKey = '';
    try {
      const res = await request(app).get('/api/v1/push/config').set('Cookie', a.cookie);
      expect(res.body.data).toEqual({ enabled: false, publicKey: null });
      expect((await subscribe(a.cookie, browserSubscription('z').json)).status).toBe(503);
      await send(a.cookie, conversationId, 'Quiet');
      await new Promise((r) => setTimeout(r, 300));
      expect(deliveriesTo('b-new')).toHaveLength(0);
    } finally {
      config.webPush.privateKey = saved;
    }
  });

  it('deletes a member’s subscriptions with their account', async () => {
    await getDatabase().run('DELETE FROM users WHERE id = ?', [b.id]);
    const rows = await getDatabase().query('SELECT id FROM push_subscriptions WHERE user_id = ?', [b.id]);
    expect(rows).toHaveLength(0);
  });
});
