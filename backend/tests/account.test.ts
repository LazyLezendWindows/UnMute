import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getDatabase } from '../src/config/database';
import { authRateLimiter } from '../src/middleware/rateLimiter';
import { resetTestDatabase } from './helpers';

const app = createApp();
const PASSWORD = 'Password123!';
const GOOGLE_PHOTO = 'https://lh3.googleusercontent.com/a/member-photo';

async function member(email: string, displayName: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: PASSWORD, displayName, dateOfBirth: '1995-05-05' });
  expect(res.status).toBe(201);
  return { agent, id: res.body.data.user.id as string, email };
}

async function matchAndChat(a: Awaited<ReturnType<typeof member>>, b: Awaited<ReturnType<typeof member>>) {
  expect((await a.agent.post('/api/v1/interactions/like').send({ targetUserId: b.id })).status).toBe(200);
  const res = await b.agent.post('/api/v1/interactions/like').send({ targetUserId: a.id });
  expect(res.status).toBe(200);
  const conversations = await a.agent.get('/api/v1/conversations');
  const conversationId = conversations.body.data.find((c: any) => c.otherUser?.id === b.id || c.participant?.id === b.id)?.id
    ?? conversations.body.data[0]?.id;
  expect(conversationId).toBeTruthy();
  return conversationId as string;
}

