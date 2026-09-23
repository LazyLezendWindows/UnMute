import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateAge } from '../utils/age';
import { getSocketServer } from '../sockets/chatSocket';

/** Target must be an active user with no block in either direction. */
async function assertInteractable(actorId: string, targetId: string): Promise<void> {
  const db = getDatabase();
  const target = await db.get('SELECT id FROM users WHERE id = ? AND is_active = 1', [targetId]);
  if (!target) {
    throw new AppError('User not found', 404);
  }
  const blocked = await db.get(
    'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [actorId, targetId, targetId, actorId]
  );
  if (blocked) {
    throw new AppError('Action not allowed', 403);
  }
}

/**
 * Creates the match and its conversation atomically, or returns the existing conversation.
 * The upsert waits on a concurrent insert of the same pair and then yields to it, and the
 * locking reads see that committed row, so concurrent calls converge on one match/conversation.
 */
async function ensureMatch(userX: string, userY: string): Promise<string> {
  const [userA, userB] = userX < userY ? [userX, userY] : [userY, userX];
  const now = new Date().toISOString();

  return getDatabase().transaction(async (tx) => {
    await tx.run('INSERT INTO matches (id, user_a_id, user_b_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id', [
      crypto.randomUUID(),
      userA,
      userB,
      now,
    ]);
    const match = await tx.get<{ id: string }>(
      'SELECT id FROM matches WHERE user_a_id = ? AND user_b_id = ? FOR UPDATE',
      [userA, userB]
    );

    await tx.run(
      `INSERT INTO conversations (id, match_id, user_a_id, user_b_id, last_message_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [crypto.randomUUID(), match!.id, userA, userB, now, now]
    );
    const conversation = await tx.get<{ id: string }>('SELECT id FROM conversations WHERE match_id = ? FOR UPDATE', [
      match!.id,
    ]);
    return conversation!.id;
  });
}

export class MatchingService {
  static async recordLike(likerId: string, likeeId: string) {
    if (likerId === likeeId) {
      throw new AppError('Cannot like yourself', 400);
    }

    const db = getDatabase();
    await assertInteractable(likerId, likeeId);

    // Idempotent: repeating a like is a no-op (unique (liker_id, likee_id)).
    await db.run('INSERT INTO likes (id, liker_id, likee_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id', [
      crypto.randomUUID(),
      likerId,
      likeeId,
      new Date().toISOString(),
    ]);

    // Each side's like is committed before it checks for the other's, so of two simultaneous
    // likes at least one sees the reciprocal; ensureMatch makes both succeed without duplicates.
    const reciprocalLike = await db.get('SELECT id FROM likes WHERE liker_id = ? AND likee_id = ?', [likeeId, likerId]);
    if (!reciprocalLike) {
      return { matched: false };
    }

    const conversationId = await ensureMatch(likerId, likeeId);

    const matchedProfile = await db.get(
      `SELECT p.display_name, p.date_of_birth, p.bio, p.approximate_location, p.avatar_url
       FROM profiles p WHERE p.user_id = ?`,
      [likeeId]
    );

    const io = getSocketServer();
    if (io) {
      const likerProfile = await db.get(
        'SELECT p.display_name, p.date_of_birth, p.avatar_url FROM profiles p WHERE p.user_id = ?',
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

    return {
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
  }

  static async recordPass(passerId: string, passeeId: string) {
    if (passerId === passeeId) {
      throw new AppError('Cannot pass on yourself', 400);
    }
    await assertInteractable(passerId, passeeId);

    await getDatabase().run('INSERT INTO passes (id, passer_id, passee_id, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id', [
      crypto.randomUUID(),
      passerId,
      passeeId,
      new Date().toISOString(),
    ]);

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
