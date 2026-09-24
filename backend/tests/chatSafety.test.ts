import crypto from 'crypto';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getDatabase } from '../src/config/database';
import { authRateLimiter, messageRateLimiter, reportRateLimiter } from '../src/middleware/rateLimiter';
import { resetTestDatabase } from './helpers';

const app = createApp();
const PASSWORD = 'Password123!';
type Member = { agent: ReturnType<typeof request.agent>; id: string; email: string };

async function member(email: string, displayName: string): Promise<Member> {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: PASSWORD, displayName, dateOfBirth: '1995-05-05' });
  expect(res.status).toBe(201);
  return { agent, id: res.body.data.user.id, email };
}

async function match(a: Member, b: Member): Promise<string> {
  await a.agent.post('/api/v1/interactions/like').send({ targetUserId: b.id });
  const res = await b.agent.post('/api/v1/interactions/like').send({ targetUserId: a.id });
  expect(res.body.data.conversationId).toBeTruthy();
  return res.body.data.conversationId;
}

const send = (m: Member, conversationId: string, body: Record<string, unknown>) =>
  m.agent.post(`/api/v1/conversations/${conversationId}/messages`).send(body);

async function staff(email: string, role: 'moderator' | 'admin') {
  const m = await member(email, `Staff ${role}`);
  await getDatabase().run('UPDATE users SET role = ? WHERE id = ?', [role, m.id]);
  return m;
}