describe('Account lifecycle, privacy and ownership', () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });
  beforeEach(() => {
    for (const ip of ['::ffff:127.0.0.1', '127.0.0.1', '::1']) authRateLimiter.resetKey(ip);
  });

  describe('Profile photos', () => {
    it('sets and removes a photo from an allowed host', async () => {
      const m = await member('photo@example.com', 'Photo Owner');
      expect((await m.agent.patch('/api/v1/users/me').send({ avatarUrl: GOOGLE_PHOTO })).body.data.avatarUrl).toBe(GOOGLE_PHOTO);
      const removed = await m.agent.patch('/api/v1/users/me').send({ avatarUrl: '' });
      expect(removed.status).toBe(200);
      expect(removed.body.data.avatarUrl).toBe('');
    });

    it('never serves a stored photo URL from a host that is not allowed (legacy data)', async () => {
      const owner = await member('legacy-photo@example.com', 'Legacy Photo');
      await getDatabase().run("UPDATE profiles SET avatar_url = 'https://tracker.example/pixel.png' WHERE user_id = ?", [owner.id]);
      const viewer = await member('viewer@example.com', 'Viewer');
      const discover = await viewer.agent.get('/api/v1/discover');
      const card = discover.body.data.find((p: any) => p.id === owner.id);
      expect(card).toBeDefined();
      expect(card.avatarUrl).toBe('');
      expect((await owner.agent.get('/api/v1/users/me')).body.data.avatarUrl).toBe('');
    });
  });

  describe('Ownership (IDOR)', () => {
    it('has no route that edits, exports or deletes another member by id', async () => {
      const a = await member('idor-a@example.com', 'Idor A');
      const b = await member('idor-b@example.com', 'Idor B');
      const attempts = [
        a.agent.patch(`/api/v1/users/${b.id}`).send({ displayName: 'Hacked' }),
        a.agent.get(`/api/v1/users/${b.id}/export`),
        a.agent.delete(`/api/v1/users/${b.id}`).send({ confirm: 'DELETE' }),
        a.agent.post(`/api/v1/users/${b.id}/deactivate`),
      ];
      for (const res of await Promise.all(attempts)) expect(res.status).toBe(404);

      const profile = await b.agent.get('/api/v1/users/me');
      expect(profile.body.data.displayName).toBe('Idor B');
      expect((await b.agent.get('/api/v1/auth/me')).status).toBe(200);
    });

    it('ignores identity fields smuggled into a profile update', async () => {
      const a = await member('smuggle-a@example.com', 'Smuggle A');
      const b = await member('smuggle-b@example.com', 'Smuggle B');
      await a.agent.patch('/api/v1/users/me').send({ displayName: 'Changed A', userId: b.id, id: b.id, user_id: b.id });
      expect((await a.agent.get('/api/v1/users/me')).body.data.displayName).toBe('Changed A');
      expect((await b.agent.get('/api/v1/users/me')).body.data.displayName).toBe('Smuggle B');
    });

    it('never shows another member email, date of birth or exact location', async () => {
      const viewer = await member('privacy-viewer@example.com', 'Privacy Viewer');
      const res = await viewer.agent.get('/api/v1/discover');
      expect(res.status).toBe(200);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toMatch(/@example\.com/);
      expect(serialized).not.toMatch(/1995-05-05|dateOfBirth|latitude|longitude|pincode|password|token/i);
    });
  });

  describe('Data export', () => {
    it('exports only the member own data, without secrets', async () => {
      const a = await member('export-a@example.com', 'Export A');
      const b = await member('export-b@example.com', 'Export B');
      const conversationId = await matchAndChat(a, b);
      await a.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content: 'hello from A' });
      await b.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content: 'secret from B' });

      const res = await a.agent.get('/api/v1/users/me/export');
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['cache-control']).toBe('no-store');
      const data = res.body.data;
      expect(data.account).toMatchObject({ id: a.id, email: 'export-a@example.com', status: 'active' });
      expect(data.account.signInMethods).toEqual([expect.objectContaining({ provider: 'password' })]);
      expect(data.profile.displayName).toBe('Export A');
      expect(data.likesGiven).toEqual([expect.objectContaining({ userId: b.id })]);
      expect(data.matches).toHaveLength(1);
      expect(data.messagesSent.map((m: any) => m.content)).toEqual(['hello from A']);

      const serialized = JSON.stringify(data);
      expect(serialized).not.toContain('secret from B');
      expect(serialized).not.toContain('export-b@example.com');
      expect(serialized).not.toMatch(/\$2[aby]\$|password_hash|token_hash/);
    });

    it('requires authentication', async () => {
      expect((await request(app).get('/api/v1/users/me/export')).status).toBe(401);
    });
  });

  describe('Deactivation and reactivation', () => {
    it('hides a deactivated member everywhere and signs them out on every device', async () => {
      const a = await member('deact-a@example.com', 'Deact A');
      const b = await member('deact-b@example.com', 'Deact B');
      const conversationId = await matchAndChat(a, b);
      const secondDevice = request.agent(app);
      await secondDevice.post('/api/v1/auth/login').send({ email: a.email, password: PASSWORD });

      const res = await a.agent.post('/api/v1/users/me/deactivate');
      expect(res.status).toBe(200);
      expect((await a.agent.get('/api/v1/auth/me')).status).toBe(401);
      expect((await secondDevice.get('/api/v1/auth/me')).status).toBe(401);

      expect((await b.agent.get('/api/v1/matches')).body.data).toHaveLength(0);
      expect((await b.agent.get('/api/v1/conversations')).body.data).toHaveLength(0);
      expect((await b.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content: 'hi?' })).status).toBe(404);
      const discover = await b.agent.get('/api/v1/discover');
      expect(discover.body.data.map((p: any) => p.id)).not.toContain(a.id);
    });

    it('reactivates on the next successful sign-in, but not on a wrong password', async () => {
      const wrong = await request(app).post('/api/v1/auth/login').send({ email: 'deact-a@example.com', password: 'wrong-password' });
      expect(wrong.status).toBe(401);
      const status = await getDatabase().get("SELECT status FROM users WHERE email = 'deact-a@example.com'");
      expect(status.status).toBe('deactivated');

      const agent = request.agent(app);
      expect((await agent.post('/api/v1/auth/login').send({ email: 'deact-a@example.com', password: PASSWORD })).status).toBe(200);
      expect((await agent.get('/api/v1/matches')).body.data).toHaveLength(1);
    });
  });

  describe('Suspension', () => {
    it('blocks sign-in and existing sessions of a suspended member, revealing it only to the password holder', async () => {
      const m = await member('suspended@example.com', 'Suspended');
      await getDatabase().run("UPDATE users SET status = 'suspended' WHERE id = ?", [m.id]);

      expect((await m.agent.get('/api/v1/auth/me')).status).toBe(401);
      const wrong = await request(app).post('/api/v1/auth/login').send({ email: m.email, password: 'wrong-password' });
      expect(wrong.status).toBe(401);
      expect(wrong.body.code).toBeUndefined();
      const right = await request(app).post('/api/v1/auth/login').send({ email: m.email, password: PASSWORD });
      expect(right.status).toBe(403);
      expect(right.body.code).toBe('ACCOUNT_SUSPENDED');

      const status = await getDatabase().get('SELECT status FROM users WHERE id = ?', [m.id]);
      expect(status.status).toBe('suspended'); // signing in never lifts a suspension
    });

    it('cannot be lifted by deactivating and signing in again', async () => {
      const m = await member('suspend-evade@example.com', 'Evader');
      await getDatabase().run("UPDATE users SET status = 'suspended' WHERE id = ?", [m.id]);
      expect((await m.agent.post('/api/v1/users/me/deactivate')).status).toBe(401);
      expect((await request(app).post('/api/v1/auth/login').send({ email: m.email, password: PASSWORD })).status).toBe(403);
    });
  });

  describe('Account deletion', () => {
    it('requires an explicit confirmation', async () => {
      const m = await member('confirm@example.com', 'Confirm');
      expect((await m.agent.delete('/api/v1/users/me').send({})).status).toBe(400);
      expect((await m.agent.delete('/api/v1/users/me').send({ confirm: 'yes' })).status).toBe(400);
      expect((await m.agent.get('/api/v1/auth/me')).status).toBe(200);
    });

    it('requires a recent sign-in', async () => {
      const m = await member('stale@example.com', 'Stale Session');
      await getDatabase().run('UPDATE sessions SET created_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR) WHERE user_id = ?', [m.id]);
      const res = await m.agent.delete('/api/v1/users/me').send({ confirm: 'DELETE' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('REAUTH_REQUIRED');
      expect(await getDatabase().get('SELECT id FROM users WHERE id = ?', [m.id])).not.toBeNull();
    });

    it('deletes the account and its data, keeps reports for moderation, and ends every session', async () => {
      const target = await member('delete-me@example.com', 'Delete Me');
      const other = await member('delete-other@example.com', 'Other');
      const conversationId = await matchAndChat(target, other);
      await target.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content: 'bye' });
      await target.agent.patch('/api/v1/users/me').send({ avatarUrl: GOOGLE_PHOTO });
      expect((await other.agent.post('/api/v1/safety/reports').send({ reportedUserId: target.id, category: 'Spam', details: 'evidence' })).status).toBe(201);
      expect((await target.agent.post('/api/v1/safety/reports').send({ reportedUserId: other.id, category: 'Harassment' })).status).toBe(201);

      const res = await target.agent.delete('/api/v1/users/me').send({ confirm: 'DELETE' });
      expect(res.status).toBe(200);
      expect((await target.agent.get('/api/v1/auth/me')).status).toBe(401);
      expect((await request(app).post('/api/v1/auth/login').send({ email: target.email, password: PASSWORD })).status).toBe(401);

      const db = getDatabase();
      for (const [table, column] of [
        ['users', 'id'], ['profiles', 'user_id'], ['auth_accounts', 'user_id'], ['sessions', 'user_id'],
        ['likes', 'liker_id'], ['messages', 'sender_id'], ['user_interests', 'user_id'],
      ]) {
        expect(await db.get(`SELECT 1 AS x FROM ${table} WHERE ${column} = ?`, [target.id])).toBeNull();
      }
      expect(await db.get('SELECT id FROM conversations WHERE id = ?', [conversationId])).toBeNull();

      // Moderation evidence survives, with the deleted account's reference cleared.
      const reports = await db.query("SELECT reporter_id, reported_id, details FROM reports WHERE details = 'evidence' OR reported_id = ?", [other.id]);
      expect(reports).toHaveLength(2);
      expect(reports).toEqual(expect.arrayContaining([
        expect.objectContaining({ reporter_id: other.id, reported_id: null, details: 'evidence' }),
        expect.objectContaining({ reporter_id: null, reported_id: other.id }),
      ]));

      // The other member is unaffected and the email can be registered again.
      expect((await other.agent.get('/api/v1/auth/me')).status).toBe(200);
      await member('delete-me@example.com', 'Fresh Start');
    });
  });
});
