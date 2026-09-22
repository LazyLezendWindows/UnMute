import { getDatabase } from '../config/database';
import { calculateAge } from '../utils/age';

export class DiscoverService {
  static async getFeed(currentUserId: string, limit = 20, offset = 0) {
    const db = getDatabase();

    // Get current user's interest IDs to compute common interests
    const currentUserInterests = await db.query(
      'SELECT interest_id FROM user_interests WHERE user_id = $1',
      [currentUserId]
    );
    const myInterestIds = new Set(currentUserInterests.map((r) => r.interest_id));

    // Exclude users already liked, passed, blocked (in either direction), or self
    const sql = `
      SELECT
        u.id as user_id,
        p.display_name,
        p.date_of_birth,
        p.bio,
        p.approximate_location,
        p.avatar_url,
        p.interaction_preferences,
        p.is_verified
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.id != $1
        AND u.is_active = 1
        AND u.id NOT IN (SELECT likee_id FROM likes WHERE liker_id = $1)
        AND u.id NOT IN (SELECT passee_id FROM passes WHERE passer_id = $1)
        AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1)
        AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = $1)
      ORDER BY p.updated_at DESC
      LIMIT $2 OFFSET $3
    `;

    const candidates = await db.query(sql, [currentUserId, limit, offset]);

    const feed = await Promise.all(
      candidates.map(async (candidate) => {
        const interests = await db.query(
          `SELECT i.id, i.name, i.category, i.icon
           FROM user_interests ui
           JOIN interests i ON ui.interest_id = i.id
           WHERE ui.user_id = $1`,
          [candidate.user_id]
        );

        let interactionPrefs = [];
        try {
          interactionPrefs = JSON.parse(candidate.interaction_preferences || '[]');
        } catch {
          interactionPrefs = [];
        }

        const commonInterests = interests.filter((i) => myInterestIds.has(i.id));

        return {
          id: candidate.user_id,
          displayName: candidate.display_name,
          age: calculateAge(candidate.date_of_birth),
          bio: candidate.bio || '',
          approximateLocation: candidate.approximate_location || '',
          avatarUrl: candidate.avatar_url || '',
          interactionPreferences: interactionPrefs,
          interests,
          commonInterestsCount: commonInterests.length,
          commonInterests: commonInterests.map((ci) => ci.name),
          isVerified: Boolean(candidate.is_verified),
        };
      })
    );

    // Sort candidates: prioritize those with shared interests, conversation first!
    feed.sort((a, b) => b.commonInterestsCount - a.commonInterestsCount);

    return feed;
  }
}
