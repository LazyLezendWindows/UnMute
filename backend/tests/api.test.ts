import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { initDatabase, getDatabase } from '../src/config/database';
import { seedInterests } from '../src/utils/seed';

const app = createApp();

describe('Unmute API End-to-End Test Suite', () => {
  beforeAll(async () => {
    await initDatabase();
    const db = getDatabase();
    try {
      await db.exec('SET FOREIGN_KEY_CHECKS = 0;');
    } catch {}
    await db.exec('DELETE FROM messages;');
    await db.exec('DELETE FROM conversations;');
    await db.exec('DELETE FROM matches;');
    await db.exec('DELETE FROM likes;');
    await db.exec('DELETE FROM passes;');
    await db.exec('DELETE FROM blocks;');
    await db.exec('DELETE FROM reports;');
    await db.exec('DELETE FROM user_interests;');
    await db.exec('DELETE FROM sessions;');
    await db.exec('DELETE FROM auth_accounts;');
    await db.exec('DELETE FROM profiles;');
    await db.exec('DELETE FROM users;');
    try {
      await db.exec('SET FOREIGN_KEY_CHECKS = 1;');
    } catch {}
    await seedInterests();
  });

  function createMockGoogleIdToken(payload: Record<string, any>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ email_verified: true, ...payload })).toString('base64url');
    return `${header}.${body}.mock_signature`;
  }

  describe('Age Policy & Authentication', () => {
    it('should reject registration if date_of_birth is under 18 years old', async () => {
      // Underage user (e.g., born in 2012)
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'underage@example.com',
          password: 'Password123!',
          displayName: 'Underage User',
          dateOfBirth: '2012-05-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/18 years of age/);
    });

    it('should successfully register a valid 18+ user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
          displayName: 'Alice',
          dateOfBirth: '1998-06-20',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.profile.displayName).toBe('Alice');
      expect(res.body.data.user.profile.age).toBeGreaterThanOrEqual(18);
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'AnotherPassword!',
          displayName: 'Alice Clone',
          dateOfBirth: '1995-01-01',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should authenticate user and return token on valid login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject invalid login credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return requiresDob when new Google user authenticates without date of birth', async () => {
      const credential = createMockGoogleIdToken({
        email: 'googleuser@example.com',
        sub: 'google-sub-123456',
        name: 'Google User',
      });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresDob).toBe(true);
      expect(res.body.data.email).toBe('googleuser@example.com');
    });

    it('should reject Google registration if dateOfBirth is under 18', async () => {
      const credential = createMockGoogleIdToken({
        email: 'underage-google@example.com',
        sub: 'google-sub-underage',
        name: 'Underage Google',
      });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          credential,
          dateOfBirth: '2012-05-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully register a new user via Google auth with 18+ dateOfBirth', async () => {
      const credential = createMockGoogleIdToken({
        email: 'googleuser@example.com',
        sub: 'google-sub-123456',
        name: 'Google Member',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          credential,
          dateOfBirth: '1996-04-12',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.isNewUser).toBe(true);
      expect(res.body.data.user.email).toBe('googleuser@example.com');
      // Should set HttpOnly session cookie
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toMatch(/unmute_session=/);
    });

    it('should authenticate existing Google user directly without requiring dateOfBirth again', async () => {
      const credential = createMockGoogleIdToken({
        email: 'googleuser@example.com',
        sub: 'google-sub-123456',
        name: 'Google Member',
      });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.isNewUser).toBe(false);
      expect(res.body.data.user.email).toBe('googleuser@example.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should handle new Snapchat authentication with 18+ dateOfBirth', async () => {
      const credential = createMockGoogleIdToken({
        email: 'snapuser@example.com',
        sub: 'snap-sub-999888',
        name: 'Snap Member',
      });

      const res = await request(app)
        .post('/api/v1/auth/snapchat')
        .send({
          credential,
          dateOfBirth: '1998-11-20',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isNewUser).toBe(true);
      expect(res.body.data.user.email).toBe('snapuser@example.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should handle new Instagram authentication with 18+ dateOfBirth', async () => {
      const credential = createMockGoogleIdToken({
        email: 'instauser@example.com',
        sub: 'insta-sub-777666',
        name: 'Insta Member',
      });

      const res = await request(app)
        .post('/api/v1/auth/instagram')
        .send({
          credential,
          dateOfBirth: '1995-03-10',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isNewUser).toBe(true);
      expect(res.body.data.user.email).toBe('instauser@example.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should access user session via session cookie and revoke on logout', async () => {
      // 1. Log in to obtain session cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'Password123!' });

      expect(loginRes.status).toBe(200);
      const sessionCookie = loginRes.headers['set-cookie'];
      expect(sessionCookie).toBeDefined();

      // 2. Fetch session via cookie
      const sessionRes = await request(app)
        .get('/api/v1/auth/session')
        .set('Cookie', sessionCookie);

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.data.email).toBe('alice@example.com');

      // 3. Logout and verify cookie revocation
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', sessionCookie);

      expect(logoutRes.status).toBe(200);

      // 4. Subsequent session call with old cookie should fail
      const afterLogoutRes = await request(app)
        .get('/api/v1/auth/session')
        .set('Cookie', sessionCookie);

      expect(afterLogoutRes.status).toBe(401);
    });
  });

  describe('Profile & Interests', () => {
    let aliceToken = '';

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'Password123!' });
      aliceToken = res.body.data.token;
    });

    it('should get authenticated user profile via /users/me', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.displayName).toBe('Alice');
    });

    it('should update profile and sync interests', async () => {
      const interestsRes = await request(app)
        .get('/api/v1/users/interests')
        .set('Authorization', `Bearer ${aliceToken}`);

      const interestIds = interestsRes.body.data.slice(0, 3).map((i: any) => i.id);

      const updateRes = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          bio: 'Connecting through books and philosophy.',
          approximateLocation: 'Hyderabad',
          interactionPreferences: ['Deep conversations', 'Book/Movie discussions'],
          interestIds,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.bio).toBe('Connecting through books and philosophy.');
      expect(updateRes.body.data.approximateLocation).toBe('Hyderabad');
      expect(updateRes.body.data.interests.length).toBe(3);
    });
  });

  describe('Discovery, Matching Engine & Real-Time Chat', () => {
    let userAToken = '';
    let userAId = '';
    let userBToken = '';
    let userBId = '';

    beforeAll(async () => {
      // Register User A
      const resA = await request(app).post('/api/v1/auth/register').send({
        email: 'usera@example.com',
        password: 'Password123!',
        displayName: 'User A',
        dateOfBirth: '1997-03-10',
      });
      userAToken = resA.body.data.token;
      userAId = resA.body.data.user.id;

      // Register User B
      const resB = await request(app).post('/api/v1/auth/register').send({
        email: 'userb@example.com',
        password: 'Password123!',
        displayName: 'User B',
        dateOfBirth: '1999-08-25',
      });
      userBToken = resB.body.data.token;
      userBId = resB.body.data.user.id;
    });

    it('should find User B in User A discovery feed', async () => {
      const res = await request(app)
        .get('/api/v1/discover')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const userBInFeed = res.body.data.find((u: any) => u.id === userBId);
      expect(userBInFeed).toBeDefined();
      expect(userBInFeed.displayName).toBe('User B');
    });

    it('should return matched: false when User A likes User B first', async () => {
      const res = await request(app)
        .post('/api/v1/interactions/like')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ targetUserId: userBId });

      expect(res.status).toBe(200);
      expect(res.body.data.matched).toBe(false);
    });

    it('should return matched: true and create a conversation when User B likes User A back', async () => {
      const res = await request(app)
        .post('/api/v1/interactions/like')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ targetUserId: userAId });

      expect(res.status).toBe(200);
      expect(res.body.data.matched).toBe(true);
      expect(res.body.data.conversationId).toBeDefined();

      const conversationId = res.body.data.conversationId;

      // Verify conversation exists in User A's matches
      const matchesRes = await request(app)
        .get('/api/v1/matches')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(matchesRes.status).toBe(200);
      expect(matchesRes.body.data.some((m: any) => m.conversationId === conversationId)).toBe(true);

      // Verify User A can send a chat message
      const sendMsgRes = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ content: 'Hello User B, nice to connect!' });

      expect(sendMsgRes.status).toBe(201);
      expect(sendMsgRes.body.data.content).toBe('Hello User B, nice to connect!');

      // Verify User B receives and reads the message
      const getMsgsRes = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(getMsgsRes.status).toBe(200);
      expect(getMsgsRes.body.data.messages.length).toBe(1);
      expect(getMsgsRes.body.data.messages[0].content).toBe('Hello User B, nice to connect!');
    });
  });

  describe('Safety: Blocking & Reporting', () => {
    let blockerToken = '';
    let blockerId = '';
    let targetId = '';

    beforeAll(async () => {
      const res1 = await request(app).post('/api/v1/auth/register').send({
        email: 'blocker@example.com',
        password: 'Password123!',
        displayName: 'Blocker User',
        dateOfBirth: '1995-10-10',
      });
      blockerToken = res1.body.data.token;
      blockerId = res1.body.data.user.id;

      const res2 = await request(app).post('/api/v1/auth/register').send({
        email: 'target@example.com',
        password: 'Password123!',
        displayName: 'Target User',
        dateOfBirth: '1996-05-15',
      });
      targetId = res2.body.data.user.id;
    });

    it('should submit a safety report', async () => {
      const res = await request(app)
        .post('/api/v1/safety/reports')
        .set('Authorization', `Bearer ${blockerToken}`)
        .send({
          reportedUserId: targetId,
          category: 'Spam',
          details: 'Sending unwanted repetitive links',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should block the target user and exclude them from discovery', async () => {
      const blockRes = await request(app)
        .post('/api/v1/safety/block')
        .set('Authorization', `Bearer ${blockerToken}`)
        .send({ targetUserId: targetId, reason: 'Spamming' });

      expect(blockRes.status).toBe(200);
      expect(blockRes.body.data.success).toBe(true);

      // Verify target is excluded from discovery
      const feedRes = await request(app)
        .get('/api/v1/discover')
        .set('Authorization', `Bearer ${blockerToken}`);

      const found = feedRes.body.data.some((u: any) => u.id === targetId);
      expect(found).toBe(false);

      // Verify target cannot like the blocker
      const likeRes = await request(app)
        .post('/api/v1/interactions/like')
        .set('Authorization', `Bearer ${blockerToken}`)
        .send({ targetUserId: targetId });

      expect(likeRes.status).toBe(403);
    });
  });
});
