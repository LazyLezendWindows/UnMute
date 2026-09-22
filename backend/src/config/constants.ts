export const REPORT_CATEGORIES = [
  'Harassment',
  'Spam',
  'Fake profile',
  'Impersonation',
  'Sexual content',
  'Threats',
  'Scam/fraud',
  'Hate/abuse',
  'Illegal activity',
  'Other',
] as const;

export type ReportCategory = typeof REPORT_CATEGORIES[number];

export const INTERACTION_PREFERENCES = [
  'Deep conversations',
  'Casual chats',
  'Shared hobbies',
  'Creative collaboration',
  'Book/Movie discussions',
  'Coding & Tech talk',
  'Philosophy & Ideas',
  'Language exchange',
] as const;

export type InteractionPreference = typeof INTERACTION_PREFERENCES[number];

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
} as const;
