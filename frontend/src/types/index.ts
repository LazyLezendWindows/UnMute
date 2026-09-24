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
  profession?: string;
  /** Whether others may see when you are online. */
  showOnline?: boolean;
  photos?: OwnPhoto[];
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
  /** Main photo first; empty when the member has none. */
  photos?: string[];
  profession?: string;
}

/** Whether someone is online; null when they hide it. */
export type Presence = { online: boolean; lastSeenAt: string | null } | null;

export interface OwnPhoto {
  id: string;
  url: string;
  isMain: boolean;
}

/** Someone who liked you and is waiting for your answer. */
export interface IncomingLike {
  likedAt: string;
  user: {
    id: string;
    displayName: string;
    age: number;
    avatarUrl: string;
    approximateLocation: string;
    isVerified: boolean;
    profession: string;
    photos: string[];
    presence: Presence;
    distanceKm: number | null;
  };
}

export interface Match {
  matchId: string;
  conversationId: string;
  createdAt: string;
  /** Matched in the last week and nobody has written yet. */
  isNew?: boolean;
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
    profession?: string;
    presence?: Presence;
    distanceKm?: number | null;
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
    presence?: Presence;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  /** A photo sent in the chat (the text may then be empty). */
  attachmentUrl?: string | null;
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

/** A chat request as listed in the Requests tab (incoming) or the Sent section. */
export interface ChatRequestSummary {
  /** The conversation id; it becomes the chat's id once accepted. */
  id: string;
  direction: 'incoming' | 'sent';
  /** Always 'pending' to the sender, even when quietly declined. */
  status: 'pending';
  requestedAt: string;
  preview: string;
  otherUser: {
    id: string;
    displayName: string;
    age: number;
    avatarUrl: string;
    approximateLocation: string;
    isVerified: boolean;
    distanceKm: number | null;
  };
}

/** One request opened for review: the full introduction and the other member's public profile. */
export interface ChatRequestDetail {
  id: string;
  direction: 'incoming' | 'sent';
  status: 'pending';
  requestedAt: string;
  message: { content: string; createdAt: string; fromMe: boolean } | null;
  otherUser: DiscoveryCandidate;
}

export type ChatRequestOutcome =
  | { status: 'pending'; conversationId: string }
  | { status: 'accepted'; conversationId: string; delivered: boolean };
