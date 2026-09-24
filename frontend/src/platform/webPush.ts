import { api } from '../services/api';
import { isNativeApp } from './nativeSession';

/**
 * Web Push for the PWA: notifications about new messages and matches while the app is closed.
 * The browser's push service delivers them to the service worker (public/push-sw.js). Each
 * signed-in session registers its own subscription, so signing out stops that device's pushes.
 */

// Which member this browser's subscription was created for: a different member signing in on
// the same browser must opt in themselves rather than inherit it.
const OWNER_KEY = 'unmute.push.owner';

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

export function isPushSupported(): boolean {
  return (
    !isNativeApp &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** iOS only offers Web Push to apps added to the Home Screen. */
export function needsHomeScreenInstall(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return ios && !isPushSupported() && !window.matchMedia('(display-mode: standalone)').matches;
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Storage blocked: the subscription still works, it just is not re-linked automatically.
  }
}

/** Converts the VAPID public key (base64url) to the bytes PushManager expects. */
export function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function publicKey(): Promise<string | null> {
  const res = await api.get('/push/config');
  return res.data.data.enabled ? res.data.data.publicKey : null;
}

/** The app's service worker; absent in development (it is only built for production). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  return (await (await registration())?.pushManager.getSubscription()) ?? null;
}

export async function pushState(userId: string): Promise<PushState> {
  if (!isPushSupported() || !(await registration())) return 'unsupported';
  if (!(await publicKey())) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const subscription = Notification.permission === 'granted' ? await currentSubscription() : null;
  return subscription && readOwner() === userId ? 'on' : 'off';
}

/** Asks for permission (must run from a click) and registers this device. */
export async function enablePush(userId: string): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  const key = await publicKey();
  if (!key) return 'unavailable';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const worker = await registration();
  if (!worker) return 'unsupported';
  let subscription = await worker.pushManager.getSubscription();
  // A subscription made with another key (e.g. after rotating VAPID keys) cannot be reused.
  const existingKey = subscription?.options.applicationServerKey;
  if (subscription && existingKey && !sameKey(existingKey, urlBase64ToUint8Array(key))) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  await api.put('/push/subscription', subscription.toJSON());
  writeOwner(userId);
  return 'on';
}

function sameKey(a: ArrayBuffer, b: Uint8Array): boolean {
  const left = new Uint8Array(a);
  return left.length === b.length && left.every((byte, i) => byte === b[i]);
}

/** Stops notifications to this device (server first, so a failure there leaves nothing half-off). */
export async function disablePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  await api.delete('/push/subscription');
  const subscription = await currentSubscription();
  await subscription?.unsubscribe();
  writeOwner(null);
  return 'off';
}

/**
 * After sign-in: a new session has no subscription on the server yet, so re-link this browser's
 * existing one, but only for the member who turned notifications on here.
 */
export async function resyncPush(userId: string): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted' || readOwner() !== userId) return;
  try {
    const subscription = await currentSubscription();
    if (subscription) await api.put('/push/subscription', subscription.toJSON());
  } catch {
    // Push disabled on the server, or offline: notifications simply stay off for now.
  }
}

/** On sign-out: this browser stops receiving pushes (the server already dropped the session's). */
export async function forgetPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const subscription = await currentSubscription();
    await subscription?.unsubscribe();
  } catch {
    // Nothing to remove.
  }
  writeOwner(null);
}
