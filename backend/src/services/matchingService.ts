import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateAge } from '../utils/age';
import { getSocketServer } from '../sockets/chatSocket';

export class MatchingService {
  static async recordLike(likerId: string, likeeId: string) {
    if (likerId === likeeId) {
      throw new AppError('Cannot like yourself', 400);
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // Check if either has blocked the other
    const isBlocked = await db.get(
      'SELECT id FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [likerId, likeeId]
    );
    if (isBlocked) {
      throw new AppError('Action not allowed', 403);
    }

    // Insert or update like
    const existingLike = await db.get(
      'SELECT id FROM likes WHERE liker_id = $1 AND likee_id = $2',
      [likerId, likeeId]
    );

    if (!existingLike) {
      const likeId = crypto.randomUUID();
      await db.run(
        'INSERT INTO likes (id, liker_id, likee_id, created_at) VALUES ($1, $2, $3, $4)',
        [likeId, likerId, likeeId, now]
      );
    }

    // Check if likee has already liked liker (Mutual Match!)
    const reciprocalLike = await db.get(
      'SELECT id FROM likes WHERE liker_id = $1 AND likee_id = $2',
      [likeeId, likerId]
    );

    if (reciprocalLike) {
      // Check if match already exists
      const userA = likerId < likeeId ? likerId : likeeId;
      const userB = likerId < likeeId ? likeeId : likerId;

      let match = await db.get(
        'SELECT id FROM matches WHERE user_a_id = $1 AND user_b_id = $2',
        [userA, userB]
      );

      let conversationId = '';

      if (!match) {
        const matchId = crypto.randomUUID();
        await db.run(
          'INSERT INTO matches (id, user_a_id, user_b_id, created_at) VALUES ($1, $2, $3, $4)',
          [matchId, userA, userB, now]
        );

        const convId = crypto.randomUUID();
        await db.run(
          `INSERT INTO conversations (id, match_id, user_a_id, user_b_id, last_message_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [convId, matchId, userA, userB, now]
        );

        conversationId = convId;
      } else {
        const conv = await db.get('SELECT id FROM conversations WHERE match_id = $1', [match.id]);
        conversationId = conv?.id || '';
      }

      // Fetch matched user's profile to return
      const matchedProfile = await db.get(
        `SELECT p.display_name, p.date_of_birth, p.bio, p.approximate_location, p.avatar_url
         FROM profiles p WHERE p.user_id = $1`,
        [likeeId]
      );

      const result = {
        matched: true,
        conversationId,
        matchedUser: {
          id: likeeId,
          displayName: matchedProfile?.display_name || 'Connection',
          age: matchedProfile ? calculateAge(matchedProfile.date_of_birth) : 18,
          bio: matchedProfile?.bio || '',
          approximateLocation: matchedProfile?.approximate_location || '',
          avatarUrl: matchedProfile?.avatar_url || '',
        },
      };

      // Notify the other user in real-time if connected via Socket.io
      const io = getSocketServer();
      if (io) {
        const likerProfile = await db.get(
          `SELECT p.display_name, p.date_of_birth, p.avatar_url FROM profiles p WHERE p.user_id = $1`,
          [likerId]
        );

        io.to(`user:${likeeId}`).emit('new_match', {
          conversationId,
          matchedUser: {
            id: likerId,
            displayName: likerProfile?.display_name || 'New Match',
            age: likerProfile ? calculateAge(likerProfile.date_of_birth) : 18,
            avatarUrl: likerProfile?.avatar_url || '',
          },
        });
      }

      return result;
    }

    return { matched: false };
  }

  static async recordPass(passerId: string, passeeId: string) {
    if (passerId === passeeId) {
      throw new AppError('Cannot pass on yourself', 400);
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = await db.get(
      'SELECT id FROM passes WHERE passer_id = $1 AND passee_id = $2',
      [passerId, passeeId]
    );

    if (!existing) {
      const passId = crypto.randomUUID();
      await db.run(
        'INSERT INTO passes (id, passer_id, passee_id, created_at) VALUES ($1, $2, $3, $4)',
        [passId, passerId, passeeId, now]
      );
    }

    return { success: true };
  }

  static async getMatches(currentUserId: string) {
    const db = getDatabase();

    const matches = await db.query(
      `SELECT
         m.id as match_id,
         m.created_at,
         c.id as conversation_id,
         c.last_message_at,
         CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END as other_user_id
       FROM matches m
       JOIN conversations c ON c.match_id = m.id
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
         AND m.user_a_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1 UNION SELECT blocker_id FROM blocks WHERE blocked_id = $1)
         AND m.user_b_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1 UNION SELECT blocker_id FROM blocks WHERE blocked_id = $1)
       ORDER BY COALESCE(c.last_message_at, m.created_at) DESC`,
      [currentUserId]
    );

    return Promise.all(
      matches.map(async (m) => {
        const profile = await db.get(
          `SELECT p.display_name, p.date_of_birth, p.bio, p.approximate_location, p.avatar_url, p.is_verified
           FROM profiles p WHERE p.user_id = $1`,
          [m.other_user_id]
        );

        const interests = await db.query(
          `SELECT i.name FROM user_interests ui
           JOIN interests i ON ui.interest_id = i.id
           WHERE ui.user_id = $1`,
          [m.other_user_id]
        );

        // Get latest message
        const lastMsg = await db.get(
          `SELECT content, sender_id, created_at, status
           FROM messages WHERE conversation_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [m.conversation_id]
        );

        return {
          matchId: m.match_id,
          conversationId: m.conversation_id,
          createdAt: m.created_at,
          lastMessageAt: m.last_message_at,
          lastMessage: lastMsg || null,
          user: {
            id: m.other_user_id,
            displayName: profile?.display_name || 'Connection',
            age: profile ? calculateAge(profile.date_of_birth) : 18,
            bio: profile?.bio || '',
            approximateLocation: profile?.approximate_location || '',
            avatarUrl: profile?.avatar_url || '',
            isVerified: Boolean(profile?.is_verified),
            interests: interests.map((i) => i.name),
          },
        };
      })
    );
  }
}
