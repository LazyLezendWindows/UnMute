import { formatDistance } from '../../services/directory';

/** Display helpers for chat requests. */

/** "Pune · within 5 km", as on Discover cards; never anything more precise. */
export function approximatePlace(user: { distanceKm: number | null; approximateLocation: string }): string {
  return [user.approximateLocation, formatDistance(user.distanceKm)].filter(Boolean).join(' · ');
}

/** "just now", "5m", "3h", "2d", then a short date. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
