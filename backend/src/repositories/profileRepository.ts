import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { ProfileRow } from '../mappers/profileMapper';
import { placeholders, blockedBetween } from './sql';

const PROFILE_COLUMNS = `p.user_id, p.id, p.display_name, p.date_of_birth, p.bio, p.approximate_location,
  p.avatar_url, p.interaction_preferences, p.is_verified`;

/** Updatable profile columns, keyed by column name. */
export interface ProfileChanges {
  display_name?: string;
  bio?: string;
  approximate_location?: string;
  avatar_url?: string;
  interaction_preferences?: string;
}

export class ProfileRepository {
  static findByUserId(userId: string): Promise<ProfileRow | null> {
    return getDatabase().get(`SELECT ${PROFILE_COLUMNS} FROM profiles p WHERE p.user_id = ?`, [userId]);
  }

  static async findByUserIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
    if (userIds.length === 0) return new Map();
    const rows = await getDatabase().query<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM profiles p WHERE p.user_id IN (${placeholders(userIds.length)})`,
      userIds
    );
    return new Map(rows.map((r) => [r.user_id, r]));
  }

  static async insert(
    tx: IDatabase,
    profile: { userId: string; displayName: string; dateOfBirth: string; avatarUrl?: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    await tx.run(
      `INSERT INTO profiles (
         id, user_id, display_name, date_of_birth, bio, approximate_location,
         avatar_url, interaction_preferences, is_verified, created_at, updated_at
       ) VALUES (?, ?, ?, ?, '', '', ?, '[]', 0, ?, ?)`,
      [crypto.randomUUID(), profile.userId, profile.displayName, profile.dateOfBirth, profile.avatarUrl || '', now, now]
    );
  }

  static async update(tx: IDatabase, userId: string, changes: ProfileChanges): Promise<void> {
    // Column names come from the typed ProfileChanges keys, never from request input.
    const entries = Object.entries(changes).filter(([, value]) => value !== undefined);
    const assignments = ['updated_at = ?', ...entries.map(([column]) => `${column} = ?`)];
    await tx.run(`UPDATE profiles SET ${assignments.join(', ')} WHERE user_id = ?`, [
      new Date().toISOString(),
      ...entries.map(([, value]) => value),
      userId,
    ]);
  }

  /**
   * Discovery candidates for `userId`: active, not yet liked/passed, no block either way.
   * Ranked by shared interests across the whole pool (not just within a page), then recency.
   */
  static findDiscoverable(userId: string, limit: number, offset: number): Promise<(ProfileRow & { common_count: number })[]> {
    return getDatabase().query(
      `SELECT ${PROFILE_COLUMNS}, COALESCE(shared.common_count, 0) AS common_count
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       LEFT JOIN (
         SELECT theirs.user_id, COUNT(*) AS common_count
         FROM user_interests theirs
         JOIN user_interests mine ON mine.interest_id = theirs.interest_id AND mine.user_id = $1
         GROUP BY theirs.user_id
       ) shared ON shared.user_id = u.id
       WHERE u.id <> $1
         AND u.is_active = 1
         AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.liker_id = $1 AND l.likee_id = u.id)
         AND NOT EXISTS (SELECT 1 FROM passes ps WHERE ps.passer_id = $1 AND ps.passee_id = u.id)
         AND NOT ${blockedBetween('$1', 'u.id')}
       ORDER BY common_count DESC, p.updated_at DESC, u.id
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }
}
