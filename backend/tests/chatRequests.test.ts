import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import crypto from 'crypto';
import { AddressInfo } from 'net';
import request from 'supertest';
import { io as connect, Socket } from 'socket.io-client';
import { createApp } from '../src/app';
import { initSocketServer } from '../src/sockets/chatSocket';
import { config } from '../src/config/env';
import { getDatabase } from '../src/config/database';
import { authRateLimiter, chatRequestRateLimiter, messageRateLimiter } from '../src/middleware/rateLimiter';
import { resetTestDatabase } from './helpers';

const app = createApp();
const server = http.createServer(app);
let baseUrl = '';
const sockets: Socket[] = [];
let counter = 0;

type Member = Awaited<ReturnType<typeof member>>;

async function member(name: string) {
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${++counter}@example.com`;
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'Password123!', displayName: name, dateOfBirth: '1996-03-03' });
  expect(res.status).toBe(201);
  const cookie = ([] as string[]).concat(res.headers['set-cookie'])[0].split(';')[0];
  return { agent, id: res.body.data.user.id as string, cookie, name };
}

const ask = (from: Member, to: Member, content = `Hi ${to.name}, I love hiking too!`) =>
  from.agent.post('/api/v1/chat-requests').send({ recipientId: to.id, content });
const incoming = async (m: Member) => (await m.agent.get('/api/v1/chat-requests/incoming')).body.data as any[];
const sent = async (m: Member) => (await m.agent.get('/api/v1/chat-requests/sent')).body.data as any[];
const chats = async (m: Member) => (await m.agent.get('/api/v1/conversations')).body.data as any[];
const say = (m: Member, conversationId: string, content: string) =>
  m.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content });

function openSocket(m: Member): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(baseUrl, { transports: ['websocket'], extraHeaders: { Cookie: m.cookie }, reconnection: false });
    sockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function next(socket: Socket, event: string, ms = 1000): Promise<any | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function join(socket: Socket, conversationId: string): Promise<boolean> {
  return new Promise((resolve) => socket.emit('join_conversation', conversationId, (r: { joined: boolean }) => resolve(r.joined)));
}

describe('Chat requests', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    initSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => {
    for (const limiter of [authRateLimiter]) limiter.resetKey('::ffff:127.0.0.1');
  });
  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await new Promise((resolve) => server.close(resolve));
  });

  describe('lifecycle', () => {
    let asha: Member;
    let ravi: Member;
    let requestId = '';

    beforeAll(async () => {
      asha = await member('Asha');
      ravi = await member('Ravi');
    });

    it('1. a first message creates a pending request carrying that one message', async () => {
      const res = await ask(asha, ravi, 'Hi Ravi, fellow trekker here!');
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ status: 'pending' });
      requestId = res.body.data.conversationId;
      expect((await sent(asha)).map((r) => r.id)).toEqual([requestId]);
    });

    it('2. the recipient sees it under Requests, with a preview and no exact location', async () => {
      const [req] = await incoming(ravi);
      expect(req).toMatchObject({ id: requestId, direction: 'incoming', status: 'pending', preview: 'Hi Ravi, fellow trekker here!' });
      expect(req.otherUser).toMatchObject({ id: asha.id, displayName: 'Asha' });
      expect(req.otherUser).not.toHaveProperty('latitude');
      expect(req.otherUser).not.toHaveProperty('email');
      expect(await incoming(asha)).toHaveLength(0);
    });

    it('3. it is not a chat for either side before acceptance, and viewing it does not accept it', async () => {
      const detail = await ravi.agent.get(`/api/v1/chat-requests/${requestId}`);
      expect(detail.status).toBe(200);
      expect(detail.body.data.message).toMatchObject({ content: 'Hi Ravi, fellow trekker here!', fromMe: false });
      expect(detail.body.data.otherUser.interests).toBeInstanceOf(Array);
      expect(await chats(asha)).toHaveLength(0);
      expect(await chats(ravi)).toHaveLength(0);
      expect((await ravi.agent.get(`/api/v1/conversations/${requestId}/messages`)).status).toBe(403);
      // Still pending after being opened.
      expect((await incoming(ravi)).map((r) => r.id)).toEqual([requestId]);
    });

    it('6. the sender cannot send more messages while waiting, nor can the recipient reply before accepting', async () => {
      const more = await say(asha, requestId, 'Hello?? Are you there?');
      expect(more.status).toBe(403);
      expect(more.body.code).toBe('REQUEST_NOT_ACCEPTED');
      expect((await say(ravi, requestId, 'hi')).status).toBe(403);
      // Sending another request is not a way round it either.
      const again = await ask(asha, ravi, 'Second try');
      expect(again.status).toBe(409);
      expect(again.body).toMatchObject({ code: 'REQUEST_PENDING', data: { conversationId: requestId } });
      const count = await getDatabase().get<{ n: number }>('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?', [requestId]);
      expect(Number(count!.n)).toBe(1);
    });

    it('12. no one else can view, accept, decline or cancel it, and the sender cannot accept their own', async () => {
      const outsider = await member('Outsider');
      const attempts = [
        () => outsider.agent.get(`/api/v1/chat-requests/${requestId}`),
        () => outsider.agent.post(`/api/v1/chat-requests/${requestId}/accept`),
        () => outsider.agent.post(`/api/v1/chat-requests/${requestId}/decline`),
        () => outsider.agent.post(`/api/v1/chat-requests/${requestId}/cancel`),
        () => asha.agent.post(`/api/v1/chat-requests/${requestId}/accept`),
        () => asha.agent.post(`/api/v1/chat-requests/${requestId}/decline`),
        () => ravi.agent.post(`/api/v1/chat-requests/${requestId}/cancel`),
      ];
      for (const attempt of attempts) {
        expect((await attempt()).status).toBe(404);
      }
      expect((await request(app).get('/api/v1/chat-requests/incoming')).status).toBe(401);
      expect((await incoming(ravi)).map((r) => r.id)).toEqual([requestId]);
    });

    it('4 + 5. accepting makes it a chat for both, and both can then message normally', async () => {
      const res = await ravi.agent.post(`/api/v1/chat-requests/${requestId}/accept`);
      expect(res.status).toBe(200);
      expect(res.body.data.conversationId).toBe(requestId);
      expect((await chats(asha)).map((c) => c.id)).toEqual([requestId]);
      expect((await chats(ravi)).map((c) => c.id)).toEqual([requestId]);
      expect(await incoming(ravi)).toHaveLength(0);
      expect(await sent(asha)).toHaveLength(0);

      expect((await say(ravi, requestId, 'Hey Asha!')).status).toBe(201);
      expect((await say(asha, requestId, 'Yay!')).status).toBe(201);
      const history = await ravi.agent.get(`/api/v1/conversations/${requestId}/messages`);
      // The introduction is preserved as the first message.
      expect(history.body.data.messages.map((m: any) => m.content)).toEqual(['Hi Ravi, fellow trekker here!', 'Hey Asha!', 'Yay!']);
    });

    it('a new first message to an existing chat goes straight to it', async () => {
      const res = await ask(asha, ravi, 'another');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ status: 'accepted', conversationId: requestId, delivered: false });
    });

    it('records the request history', async () => {
      const events = await getDatabase().query<{ event: string }>(
        'SELECT event FROM conversation_events WHERE conversation_id = ? ORDER BY created_at',
        [requestId]
      );
      expect(events.map((e) => e.event)).toEqual(['requested', 'accepted']);
    });
  });

  describe('decline, cancel and block', () => {
    it('7. a declined request cannot be used, is not revealed to the sender, and has a cooldown', async () => {
      const [kiran, meena] = [await member('Kiran'), await member('Meena')];
      const id = (await ask(kiran, meena)).body.data.conversationId;
      expect((await meena.agent.post(`/api/v1/chat-requests/${id}/decline`)).status).toBe(200);
      // Declining twice is harmless.
      expect((await meena.agent.post(`/api/v1/chat-requests/${id}/decline`)).status).toBe(200);

      expect(await incoming(meena)).toHaveLength(0);
      expect((await meena.agent.get(`/api/v1/chat-requests/${id}`)).status).toBe(404);
      expect((await meena.agent.post(`/api/v1/chat-requests/${id}/accept`)).status).toBe(404); // cannot be reopened

      // To Kiran it still reads exactly like a pending request.
      const kiranView = await sent(kiran);
      expect(kiranView).toHaveLength(1);
      expect(kiranView[0]).toMatchObject({ id, status: 'pending' });
      expect((await kiran.agent.get(`/api/v1/chat-requests/${id}`)).body.data.status).toBe('pending');
      const blocked = await say(kiran, id, 'why no answer');
      expect(blocked.status).toBe(403);
      expect(blocked.body.error).toBe("Your message request hasn't been accepted yet.");
      const retry = await ask(kiran, meena, 'please?');
      expect(retry.status).toBe(409);
      expect(retry.body.code).toBe('REQUEST_PENDING');
      expect(await incoming(meena)).toHaveLength(0);

      // Cancelling a quietly declined request does not lift the cooldown.
      expect((await kiran.agent.post(`/api/v1/chat-requests/${id}/cancel`)).status).toBe(200);
      expect((await ask(kiran, meena, 'again')).status).toBe(409);

      // After the cooldown the sender may ask again, and it shows up for the recipient.
      await getDatabase().run('UPDATE conversations SET declined_at = DATE_SUB(declined_at, INTERVAL ? DAY) WHERE id = ?', [
        config.chatRequests.declineCooldownDays + 1,
        id,
      ]);
      expect(await sent(kiran)).toHaveLength(0);
      const fresh = await ask(kiran, meena, 'Trying once more, a week later');
      expect(fresh.status).toBe(201);
      expect(fresh.body.data.conversationId).toBe(id); // same pair, same conversation, no duplicate
      const [again] = await incoming(meena);
      expect(again.preview).toBe('Trying once more, a week later');
    });

    it('8. a cancelled request cannot be used and disappears for the recipient', async () => {
      const [a, b] = [await member('Cancel A'), await member('Cancel B')];
      const id = (await ask(a, b)).body.data.conversationId;
      expect((await a.agent.post(`/api/v1/chat-requests/${id}/cancel`)).status).toBe(200);
      expect(await incoming(b)).toHaveLength(0);
      expect(await sent(a)).toHaveLength(0);
      expect((await b.agent.post(`/api/v1/chat-requests/${id}/accept`)).status).toBe(404);
      expect((await say(a, id, 'still here')).status).toBe(404);
      expect((await say(b, id, 'hello')).status).toBe(404);
    });

    it('9. blocking stops requests and messages both ways, and closes the request for good', async () => {
      const [a, b] = [await member('Block A'), await member('Block B')];
      const id = (await ask(a, b)).body.data.conversationId;
      await b.agent.post('/api/v1/safety/block').send({ targetUserId: a.id });

      expect(await incoming(b)).toHaveLength(0);
      expect((await b.agent.post(`/api/v1/chat-requests/${id}/accept`)).status).toBe(404);
      expect((await say(a, id, 'hey')).status).not.toBe(201);
      // Neither can start again; the answer does not reveal the block.
      const retry = await ask(a, b, 'hello?');
      expect(retry.status).toBe(404);
      expect(retry.body.error).toBe('User not found');
      expect((await ask(b, a)).status).toBe(404);

      // Unblocking does not bring the old request back.
      await b.agent.delete(`/api/v1/safety/blocks/${a.id}`);
      expect(await incoming(b)).toHaveLength(0);
      const events = await getDatabase().query<{ event: string }>('SELECT event FROM conversation_events WHERE conversation_id = ?', [id]);
      expect(events.map((e) => e.event)).toContain('blocked');
    });

    it('blocks an accepted chat both ways too (existing blocking system)', async () => {
      const [a, b] = [await member('Chat A'), await member('Chat B')];
      const id = (await ask(a, b)).body.data.conversationId;
      await b.agent.post(`/api/v1/chat-requests/${id}/accept`);
      await a.agent.post('/api/v1/safety/block').send({ targetUserId: b.id });
      expect((await say(b, id, 'hi')).status).toBe(403);
      expect((await say(a, id, 'hi')).status).toBe(403);
      expect(await chats(b)).toHaveLength(0);
    });
  });

  describe('concurrency and duplicates', () => {
    it('10. simultaneous first messages from the same sender create one request and one message', async () => {
      const [a, b] = [await member('Dup A'), await member('Dup B')];
      const results = await Promise.all(Array.from({ length: 5 }, () => ask(a, b, 'same time')));
      expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409]);
      const ids = new Set(results.map((r) => r.body.data?.conversationId ?? r.body.data?.conversationId));
      expect(ids.size).toBe(1);
      const rows = await getDatabase().query('SELECT id FROM conversations WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)', [a.id, b.id, b.id, a.id]);
      expect(rows).toHaveLength(1);
      expect(await incoming(b)).toHaveLength(1);
    });

    it('a retried send (same clientMessageId) is stored once', async () => {
      const [a, b] = [await member('Retry A'), await member('Retry B')];
      const clientMessageId = crypto.randomUUID();
      const body = { recipientId: b.id, content: 'once', clientMessageId };
      const first = await a.agent.post('/api/v1/chat-requests').send(body);
      const second = await a.agent.post('/api/v1/chat-requests').send(body);
      expect(first.status).toBe(201);
      expect(second.status).toBe(409);
      const n = await getDatabase().get<{ n: number }>('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?', [first.body.data.conversationId]);
      expect(Number(n!.n)).toBe(1);
    });

    it('mutual requests merge into one accepted chat with both messages', async () => {
      const [a, b] = [await member('Mutual A'), await member('Mutual B')];
      const first = await ask(a, b, 'Hi from A');
      const second = await ask(b, a, 'Hi from B');
      expect(second.status).toBe(200);
      expect(second.body.data).toEqual({ status: 'accepted', conversationId: first.body.data.conversationId, delivered: true });
      const history = await a.agent.get(`/api/v1/conversations/${first.body.data.conversationId}/messages`);
      expect(history.body.data.messages.map((m: any) => m.content)).toEqual(['Hi from A', 'Hi from B']);
      expect(await incoming(a)).toHaveLength(0);
      expect(await incoming(b)).toHaveLength(0);
    });

    it('simultaneous mutual requests also converge on one conversation', async () => {
      const [a, b] = [await member('Race A'), await member('Race B')];
      const [ra, rb] = await Promise.all([ask(a, b, 'A!'), ask(b, a, 'B!')]);
      const ids = new Set([ra.body.data.conversationId, rb.body.data.conversationId]);
      expect(ids.size).toBe(1);
      expect([ra.body.data.status, rb.body.data.status].sort()).toEqual(['accepted', 'pending']);
      expect((await chats(a)).map((c) => c.id)).toEqual([...ids]);
    });

    it('11. concurrent acceptances yield one chat and one acceptance record', async () => {
      const [a, b] = [await member('Accept A'), await member('Accept B')];
      const id = (await ask(a, b)).body.data.conversationId;
      const results = await Promise.all(Array.from({ length: 4 }, () => b.agent.post(`/api/v1/chat-requests/${id}/accept`)));
      expect(results.every((r) => r.status === 200 && r.body.data.conversationId === id)).toBe(true);
      const events = await getDatabase().query('SELECT id FROM conversation_events WHERE conversation_id = ? AND event = ?', [id, 'accepted']);
      expect(events).toHaveLength(1);
      expect(await chats(a)).toHaveLength(1);
    });

    it('a mutual like accepts an open request instead of creating a second conversation', async () => {
      const [a, b] = [await member('Like A'), await member('Like B')];
      const id = (await ask(a, b)).body.data.conversationId;
      await a.agent.post('/api/v1/interactions/like').send({ targetUserId: b.id });
      const match = await b.agent.post('/api/v1/interactions/like').send({ targetUserId: a.id });
      expect(match.body.data).toMatchObject({ matched: true, conversationId: id });
      expect((await chats(b)).map((c) => c.id)).toEqual([id]);
      expect(await incoming(b)).toHaveLength(0);
    });
  });

  describe('limits and privacy', () => {
    it('refuses unknown, deactivated and self recipients alike, without revealing which', async () => {
      const a = await member('Private A');
      const gone = await member('Gone');
      await gone.agent.post('/api/v1/users/me/deactivate');
      for (const recipientId of [crypto.randomUUID(), gone.id, a.id]) {
        const res = await a.agent.post('/api/v1/chat-requests').send({ recipientId, content: 'hi' });
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('User not found');
      }
    });

    it('enforces the configurable message length', async () => {
      const [a, b] = [await member('Long A'), await member('Long B')];
      const max = config.chatRequests.messageMaxLength;
      expect((await ask(a, b, 'x'.repeat(max + 1))).status).toBe(400);
      expect((await ask(a, b, '   ')).status).toBe(400);
      const saved = config.chatRequests.messageMaxLength;
      config.chatRequests.messageMaxLength = 10;
      try {
        expect((await ask(a, b, 'this is longer than ten')).body.error).toMatch(/under 10 characters/);
      } finally {
        config.chatRequests.messageMaxLength = saved;
      }
      expect((await ask(a, b, 'x'.repeat(max))).status).toBe(201);
    });

    it('caps pending requests and daily requests (configurable), counted from the database', async () => {
      const sender = await member('Spammer');
      const saved = { ...config.chatRequests };
      config.chatRequests.maxPending = 2;
      try {
        const targets = [await member('T1'), await member('T2'), await member('T3')];
        expect((await ask(sender, targets[0])).status).toBe(201);
        expect((await ask(sender, targets[1])).status).toBe(201);
        const third = await ask(sender, targets[2]);
        expect(third.status).toBe(429);
        expect(third.body.code).toBe('TOO_MANY_PENDING');

        config.chatRequests.maxPending = 100;
        config.chatRequests.perDay = 3;
        expect((await ask(sender, targets[2])).status).toBe(201);
        const fourth = await ask(sender, await member('T4'));
        expect(fourth.status).toBe(429);
        expect(fourth.body.code).toBe('REQUEST_LIMIT');
      } finally {
        Object.assign(config.chatRequests, saved);
        chatRequestRateLimiter.resetKey(sender.id);
      }
    });

    it('rate-limits bursts of requests per account', async () => {
      const sender = await member('Burst');
      const target = await member('Burst T');
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) statuses.push((await ask(sender, target)).status);
      expect(statuses).toContain(429);
      chatRequestRateLimiter.resetKey(sender.id);
      messageRateLimiter.resetKey(sender.id);
    });
  });

  describe('realtime', () => {
    it('13. sockets cannot join a request’s room or receive its messages before acceptance', async () => {
      const [a, b] = [await member('Sock A'), await member('Sock B')];
      const id = (await ask(a, b)).body.data.conversationId;
      const [sa, sb] = [await openSocket(a), await openSocket(b)];
      expect(await join(sa, id)).toBe(false);
      expect(await join(sb, id)).toBe(false);

      const accepted = next(sa, 'chat_request_accepted');
      await b.agent.post(`/api/v1/chat-requests/${id}/accept`);
      expect(await accepted).toEqual({ requestId: id, conversationId: id });
      expect(await join(sa, id)).toBe(true);
      expect(await join(sb, id)).toBe(true);
      const live = next(sa, 'new_message');
      await say(b, id, 'live now');
      expect((await live)?.content).toBe('live now');
    });

    it('notifies the recipient of a new request, and never tells the sender about a decline', async () => {
      const [a, b] = [await member('Notify A'), await member('Notify B')];
      const [sa, sb] = [await openSocket(a), await openSocket(b)];
      const received = next(sb, 'chat_request_received');
      const id = (await ask(a, b)).body.data.conversationId;
      expect(await received).toEqual({ requestId: id });

      const senderHears = next(sa, 'chat_request_removed', 500);
      const recipientHears = next(sb, 'chat_request_removed');
      await b.agent.post(`/api/v1/chat-requests/${id}/decline`);
      expect(await recipientHears).toEqual({ requestId: id }); // the recipient's other devices update
      expect(await senderHears).toBeNull();
    });

    it('tells the recipient when a sender withdraws their request', async () => {
      const [a, b] = [await member('Withdraw A'), await member('Withdraw B')];
      const id = (await ask(a, b)).body.data.conversationId;
      const sb = await openSocket(b);
      const removed = next(sb, 'chat_request_removed');
      await a.agent.post(`/api/v1/chat-requests/${id}/cancel`);
      expect(await removed).toEqual({ requestId: id });
    });

    it('15. after a reconnect, the API gives the current state (events missed while offline are not needed)', async () => {
      const [a, b] = [await member('Offline A'), await member('Offline B')];
      const sb = await openSocket(b);
      sb.disconnect();
      const id = (await ask(a, b)).body.data.conversationId; // B offline: the event is missed
      await openSocket(b); // reconnect
      expect((await incoming(b)).map((r) => r.id)).toEqual([id]);
      await b.agent.post(`/api/v1/chat-requests/${id}/accept`);
      const sa = await openSocket(a);
      expect(await join(sa, id)).toBe(true);
      expect((await chats(a)).map((c) => c.id)).toEqual([id]);
    });
  });

  it('14. chats created by a mutual like keep working exactly as before', async () => {
    const [a, b] = [await member('Match A'), await member('Match B')];
    await a.agent.post('/api/v1/interactions/like').send({ targetUserId: b.id });
    const match = await b.agent.post('/api/v1/interactions/like').send({ targetUserId: a.id });
    const id = match.body.data.conversationId;
    expect((await chats(a)).map((c) => c.id)).toEqual([id]);
    expect((await say(a, id, 'hello match')).status).toBe(201);
    expect((await say(b, id, 'hey!')).status).toBe(201);
    expect(await incoming(a)).toHaveLength(0);
    expect(await incoming(b)).toHaveLength(0);
  });
});
