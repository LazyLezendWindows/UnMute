import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io as connect, Socket } from 'socket.io-client';
import { createApp } from '../src/app';
import { initSocketServer } from '../src/sockets/chatSocket';
import { resetTestDatabase } from './helpers';
import { getDatabase } from '../src/config/database';

const app = createApp();
const server = http.createServer(app);
let baseUrl = '';
const sockets: Socket[] = [];

async function signUp(email: string, displayName: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'Password123!', displayName, dateOfBirth: '1995-01-01' });
  const cookie = ([] as string[]).concat(res.headers['set-cookie'])[0].split(';')[0];
  return { id: res.body.data.user.id as string, cookie };
}

function openSocket(cookie?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(baseUrl, {
      transports: ['websocket'],
      extraHeaders: cookie ? { Cookie: cookie } : {},
      reconnection: false,
    });
    sockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

/** Resolves with the next `new_message` payload, or null if none arrives within `ms`. */
function nextMessage(socket: Socket, ms = 700): Promise<any | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once('new_message', (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
  });
}

describe('Realtime chat authorization', () => {
  let a: { id: string; cookie: string };
  let b: { id: string; cookie: string };
  let outsider: { id: string; cookie: string };
  let conversationId = '';

  beforeAll(async () => {
    await resetTestDatabase();
    initSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    a = await signUp('sock-a@example.com', 'Sock A');
    b = await signUp('sock-b@example.com', 'Sock B');
    outsider = await signUp('sock-x@example.com', 'Outsider');

    await request(app).post('/api/v1/interactions/like').set('Cookie', a.cookie).send({ targetUserId: b.id });
    const match = await request(app).post('/api/v1/interactions/like').set('Cookie', b.cookie).send({ targetUserId: a.id });
    conversationId = match.body.data.conversationId;
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await new Promise((resolve) => server.close(resolve));
  });

  it('rejects connections without a valid session cookie', async () => {
    await expect(openSocket()).rejects.toThrow(/Authentication required/);
    await expect(openSocket('unmute_session=forged')).rejects.toThrow(/Authentication required/);
  });

  it('acknowledges a join only once the socket is in the room, and refuses non-members', async () => {
    const bSocket = await openSocket(b.cookie);
    const outsiderSocket = await openSocket(outsider.cookie);
    await expect(bSocket.timeout(2000).emitWithAck('join_conversation', conversationId)).resolves.toEqual({ joined: true });
    await expect(outsiderSocket.timeout(2000).emitWithAck('join_conversation', conversationId)).resolves.toEqual({ joined: false });
    await expect(outsiderSocket.timeout(2000).emitWithAck('join_conversation', { $ne: null })).resolves.toEqual({ joined: false });

    // Right after the acknowledgement, a message is delivered live (no join/send race).
    const received = nextMessage(bSocket);
    await request(app).post(`/api/v1/conversations/${conversationId}/messages`).set('Cookie', a.cookie).send({ content: 'after ack' });
    expect((await received)?.content).toBe('after ack');
  });

  it('delivers messages to participants but never to a non-member who asks to join the room', async () => {
    const bSocket = await openSocket(b.cookie);
    const outsiderSocket = await openSocket(outsider.cookie);
    bSocket.emit('join_conversation', conversationId);
    outsiderSocket.emit('join_conversation', conversationId);
    await new Promise((r) => setTimeout(r, 200));

    const bReceives = nextMessage(bSocket);
    const outsiderReceives = nextMessage(outsiderSocket);
    await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Cookie', a.cookie)
      .send({ content: 'private hello' });

    expect((await bReceives)?.content).toBe('private hello');
    expect(await outsiderReceives).toBeNull();
  });

  it('removes both users from shared conversation rooms when one blocks the other', async () => {
    const bSocket = await openSocket(b.cookie);
    bSocket.emit('join_conversation', conversationId);
    await new Promise((r) => setTimeout(r, 200));

    await request(app).post('/api/v1/safety/block').set('Cookie', b.cookie).send({ targetUserId: a.id });
    await request(app).delete('/api/v1/safety/block').set('Cookie', b.cookie).send({ targetUserId: a.id });

    // After the block the socket is no longer subscribed, even though messaging is allowed again.
    const received = nextMessage(bSocket);
    const sent = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Cookie', a.cookie)
      .send({ content: 'after unblock' });
    expect(sent.status).toBe(201);
    expect(await received).toBeNull();
  });

  it('disconnects sockets belonging to a session when it logs out', async () => {
    const aSocket = await openSocket(a.cookie);
    const disconnected = new Promise((resolve) => aSocket.once('disconnect', resolve));
    await request(app).post('/api/v1/auth/logout').set('Cookie', a.cookie);
    await expect(disconnected).resolves.toBeDefined();
  });

  it('notifies the recipient on their personal channel even when the chat is not open', async () => {
    const x = await signUp('notify-x@example.com', 'Notify X');
    const y = await signUp('notify-y@example.com', 'Notify Y');
    await request(app).post('/api/v1/interactions/like').set('Cookie', x.cookie).send({ targetUserId: y.id });
    const match = await request(app).post('/api/v1/interactions/like').set('Cookie', y.cookie).send({ targetUserId: x.id });

    const ySocket = await openSocket(y.cookie); // never joins the conversation room
    const notified = new Promise<any>((resolve) => ySocket.once('message_notification', resolve));
    await request(app)
      .post(`/api/v1/conversations/${match.body.data.conversationId}/messages`)
      .set('Cookie', x.cookie)
      .send({ content: 'ping' });
    const payload = await notified;
    expect(payload.conversationId).toBe(match.body.data.conversationId);
    expect(payload.message.content).toBe('ping');
    expect(payload.message.senderId).toBe(x.id);
  });

  it('cuts the live connection of a member when a moderator suspends them', async () => {
    const moderator = await signUp('sock-mod@example.com', 'Moderator');
    await getDatabase().run("UPDATE users SET role = 'moderator' WHERE id = ?", [moderator.id]);
    const target = await signUp('sock-target@example.com', 'Target');
    const targetSocket = await openSocket(target.cookie);
    const disconnected = new Promise((resolve) => targetSocket.once('disconnect', resolve));

    const res = await request(app)
      .post(`/api/v1/moderation/users/${target.id}/suspend`)
      .set('Cookie', moderator.cookie)
      .send({ note: 'spam' });
    expect(res.status).toBe(200);
    await expect(disconnected).resolves.toBeDefined();
    await expect(openSocket(target.cookie)).rejects.toThrow(/Authentication required/);
  });
});