describe('Chat reliability, blocking, reporting and moderation', () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });
  beforeEach(() => {
    for (const ip of ['::ffff:127.0.0.1', '127.0.0.1', '::1']) authRateLimiter.resetKey(ip);
  });

  describe('Sending', () => {
    let a: Member;
    let b: Member;
    let conversationId: string;
    beforeAll(async () => {
      a = await member('send-a@example.com', 'Send A');
      b = await member('send-b@example.com', 'Send B');
      conversationId = await match(a, b);
    });
    beforeEach(() => {
      messageRateLimiter.resetKey(a.id);
      messageRateLimiter.resetKey(b.id);
    });

    it('stores a retried send once (same client message id)', async () => {
      const clientMessageId = crypto.randomUUID();
      const first = await send(a, conversationId, { content: 'only once', clientMessageId });
      const retry = await send(a, conversationId, { content: 'only once', clientMessageId });
      expect(first.status).toBe(201);
      expect(retry.status).toBe(200);
      expect(retry.body.data.id).toBe(first.body.data.id);
      const rows = await getDatabase().query("SELECT id FROM messages WHERE content = 'only once'");
      expect(rows).toHaveLength(1);
    });

    it('does not let one member reuse another member id to collide with their messages', async () => {
      const clientMessageId = crypto.randomUUID();
      const fromA = await send(a, conversationId, { content: 'from A', clientMessageId });
      const fromB = await send(b, conversationId, { content: 'from B', clientMessageId });
      expect(fromA.status).toBe(201);
      expect(fromB.status).toBe(201);
      expect(fromB.body.data.content).toBe('from B');
      expect(fromB.body.data.senderId).toBe(b.id);
    });

    it('always takes the sender from the session, never from the request', async () => {
      const res = await send(a, conversationId, { content: 'spoof?', senderId: b.id, sender_id: b.id });
      expect(res.status).toBe(201);
      expect(res.body.data.senderId).toBe(a.id);
    });

    it('keeps rapid messages in the order they were sent', async () => {
      const contents = Array.from({ length: 8 }, (_, i) => `rapid-${i}`);
      for (const content of contents) await send(a, conversationId, { content });
      const page = await b.agent.get(`/api/v1/conversations/${conversationId}/messages?limit=100`);
      const rapid = page.body.data.messages.map((m: any) => m.content).filter((c: string) => c.startsWith('rapid-'));
      expect(rapid).toEqual(contents);
    });

    it('rejects empty, oversized and malformed messages', async () => {
      expect((await send(a, conversationId, { content: '   ' })).status).toBe(400);
      expect((await send(a, conversationId, { content: 'x'.repeat(2001) })).status).toBe(400);
      expect((await send(a, conversationId, { content: 'ok', clientMessageId: 'not-a-uuid' })).status).toBe(400);
      expect((await send(a, conversationId, { content: { $gt: '' } })).status).toBe(400);
    });

    it('rate-limits message floods per member', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 31; i++) statuses.push((await send(a, conversationId, { content: `flood ${i}` })).status);
      expect(statuses.slice(0, 30).every((s) => s === 201)).toBe(true);
      expect(statuses[30]).toBe(429);
      // The limit is per member: the other participant can still reply.
      expect((await send(b, conversationId, { content: 'still here' })).status).toBe(201);
    });

    it('never lets a non-participant send or read, and cursors from other chats leak nothing', async () => {
      const outsider = await member('send-x@example.com', 'Outsider');
      const other = await member('send-y@example.com', 'Other');
      const otherConversation = await match(outsider, other);
      await send(outsider, otherConversation, { content: 'outsider secret' });
      const foreignMessage = (await outsider.agent.get(`/api/v1/conversations/${otherConversation}/messages`)).body.data.messages[0];

      expect((await send(outsider, conversationId, { content: 'intrude' })).status).toBe(404);
      expect((await outsider.agent.get(`/api/v1/conversations/${conversationId}/messages`)).status).toBe(404);
      const cursor = await a.agent.get(`/api/v1/conversations/${conversationId}/messages?before=${foreignMessage.id}`);
      expect(cursor.status).toBe(200);
      expect(JSON.stringify(cursor.body)).not.toContain('outsider secret');
    });
  });

  describe('Blocking', () => {
    it('stops messaging both ways, and the REST unblock restores it', async () => {
      const a = await member('block-a@example.com', 'Block A');
      const b = await member('block-b@example.com', 'Block B');
      const conversationId = await match(a, b);

      expect((await a.agent.post('/api/v1/safety/block').send({ targetUserId: b.id })).status).toBe(200);
      expect((await send(a, conversationId, { content: 'blocked?' })).status).toBe(403);
      expect((await send(b, conversationId, { content: 'blocked?' })).status).toBe(403);
      expect((await b.agent.get(`/api/v1/conversations/${conversationId}/messages`)).status).toBe(403);
      expect((await b.agent.get('/api/v1/conversations')).body.data).toHaveLength(0);

      // Only the blocker can lift their own block.
      expect((await b.agent.delete(`/api/v1/safety/blocks/${a.id}`)).status).toBe(200);
      expect((await send(b, conversationId, { content: 'still blocked' })).status).toBe(403);

      expect((await a.agent.delete(`/api/v1/safety/blocks/${b.id}`)).status).toBe(200);
      expect((await send(b, conversationId, { content: 'unblocked' })).status).toBe(201);
      expect((await a.agent.delete('/api/v1/safety/blocks/not-a-uuid')).status).toBe(400);
    });
  });

  describe('Reports and moderation', () => {
    let reporter: Member;
    let reported: Member;
    let moderator: Member;
    let conversationId: string;
    beforeAll(async () => {
      reporter = await member('rep-a@example.com', 'Reporter');
      reported = await member('rep-b@example.com', 'Reported');
      moderator = await staff('mod@example.com', 'moderator');
      conversationId = await match(reporter, reported);
      await send(reported, conversationId, { content: 'abusive message' });
      await send(reporter, conversationId, { content: 'please stop' });
    });
    beforeEach(() => {
      reportRateLimiter.resetKey(reporter.id);
    });

    it('files one report with an evidence snapshot, folding in repeat submissions', async () => {
      const first = await reporter.agent.post('/api/v1/safety/reports').send({ reportedUserId: reported.id, category: 'Harassment', details: 'see chat' });
      const repeat = await reporter.agent.post('/api/v1/safety/reports').send({ reportedUserId: reported.id, category: 'Harassment' });
      expect(first.status).toBe(201);
      expect(repeat.status).toBe(201);
      const rows = await getDatabase().query('SELECT evidence, conversation_id FROM reports WHERE reporter_id = ?', [reporter.id]);
      expect(rows).toHaveLength(1);
      expect(rows[0].conversation_id).toBe(conversationId);
      const evidence = JSON.parse(rows[0].evidence);
      expect(evidence.reportedProfile.displayName).toBe('Reported');
      expect(evidence.messages).toEqual([
        expect.objectContaining({ from: 'reported', content: 'abusive message' }),
        expect.objectContaining({ from: 'reporter', content: 'please stop' }),
      ]);
    });

    it('hides every moderation endpoint from ordinary members (404, not 403)', async () => {
      const report = await getDatabase().get('SELECT id FROM reports WHERE reporter_id = ?', [reporter.id]);
      const attempts = [
        reporter.agent.get('/api/v1/moderation/reports'),
        reporter.agent.get(`/api/v1/moderation/reports/${report.id}`),
        reporter.agent.post(`/api/v1/moderation/reports/${report.id}/decision`).send({ status: 'rejected' }),
        reported.agent.post(`/api/v1/moderation/users/${reporter.id}/suspend`).send({ note: 'revenge' }),
        reported.agent.post(`/api/v1/moderation/users/${reported.id}/unsuspend`).send({ note: 'self' }),
      ];
      for (const res of await Promise.all(attempts)) expect(res.status).toBe(404);
      expect((await request(app).get('/api/v1/moderation/reports')).status).toBe(401);
      const unchanged = await getDatabase().get('SELECT status FROM reports WHERE id = ?', [report.id]);
      expect(unchanged.status).toBe('pending');
    });

    it('lets a moderator review the queue with evidence and resolve a report with a suspension', async () => {
      const queue = await moderator.agent.get('/api/v1/moderation/reports?status=pending');
      expect(queue.status).toBe(200);
      const item = queue.body.data.find((r: any) => r.reported.id === reported.id);
      expect(item.evidence).toBeUndefined(); // the list stays light; evidence is on the detail view

      const detail = await moderator.agent.get(`/api/v1/moderation/reports/${item.id}`);
      expect(detail.body.data.evidence.messages).toHaveLength(2);
      expect(detail.body.data.reported.openReports).toBe(1);

      const decision = await moderator.agent
        .post(`/api/v1/moderation/reports/${item.id}/decision`)
        .send({ status: 'resolved', note: 'confirmed harassment', suspendUser: true });
      expect(decision.status).toBe(200);
      expect(decision.body.data.status).toBe('resolved');
      expect(decision.body.data.review).toMatchObject({ by: moderator.id, note: 'confirmed harassment' });
      expect(decision.body.data.history.map((h: any) => h.action).sort()).toEqual(['resolve', 'suspend']);

      // The suspended member is signed out and cannot sign back in.
      expect((await reported.agent.get('/api/v1/auth/me')).status).toBe(401);
      const login = await request(app).post('/api/v1/auth/login').send({ email: reported.email, password: PASSWORD });
      expect(login.body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('keeps the report and its evidence after the reported member is deleted', async () => {
      await getDatabase().run('DELETE FROM users WHERE id = ?', [reported.id]);
      const report = await getDatabase().get('SELECT id FROM reports WHERE reporter_id = ?', [reporter.id]);
      const detail = await moderator.agent.get(`/api/v1/moderation/reports/${report.id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.data.reported.id).toBeNull();
      expect(detail.body.data.evidence.messages[0].content).toBe('abusive message');
      const audit = await getDatabase().query('SELECT action FROM moderation_actions WHERE report_id = ?', [report.id]);
      expect(audit.length).toBeGreaterThan(0);
    });

    it('does not let staff suspend themselves or other staff', async () => {
      const admin = await staff('admin@example.com', 'admin');
      expect((await moderator.agent.post(`/api/v1/moderation/users/${moderator.id}/suspend`).send({ note: 'x' })).status).toBe(400);
      expect((await moderator.agent.post(`/api/v1/moderation/users/${admin.id}/suspend`).send({ note: 'x' })).status).toBe(403);
      expect((await moderator.agent.post(`/api/v1/moderation/users/${reporter.id}/suspend`).send({})).status).toBe(400); // note required
    });

    it('lifts a suspension to a state the member can recover from by signing in', async () => {
      const m = await member('lift@example.com', 'Lift');
      expect((await moderator.agent.post(`/api/v1/moderation/users/${m.id}/suspend`).send({ note: 'mistake' })).status).toBe(200);
      expect((await moderator.agent.post(`/api/v1/moderation/users/${m.id}/unsuspend`).send({ note: 'appeal accepted' })).status).toBe(200);
      const login = await request(app).post('/api/v1/auth/login').send({ email: m.email, password: PASSWORD });
      expect(login.status).toBe(200);
      const audit = await getDatabase().query('SELECT action FROM moderation_actions WHERE target_user_id = ? ORDER BY created_at', [m.id]);
      expect(audit.map((r: any) => r.action).sort()).toEqual(['suspend', 'unsuspend']);
    });
  });
});
