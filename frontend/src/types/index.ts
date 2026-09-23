export interface User {
  id: string;
  email: string;
  profile: Profile | null;
}

export interface Interest {
  id: string;
  name: string;
  category: string;
  icon?: string;
}

export type PlaceKind = 'state' | 'district' | 'subdistrict' | 'city' | 'town' | 'village';
export type LocationPrecision = 'locality' | 'city' | 'state';

/** A place from the location directory. The API never includes coordinates. */
export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  districtName: string | null;
  stateName: string | null;
  displayName: string;
}

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  kind: 'university' | 'college' | 'standalone';
  city: string;
  districtName: string | null;
  stateName: string | null;
  aisheCode: string | null;
}

/** The signed-in member's own area settings. */
export interface OwnLocation {
  placeId: string | null;
  placeName: string;
  placeKind: PlaceKind | null;
  pincode: string | null;
  source: 'place' | 'pincode' | 'device';
  precision: LocationPrecision;
  /** Exactly what other members see. */
  label: string;
}

export interface OwnEducation {
  institutionId: string;
  institutionName: string;
  institutionShortName: string;
  course: string;
  startYear: number | null;
  endYear: number | null;
}

export interface PublicEducation {
  institutionName: string;
  institutionShortName: string;
  course: string;
}

export interface Profile {
  id: string;
  displayName: string;
  dateOfBirth?: string;
  age: number;
  bio: string;
  /** The area label others see (derived from `location` when set). */
  approximateLocation: string;
  avatarUrl: string;
  interactionPreferences: string[];
  interests: Interest[];
  isVerified?: boolean;
  location?: OwnLocation | null;
  education?: OwnEducation | null;
}

export interface DiscoveryCandidate {
  id: string;
  displayName: string;
  age: number;
  bio: string;
  approximateLocation: string;
  avatarUrl: string;
  interactionPreferences: string[];
  interests: Interest[];
  commonInterestsCount: number;
  commonInterests: string[];
  isVerified: boolean;
  education: PublicEducation | null;
  /** Bucketed upper bound in km (never exact); null when either side has no area. */
  distanceKm: number | null;
}

export interface Match {
  matchId: string;
  conversationId: string;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessage: Message | null;
  user: {
    id: string;
    displayName: string;
    age: number;
    bio: string;
    approximateLocation: string;
    avatarUrl: string;
    isVerified: boolean;
    interests: string[];
  };
}

export interface Conversation {
  id: string;
  matchId: string;
  lastMessageAt: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  otherUser: {
    id: string;
    displayName: string;
    age: number;
    avatarUrl: string;
    approximateLocation: string;
    isVerified: boolean;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  blockedId: string;
  reason?: string;
  createdAt: string;
  displayName: string;
  age: number;
  avatarUrl?: string;
}
