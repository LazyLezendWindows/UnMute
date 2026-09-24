import type { Presence } from '../types';
import { relativeTime } from '../components/chat/requestFormat';

/** "Online", "Active 5m ago", or '' when unknown or hidden. */
export function presenceLabel(presence: Presence | undefined, now: Date = new Date()): string {
  if (!presence) return '';
  if (presence.online) return 'Online';
  if (!presence.lastSeenAt) return '';
  const when = relativeTime(presence.lastSeenAt, now);
  return when === 'just now' ? 'Active just now' : /^\d/.test(when) ? `Active ${when} ago` : `Active ${when}`;
}
