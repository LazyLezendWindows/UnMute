import { calculateAge } from '../utils/age';

export interface ProfileRow {
  user_id: string;
  id: string;
  display_name: string;
  date_of_birth: string;
  bio: string | null;
  approximate_location: string | null;
  avatar_url: string | null;
  interaction_preferences: string | null;
  is_verified: number;
}

export interface Interest {
  id: string;
  name: string;
  category: string;
  icon: string;
}

export function parsePreferences(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** The signed-in user's own profile, including private fields such as date of birth. */
export function toOwnProfile(row: ProfileRow, interests: Interest[]) {
  return {
    id: row.id,
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    age: calculateAge(row.date_of_birth),
    bio: row.bio || '',
    approximateLocation: row.approximate_location || '',
    avatarUrl: row.avatar_url || '',
    interactionPreferences: parsePreferences(row.interaction_preferences),
    interests,
    isVerified: Boolean(row.is_verified),
  };
}

/** What other members may see about a user: never email, date of birth or exact location. */
export function toPublicProfile(userId: string, row: ProfileRow | undefined | null) {
  return {
    id: userId,
    displayName: row?.display_name || 'Connection',
    age: row ? calculateAge(row.date_of_birth) : 18,
    bio: row?.bio || '',
    approximateLocation: row?.approximate_location || '',
    avatarUrl: row?.avatar_url || '',
    isVerified: Boolean(row?.is_verified),
  };
}
