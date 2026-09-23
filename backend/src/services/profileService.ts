import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateAge } from '../utils/age';
import { UpdateProfileInput } from '../validators/profileValidator';

export class ProfileService {
  static async getProfile(userId: string) {
    const db = getDatabase();

    const profile = await db.get(
      `SELECT id, display_name, date_of_birth, bio, approximate_location,
              avatar_url, interaction_preferences, is_verified, created_at, updated_at
       FROM profiles WHERE user_id = $1`,
      [userId]
    );

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    const interests = await db.query(
      `SELECT i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = $1`,
      [userId]
    );

    let interactionPrefs = [];
    try {
      interactionPrefs = JSON.parse(profile.interaction_preferences || '[]');
    } catch {
      interactionPrefs = [];
    }

    return {
      id: profile.id,
      displayName: profile.display_name,
      dateOfBirth: profile.date_of_birth,
      age: calculateAge(profile.date_of_birth),
      bio: profile.bio || '',
      approximateLocation: profile.approximate_location || '',
      avatarUrl: profile.avatar_url || '',
      interactionPreferences: interactionPrefs,
      interests,
      isVerified: Boolean(profile.is_verified),
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = await db.get('SELECT id FROM profiles WHERE user_id = ?', [userId]);
    if (!existing) {
      throw new AppError('Profile not found', 404);
    }

    const interestIds = input.interestIds !== undefined ? [...new Set(input.interestIds)] : undefined;
    if (interestIds && interestIds.length > 0) {
      const found = await db.query<{ id: string }>(
        `SELECT id FROM interests WHERE id IN (${interestIds.map(() => '?').join(', ')})`,
        interestIds
      );
      if (found.length !== interestIds.length) {
        throw new AppError('One or more selected interests are no longer available', 400);
      }
    }

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];
    const columns: [keyof UpdateProfileInput, string][] = [
      ['displayName', 'display_name'],
      ['bio', 'bio'],
      ['approximateLocation', 'approximate_location'],
      ['avatarUrl', 'avatar_url'],
    ];
    for (const [field, column] of columns) {
      if (input[field] !== undefined) {
        updates.push(`${column} = ?`);
        params.push(input[field]);
      }
    }
    if (input.interactionPreferences !== undefined) {
      updates.push('interaction_preferences = ?');
      params.push(JSON.stringify(input.interactionPreferences));
    }
    params.push(userId);

    // Profile fields and the interest set change together or not at all.
    await db.transaction(async (tx) => {
      await tx.run(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`, params);

      if (interestIds !== undefined) {
        await tx.run('DELETE FROM user_interests WHERE user_id = ?', [userId]);
        for (const interestId of interestIds) {
          await tx.run('INSERT INTO user_interests (user_id, interest_id) VALUES (?, ?)', [userId, interestId]);
        }
      }
    });

    return this.getProfile(userId);
  }

  static async getAllInterests() {
    const db = getDatabase();
    return db.query('SELECT id, name, category, icon FROM interests ORDER BY category, name ASC');
  }
}
