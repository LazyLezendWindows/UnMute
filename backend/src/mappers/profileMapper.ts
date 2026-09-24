import { calculateAge } from '../utils/age';
import { safeAvatarUrl } from '../utils/avatar';
import { LabelPrecision, PlaceKind, locationLabel } from './locationMapper';

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
  profession: string | null;
  show_online: number;
  // user_locations + places (all NULL when the member has not set an area)
  loc_place_id: string | null;
  loc_pincode: string | null;
  loc_source: 'place' | 'pincode' | 'device' | null;
  loc_precision: LabelPrecision | null;
  loc_kind: PlaceKind | null;
  loc_name: string | null;
  loc_district: string | null;
  loc_state: string | null;
  // user_education + institutions (all NULL when the member has not added one)
  edu_institution_id: string | null;
  edu_name: string | null;
  edu_short_name: string | null;
  edu_course: string | null;
  edu_start_year: number | null;
  edu_end_year: number | null;
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

/**
 * The area other members see: derived from the structured location at the member's chosen
 * precision, else the legacy free-text location from before structured locations existed.
 */
function publicArea(row: ProfileRow): string {
  if (row.loc_kind && row.loc_name) {
    return locationLabel(
      { kind: row.loc_kind, name: row.loc_name, districtName: row.loc_district, stateName: row.loc_state },
      row.loc_precision || 'city'
    );
  }
  return row.approximate_location || '';
}

function publicEducation(row: ProfileRow | undefined | null) {
  if (!row?.edu_institution_id || !row.edu_name) return null;
  return { institutionName: row.edu_name, institutionShortName: row.edu_short_name || '', course: row.edu_course || '' };
}

/** The member's own location settings. Coordinates are never included, not even for the owner. */
function ownLocation(row: ProfileRow) {
  if (!row.loc_source) return null;
  return {
    placeId: row.loc_place_id,
    placeName: row.loc_name || '',
    placeKind: row.loc_kind,
    pincode: row.loc_pincode,
    source: row.loc_source,
    precision: row.loc_precision || 'city',
    label: publicArea(row),
  };
}

function ownEducation(row: ProfileRow) {
  if (!row.edu_institution_id) return null;
  return {
    institutionId: row.edu_institution_id,
    institutionName: row.edu_name || '',
    institutionShortName: row.edu_short_name || '',
    course: row.edu_course || '',
    startYear: row.edu_start_year,
    endYear: row.edu_end_year,
  };
}

/** The signed-in user's own profile, including private fields such as date of birth. */
export function toOwnProfile(row: ProfileRow, interests: Interest[]) {
  return {
    id: row.id,
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    age: calculateAge(row.date_of_birth),
    bio: row.bio || '',
    approximateLocation: publicArea(row),
    location: ownLocation(row),
    education: ownEducation(row),
    avatarUrl: safeAvatarUrl(row.avatar_url),
    interactionPreferences: parsePreferences(row.interaction_preferences),
    interests,
    isVerified: Boolean(row.is_verified),
    profession: row.profession || '',
    showOnline: row.show_online !== 0,
  };
}

/** What other members may see about a user: never email, date of birth, PIN code or coordinates. */
export function toPublicProfile(userId: string, row: ProfileRow | undefined | null) {
  return {
    id: userId,
    displayName: row?.display_name || 'Connection',
    age: row ? calculateAge(row.date_of_birth) : 18,
    bio: row?.bio || '',
    approximateLocation: row ? publicArea(row) : '',
    avatarUrl: safeAvatarUrl(row?.avatar_url),
    isVerified: Boolean(row?.is_verified),
    profession: row?.profession || '',
    education: publicEducation(row),
  };
}

/** A member's photos as others see them: the main photo first, then their other uploads. */
export function publicPhotos(avatarUrl: string | null | undefined, uploads: string[] = []): string[] {
  const main = safeAvatarUrl(avatarUrl);
  return [...new Set([main, ...uploads.map((u) => safeAvatarUrl(u))].filter(Boolean))];
}
