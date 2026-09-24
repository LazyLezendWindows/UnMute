import { config } from '../config/env';

export const CLOUDINARY_HOST = 'res.cloudinary.com';

/** The Cloudinary folder holding a member's uploaded photos. */
export function photoFolder(userId: string): string {
  return `unmute/avatars/${userId}`;
}

/**
 * The Cloudinary public ID of a photo in this app's own Cloudinary account, or null for any
 * other URL. Uploaded photo URLs look like
 * https://res.cloudinary.com/<cloud>/image/upload/<transformations>/v<version>/<public id>.
 */
export function uploadedPhotoId(url: string | null | undefined): string | null {
  const { cloudName } = config.cloudinary;
  if (!url || !cloudName) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== CLOUDINARY_HOST) return null;
  const match = new RegExp(`^/${cloudName}/image/upload/(?:[^/]+/)*v\\d+/(unmute/avatars/[A-Za-z0-9-]+/[A-Za-z0-9_-]+)$`).exec(
    parsed.pathname
  );
  return match ? match[1] : null;
}

/**
 * Profile photos are only loaded from configured hosts (see AVATAR_URL_HOSTS), plus photos
 * uploaded to this app's own Cloudinary account. Every viewer's browser fetches the photo, so an
 * arbitrary URL would reveal viewers' IP addresses to its owner.
 */
export function isAllowedAvatarUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
  if (uploadedPhotoId(url)) return true;
  const host = parsed.hostname.toLowerCase();
  return config.avatarHosts.some((allowed) =>
    allowed.startsWith('.') ? host.endsWith(allowed) && host.length > allowed.length : host === allowed
  );
}

/** Stored URLs that predate the allowlist (or a narrowed one) are never served. */
export function safeAvatarUrl(url: string | null | undefined): string {
  return url && isAllowedAvatarUrl(url) ? url : '';
}
