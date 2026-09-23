import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getDatabase } from '../src/config/database';
import { AppError } from '../src/middleware/errorHandler';
import { fakeGoogleCredential, resetTestDatabase } from './helpers';

// Google's signature verification needs Google-issued tokens, so only the verifier is replaced.
vi.mock('../src/services/auth/googleIdentity', () => ({
  verifyGoogleCredential: vi.fn(async (credential: string) => {
    const [prefix, subject, email, flag] = credential.split(':');
    if (prefix !== 'google-test-credential' || !subject || !email) {
      throw new AppError('Google sign-in could not be verified. Please try again.', 401);
    }
    return { subject, email, emailVerified: flag !== 'unverified', name: 'Google Member', picture: '' };
  }),
}));

const app = createApp();
const COOKIE = 'unmute_session';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

function sessionCookie(res: request.Response): string | undefined {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] || []);
  return cookies.find((c) => c.startsWith(`${COOKIE}=`));
}

async function registerAgent(email: string, displayName: string, dateOfBirth = '1997-03-10') {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'Password123!', displayName, dateOfBirth });
  expect(res.status).toBe(201);
  return { agent, id: res.body.data.user.id as string };
}

describe('Unmute API', () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  describe('Email registration, login and sessions', () => {
    it('rejects registration under 18', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'underage@example.com',
        password: 'Password123!',
        displayName: 'Underage User',
        dateOfBirth: '2012-05-15',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/18 years of age/);
    });

    it('registers an 18+ user with an HttpOnly session cookie and no token in the body', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'Alice@Example.com',
        password: 'Password123!',
        displayName: 'Alice',
        dateOfBirth: '1998-06-20',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeUndefined();
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.profile.age).toBeGreaterThanOrEqual(18);

      const cookie = sessionCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it('stores the password hash only in auth_accounts', async () => {
      const row = await getDatabase().get(
        `SELECT a.password_hash FROM auth_accounts a JOIN users u ON u.id = a.user_id
         WHERE u.email = ? AND a.provider = 'password'`,
        ['alice@example.com']
      );
      expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/);
    });

    it('rejects duplicate email registration', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'alice@example.com',
        password: 'AnotherPassword!',
        displayName: 'Alice Clone',
        dateOfBirth: '1995-01-01',
      });
      expect(res.status).toBe(409);
    });

    it('rejects invalid login credentials without setting a cookie', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
      expect(sessionCookie(res)).toBeUndefined();
    });

    it('restores the session, then revokes it server-side on logout', async () => {
      const agent = request.agent(app);
      const login = await agent.post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'Password123!' });
      expect(login.status).toBe(200);
      const rawCookie = sessionCookie(login)!.split(';')[0];

      const session = await agent.get('/api/v1/auth/session');
      expect(session.body.data.authenticated).toBe(true);
      expect(session.body.data.user.email).toBe('alice@example.com');

      expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);

      // Replaying the old cookie must fail: the session is revoked in the database, not just client-side.
      const replay = await request(app).get('/api/v1/auth/me').set('Cookie', rawCookie);
      expect(replay.status).toBe(401);
      const replaySession = await request(app).get('/api/v1/auth/session').set('Cookie', rawCookie);
      expect(replaySession.body.data.authenticated).toBe(false);
    });

    it('reports anonymous visitors as unauthenticated and protects endpoints', async () => {
      const session = await request(app).get('/api/v1/auth/session');
      expect(session.status).toBe(200);
      expect(session.body.data).toEqual({ authenticated: false, user: null });

      expect((await request(app).get('/api/v1/users/me')).status).toBe(401);
      expect((await request(app).get('/api/v1/users/me').set('Cookie', `${COOKIE}=forged-token`)).status).toBe(401);
      expect((await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer anything')).status).toBe(401);
    });

    it('rejects state-changing requests from untrusted origins', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'https://evil.example')
        .send({ email: 'alice@example.com', password: 'Password123!' });
      expect(res.status).toBe(403);
      expect(sessionCookie(res)).toBeUndefined();
    });
  });

  describe('Google sign-in', () => {
    it('rejects client-asserted identity without a verified credential', async () => {
      const res = await request(app).post('/api/v1/auth/google').send({ email: 'alice@example.com', googleId: 'attacker' });
      expect(res.status).toBe(400);
      expect(sessionCookie(res)).toBeUndefined();
    });

    it('rejects extra identity fields even alongside a credential', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: fakeGoogleCredential('sub-x', 'x@gmail.com'), email: 'alice@example.com' });
      expect(res.status).toBe(400);
    });

    it('rejects credentials that fail verification', async () => {
      const res = await request(app).post('/api/v1/auth/google').send({ credential: 'not-a-valid-google-id-token' });
      expect(res.status).toBe(401);
      expect(sessionCookie(res)).toBeUndefined();
    });

    it('asks a new Google user for a date of birth before creating anything', async () => {
      const res = await request(app).post('/api/v1/auth/google').send({ credential: fakeGoogleCredential('sub-new', 'new@gmail.com') });
      expect(res.status).toBe(200);
      expect(res.body.data.requiresDob).toBe(true);
      expect(res.body.data.profile.email).toBe('new@gmail.com');
      expect(sessionCookie(res)).toBeUndefined();

      const user = await getDatabase().get('SELECT id FROM users WHERE email = ?', ['new@gmail.com']);
      expect(user).toBeNull();
    });

    it('rejects an under-18 date of birth', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: fakeGoogleCredential('sub-new', 'new@gmail.com'), dateOfBirth: '2012-05-15' });
      expect(res.status).toBe(400);
    });

    it('creates the account and a session once an 18+ date of birth is supplied', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: fakeGoogleCredential('sub-new', 'new@gmail.com'), dateOfBirth: '1996-04-12' });
      expect(res.status).toBe(200);
      expect(res.body.data.isNewUser).toBe(true);
      expect(res.body.data.user.email).toBe('new@gmail.com');
      // Signing in with Google is not identity verification.
      expect(res.body.data.user.profile.isVerified).toBe(false);
      expect(sessionCookie(res)).toBeDefined();

      const link = await getDatabase().get(
        "SELECT user_id FROM auth_accounts WHERE provider = 'google' AND provider_account_id = ?",
        ['sub-new']
      );
      expect(link.user_id).toBe(res.body.data.user.id);
    });

    it('signs a returning Google user in by subject without asking for a date of birth again', async () => {
      const res = await request(app).post('/api/v1/auth/google').send({ credential: fakeGoogleCredential('sub-new', 'new@gmail.com') });
      expect(res.status).toBe(200);
      expect(res.body.data.requiresDob).toBe(false);
      expect(res.body.data.isNewUser).toBe(false);
      expect(sessionCookie(res)).toBeDefined();
    });

    it('links a verified Google email to the existing account with that email', async () => {
      const alice = await getDatabase().get('SELECT id FROM users WHERE email = ?', ['alice@example.com']);
      const res = await request(app).post('/api/v1/auth/google').send({ credential: fakeGoogleCredential('sub-alice', 'alice@example.com') });
      expect(res.status).toBe(200);
      expect(res.body.data.isNewUser).toBe(false);
      expect(res.body.data.user.id).toBe(alice.id);
    });

    it('refuses email-based linking or signup when Google has not verified the email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: fakeGoogleCredential('sub-unverified', 'alice@example.com', false), dateOfBirth: '1990-01-01' });
      expect(res.status).toBe(403);
      expect(sessionCookie(res)).toBeUndefined();
    });
  });

  describe('Profile & interests', () => {
    let alice: request.Agent;

    beforeAll(async () => {
      alice = request.agent(app);
      await alice.post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'Password123!' });
    });

    it('gets the authenticated user profile', async () => {
      const res = await alice.get('/api/v1/users/me');
      expect(res.status).toBe(200);
      expect(res.body.data.displayName).toBe('Alice');
    });

    it('updates the profile and syncs interests', async () => {
      const interestsRes = await alice.get('/api/v1/users/interests');
      const interestIds = interestsRes.body.data.slice(0, 3).map((i: any) => i.id);

      const res = await alice.patch('/api/v1/users/me').send({
        bio: 'Connecting through books and philosophy.',
        approximateLocation: 'Hyderabad',
        interactionPreferences: ['Deep conversations', 'Book/Movie discussions'],
        interestIds,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('Connecting through books and philosophy.');
      expect(res.body.data.interests.length).toBe(3);
    });

    it('de-duplicates repeated interest ids', async () => {
      const interestsRes = await alice.get('/api/v1/users/interests');
      const id = interestsRes.body.data[0].id;
      const res = await alice.patch('/api/v1/users/me').send({ interestIds: [id, id] });
      expect(res.status).toBe(200);
      expect(res.body.data.interests.map((i: any) => i.id)).toEqual([id]);
    });

    it('rejects unknown interests without applying any part of the update', async () => {
      const res = await alice.patch('/api/v1/users/me').send({ bio: 'Should not be saved', interestIds: ['no-such-interest'] });
      expect(res.status).toBe(400);
      const profile = await alice.get('/api/v1/users/me');
      expect(profile.body.data.bio).toBe('Connecting through books and philosophy.');
      expect(profile.body.data.interests.length).toBe(1);
    });
  });

  describe('Discovery, matching & chat', () => {
    let a: { agent: request.Agent; id: string };
    let b: { agent: request.Agent; id: string };

    beforeAll(async () => {
      a = await registerAgent('usera@example.com', 'User A');
      b = await registerAgent('userb@example.com', 'User B', '1999-08-25');
    });

    it('finds User B in User A discovery feed', async () => {
      const res = await a.agent.get('/api/v1/discover');
      expect(res.status).toBe(200);
      expect(res.body.data.find((u: any) => u.id === b.id)?.displayName).toBe('User B');
    });

    it('creates a match and conversation only on a mutual like, then allows chat', async () => {
      const first = await a.agent.post('/api/v1/interactions/like').send({ targetUserId: b.id });
      expect(first.body.data.matched).toBe(false);

      const second = await b.agent.post('/api/v1/interactions/like').send({ targetUserId: a.id });
      expect(second.body.data.matched).toBe(true);
      const conversationId = second.body.data.conversationId;

      const matches = await a.agent.get('/api/v1/matches');
      expect(matches.body.data.some((m: any) => m.conversationId === conversationId)).toBe(true);

      const sent = await a.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content: 'Hello User B!' });
      expect(sent.status).toBe(201);
      expect(sent.body.data.senderId).toBe(a.id);

      const read = await b.agent.get(`/api/v1/conversations/${conversationId}/messages`);
      expect(read.body.data.messages.map((m: any) => m.content)).toEqual(['Hello User B!']);
      // History uses the same camelCase message shape as send responses and realtime events.
      expect(read.body.data.messages[0]).toEqual({
        id: sent.body.data.id,
        conversationId,
        senderId: a.id,
        content: 'Hello User B!',
        status: 'sent',
        createdAt: sent.body.data.createdAt,
      });

      const conversations = await b.agent.get('/api/v1/conversations');
      const conversation = conversations.body.data.find((c: any) => c.id === conversationId);
      expect(conversation.lastMessage.senderId).toBe(a.id);
      expect(conversation.otherUser).toMatchObject({ id: a.id, displayName: 'User A' });
    });

    it('treats a repeated like as a no-op', async () => {
      const res = await a.agent.post('/api/v1/interactions/like').send({ targetUserId: b.id });
      expect(res.status).toBe(200);
      expect(res.body.data.matched).toBe(true);
      const likes = await getDatabase().get('SELECT COUNT(*) AS n FROM likes WHERE liker_id = ? AND likee_id = ?', [a.id, b.id]);
      expect(Number(likes.n)).toBe(1);
    });

    it('creates exactly one match and conversation when two users like each other simultaneously', async () => {
      const c = await registerAgent('userc@example.com', 'User C');
      const d = await registerAgent('userd@example.com', 'User D');

      for (let round = 0; round < 5; round++) {
        await getDatabase().run('DELETE FROM likes WHERE liker_id IN (?, ?)', [c.id, d.id]);
        await getDatabase().run('DELETE FROM matches WHERE user_a_id IN (?, ?)', [c.id, d.id]);

        const [fromC, fromD] = await Promise.all([
          c.agent.post('/api/v1/interactions/like').send({ targetUserId: d.id }),
          d.agent.post('/api/v1/interactions/like').send({ targetUserId: c.id }),
        ]);
        expect([fromC.status, fromD.status]).toEqual([200, 200]);
        expect(fromC.body.data.matched || fromD.body.data.matched).toBe(true);

        const counts = await getDatabase().get(
          `SELECT (SELECT COUNT(*) FROM matches WHERE user_a_id IN (?, ?) AND user_b_id IN (?, ?)) AS matches,
                  (SELECT COUNT(*) FROM conversations WHERE user_a_id IN (?, ?) AND user_b_id IN (?, ?)) AS conversations`,
          [c.id, d.id, c.id, d.id, c.id, d.id, c.id, d.id]
        );
        expect([Number(counts.matches), Number(counts.conversations)]).toEqual([1, 1]);
      }
    });

    it('returns 404 when liking or passing on a user that does not exist, 400 for malformed ids', async () => {
      expect((await a.agent.post('/api/v1/interactions/like').send({ targetUserId: MISSING_ID })).status).toBe(404);
      expect((await a.agent.post('/api/v1/interactions/pass').send({ targetUserId: MISSING_ID })).status).toBe(404);
      expect((await a.agent.post('/api/v1/interactions/like').send({ targetUserId: "1' OR '1'='1" })).status).toBe(400);
    });

    it('returns the most recent page of message history, oldest first', async () => {
      const convs = await a.agent.get('/api/v1/conversations');
      const conversationId = convs.body.data.find((c: any) => c.otherUser.id === b.id).id;
      for (const content of ['second', 'third', 'fourth']) {
        await a.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content });
      }
      const page = await b.agent.get(`/api/v1/conversations/${conversationId}/messages?limit=2`);
      expect(page.body.data.messages.map((m: any) => m.content)).toEqual(['third', 'fourth']);
      const older = await b.agent.get(`/api/v1/conversations/${conversationId}/messages?limit=2&offset=2`);
      expect(older.body.data.messages.map((m: any) => m.content)).toEqual(['Hello User B!', 'second']);
    });

    it('never exposes a conversation to a non-participant (IDOR)', async () => {
      const outsider = await registerAgent('outsider@example.com', 'Outsider');
      const convs = await a.agent.get('/api/v1/conversations');
      const conversationId = convs.body.data[0].id;

      expect((await outsider.agent.get(`/api/v1/conversations/${conversationId}/messages`)).status).toBe(404);
      const send = await outsider.agent.post(`/api/v1/conversations/${conversationId}/messages`).send({ content: 'hi' });
      expect(send.status).toBe(404);
      expect((await outsider.agent.get('/api/v1/conversations')).body.data).toEqual([]);
    });
  });

  describe('Safety: blocking & reporting', () => {
    let blocker: { agent: request.Agent; id: string };
    let target: { agent: request.Agent; id: string };

    beforeAll(async () => {
      blocker = await registerAgent('blocker@example.com', 'Blocker User', '1995-10-10');
      target = await registerAgent('target@example.com', 'Target User', '1996-05-15');
    });

    it('submits a safety report', async () => {
      const res = await blocker.agent
        .post('/api/v1/safety/reports')
        .send({ reportedUserId: target.id, category: 'Spam', details: 'Sending unwanted repetitive links' });
      expect(res.status).toBe(201);
    });

    it('blocks the target and excludes them from discovery and likes', async () => {
      const blockRes = await blocker.agent.post('/api/v1/safety/block').send({ targetUserId: target.id, reason: 'Spamming' });
      expect(blockRes.status).toBe(200);
      const again = await blocker.agent.post('/api/v1/safety/block').send({ targetUserId: target.id });
      expect(again.status).toBe(200);

      const feed = await blocker.agent.get('/api/v1/discover');
      expect(feed.body.data.some((u: any) => u.id === target.id)).toBe(false);

      const like = await target.agent.post('/api/v1/interactions/like').send({ targetUserId: blocker.id });
      expect(like.status).toBe(403);
    });
  });
  describe('Query efficiency & ranking', () => {
    /** Counts database round-trips made while serving one request. */
    async function countQueries(run: () => Promise<unknown>): Promise<number> {
      const db = getDatabase();
      const spies = [vi.spyOn(db, 'query'), vi.spyOn(db, 'get'), vi.spyOn(db, 'run')];
      try {
        await run();
        return spies.reduce((total, spy) => total + spy.mock.calls.length, 0);
      } finally {
        spies.forEach((spy) => spy.mockRestore());
      }
    }

    async function matchWith(hub: { agent: request.Agent; id: string }, email: string) {
      const other = await registerAgent(email, email.split('@')[0]);
      await hub.agent.post('/api/v1/interactions/like').send({ targetUserId: other.id });
      await other.agent.post('/api/v1/interactions/like').send({ targetUserId: hub.id });
      const conv = await hub.agent.get('/api/v1/conversations');
      const id = conv.body.data.find((c: any) => c.otherUser.id === other.id).id;
      await other.agent.post(`/api/v1/conversations/${id}/messages`).send({ content: `hi from ${email}` });
    }

    it('serves conversations, matches and discovery with a constant number of queries', async () => {
      const hub = await registerAgent('hub@example.com', 'Hub');
      await matchWith(hub, 'spoke1@example.com');
      const paths = ['/api/v1/conversations', '/api/v1/matches', '/api/v1/discover'];
      const withOne = [];
      for (const p of paths) withOne.push(await countQueries(() => hub.agent.get(p)));

      for (const n of [2, 3, 4]) await matchWith(hub, `spoke${n}@example.com`);
      const withFour = [];
      for (const p of paths) withFour.push(await countQueries(() => hub.agent.get(p)));

      expect(withFour).toEqual(withOne);
      const convs = await hub.agent.get('/api/v1/conversations');
      expect(convs.body.data).toHaveLength(4);
      expect(convs.body.data.every((c: any) => c.unreadCount === 1 && c.lastMessage.content.startsWith('hi from'))).toBe(true);
    });

    it('ranks discovery by shared interests across the whole pool, not just within a page', async () => {
      const viewer = await registerAgent('ranker@example.com', 'Ranker');
      const allInterests = (await viewer.agent.get('/api/v1/users/interests')).body.data;
      const chosen = allInterests.slice(5, 8).map((i: any) => i.id);
      const kindred = await registerAgent('kindred@example.com', 'Kindred');
      await viewer.agent.patch('/api/v1/users/me').send({ interestIds: chosen });
      await kindred.agent.patch('/api/v1/users/me').send({ interestIds: chosen });
      // A newer profile with nothing in common must not outrank the best match.
      const recent = await registerAgent('recent@example.com', 'Recent');
      await recent.agent.patch('/api/v1/users/me').send({ bio: 'Just updated' });

      const firstPage = await viewer.agent.get('/api/v1/discover?limit=1');
      expect(firstPage.body.data[0].id).toBe(kindred.id);
      expect(firstPage.body.data[0].commonInterestsCount).toBe(3);
    });
  });

  describe('Input validation & error handling', () => {
    let user: { agent: request.Agent; id: string };

    beforeAll(async () => {
      user = await registerAgent('validation@example.com', 'Validation User');
    });

    it('validates pagination parameters', async () => {
      expect((await user.agent.get('/api/v1/discover?limit=abc')).status).toBe(400);
      expect((await user.agent.get('/api/v1/discover?limit=100000')).status).toBe(400);
      expect((await user.agent.get('/api/v1/discover?offset=-1')).status).toBe(400);
      const page = await user.agent.get('/api/v1/discover?limit=1');
      expect(page.status).toBe(200);
      expect(page.body.data.length).toBeLessThanOrEqual(1);
    });

    it('validates route ids', async () => {
      const res = await user.agent.get('/api/v1/conversations/not-a-uuid/messages');
      expect(res.status).toBe(400);
      expect((await user.agent.get(`/api/v1/conversations/${MISSING_ID}/messages`)).status).toBe(404);
    });

    it('returns 404 when blocking or reporting a user that does not exist', async () => {
      expect((await user.agent.post('/api/v1/safety/block').send({ targetUserId: MISSING_ID })).status).toBe(404);
      const report = await user.agent.post('/api/v1/safety/reports').send({ reportedUserId: MISSING_ID, category: 'Spam' });
      expect(report.status).toBe(404);
    });

    it('rejects avatar URLs that are not https', async () => {
      for (const avatarUrl of ['javascript:alert(1)', 'http://example.com/a.png', 'data:image/png;base64,AAAA']) {
        expect((await user.agent.patch('/api/v1/users/me').send({ avatarUrl })).status).toBe(400);
      }
      expect((await user.agent.patch('/api/v1/users/me').send({ avatarUrl: 'https://example.com/a.png' })).status).toBe(200);
    });

    it('answers malformed JSON with a 400 that leaks no internals', async () => {
      const res = await user.agent.post('/api/v1/interactions/like').set('Content-Type', 'application/json').send('{"targetUserId":');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ success: false, error: 'Malformed JSON request body' });
    });
  });
});
