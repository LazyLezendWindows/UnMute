import { Capacitor } from '@capacitor/core';

/**
 * Session handling for the Capacitor apps. The web app authenticates with an HttpOnly cookie and
 * never sees a token; the native apps cannot rely on that cookie (iOS WebViews block it as
 * cross-site), so the backend hands them the session token instead (see NATIVE_APP_ORIGINS).
 * It is kept in the iOS Keychain / Android Keystore and sent as `Authorization: Bearer`.
 * Everything here is a no-op on the web.
 */
export const isNativeApp = Capacitor.isNativePlatform();

const STORAGE_KEY = 'unmute.session';
let token: string | null = null;
let restored: Promise<void> | null = null;

// Loaded on demand so the web bundle never pulls in the native plugin.
async function secureStorage() {
  return (await import('capacitor-secure-storage-plugin')).SecureStoragePlugin;
}

/** Restores the saved token once per app start, before the first authenticated request. */
export function restoreNativeSession(): Promise<void> {
  if (!isNativeApp) return Promise.resolve();
  if (!restored) {
    restored = secureStorage()
      .then((storage) => storage.get({ key: STORAGE_KEY }))
      .then(({ value }) => {
        token = value || null;
      })
      .catch(() => {
        token = null; // nothing saved yet
      });
  }
  return restored;
}

export function nativeSessionToken(): string | null {
  return token;
}

export async function saveNativeSession(next: string | undefined): Promise<void> {
  if (!isNativeApp || !next) return;
  token = next;
  restored = Promise.resolve();
  await (await secureStorage()).set({ key: STORAGE_KEY, value: next });
}

export async function clearNativeSession(): Promise<void> {
  if (!isNativeApp) return;
  token = null;
  restored = Promise.resolve();
  try {
    await (await secureStorage()).remove({ key: STORAGE_KEY });
  } catch {
    // Already absent.
  }
}
