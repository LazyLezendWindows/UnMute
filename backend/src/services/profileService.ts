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

    const existing = await db.get('SELECT id FROM profiles WHERE user_id = $1', [userId]);
    if (!existing) {
      throw new AppError('Profile not found', 404);
    }

    const updates: string[] = ['updated_at = $1'];
    const params: any[] = [now];
    let pIdx = 2;

    if (input.displayName !== undefined) {
      updates.push(`display_name = $${pIdx++}`);
      params.push(input.displayName);
    }
    if (input.bio !== undefined) {
      updates.push(`bio = $${pIdx++}`);
      params.push(input.bio);
    }
    if (input.approximateLocation !== undefined) {
      updates.push(`approximate_location = $${pIdx++}`);
      params.push(input.approximateLocation);
    }
    if (input.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${pIdx++}`);
      params.push(input.avatarUrl);
    }
    if (input.interactionPreferences !== undefined) {
      updates.push(`interaction_preferences = $${pIdx++}`);
      params.push(JSON.stringify(input.interactionPreferences));
    }

    params.push(userId);
    const sql = `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = $${pIdx}`;
    await db.run(sql, params);

    // Sync interests if provided
    if (input.interestIds !== undefined) {
      await db.run('DELETE FROM user_interests WHERE user_id = $1', [userId]);
      for (const interestId of input.interestIds) {
        await db.run(
          'INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2)',
          [userId, interestId]
        );
      }
    }

    return this.getProfile(userId);
  }

  static async getAllInterests() {
    const db = getDatabase();
    return db.query('SELECT id, name, category, icon FROM interests ORDER BY category, name ASC');
  }
}
