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

export interface Profile {
  id: string;
  displayName: string;
  dateOfBirth?: string;
  age: number;
  bio: string;
  approximateLocation: string;
  avatarUrl: string;
  interactionPreferences: string[];
  interests: Interest[];
  isVerified?: boolean;
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
