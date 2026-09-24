import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// A 65-byte uncompressed P-256 key, as `web-push generate-vapid-keys` prints it (base64url).
const VAPID_KEY = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM';

/** Browser push APIs as jsdom lacks them: one service worker registration with a PushManager. */
function installBrowser(permission: NotificationPermission, grantOnRequest: NotificationPermission = 'granted') {
  let subscription: any = null;
  const pushManager = {
    getSubscription: vi.fn(async () => subscription),
    subscribe: vi.fn(async (options: { applicationServerKey: Uint8Array }) => {
      subscription = {
        options: { applicationServerKey: options.applicationServerKey.buffer },
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/device-1', keys: { p256dh: 'p', auth: 'a' } }),
        unsubscribe: vi.fn(async () => {
          subscription = null;
          return true;
        }),
      };
      return subscription;
    }),
  };
  const registration = { pushManager, showNotification: vi.fn(async () => undefined) };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => registration) },
  });
  (window as any).PushManager = function PushManager() {};
  const notification = {
    permission,
    requestPermission: vi.fn(async () => {
      notification.permission = grantOnRequest;
      return grantOnRequest;
    }),
  };
  (window as any).Notification = notification;
  (globalThis as any).Notification = notification;
  return { pushManager, registration, notification, current: () => subscription };
}

async function loadModule(enabled = true) {
  vi.resetModules();
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
  const push = await import('../../src/platform/webPush');
  const { api } = await import('../../src/services/api');
  const sent: { method?: string; url?: string; data?: unknown }[] = [];
  api.defaults.adapter = async (config) => {
    sent.push({ method: config.method, url: config.url, data: config.data && JSON.parse(config.data) });
    const data = config.url === '/push/config' ? { enabled, publicKey: enabled ? VAPID_KEY : null } : { subscribed: true };
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
  };
  return { push, sent };
}

describe('web push', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as any).PushManager;
    delete (window as any).Notification;
    delete (globalThis as any).Notification;
  });

  it('decodes the VAPID key to the 65 raw bytes PushManager expects', async () => {
    const { push } = await loadModule();
    const bytes = push.urlBase64ToUint8Array(VAPID_KEY);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04); // uncompressed point marker
  });

  it('is unsupported where the browser has no push APIs', async () => {
    const { push } = await loadModule();
    expect(push.isPushSupported()).toBe(false);
    expect(await push.pushState('user-1')).toBe('unsupported');
  });

  it('asks permission, subscribes with the server key, and registers the device', async () => {
    const browser = installBrowser('default');
    const { push, sent } = await loadModule();
    expect(await push.pushState('user-1')).toBe('off');

    expect(await push.enablePush('user-1')).toBe('on');
    expect(browser.notification.requestPermission).toHaveBeenCalled();
    expect(browser.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true, applicationServerKey: push.urlBase64ToUint8Array(VAPID_KEY) })
    );
    expect(sent.at(-1)).toMatchObject({
      method: 'put',
      url: '/push/subscription',
      data: { endpoint: 'https://fcm.googleapis.com/fcm/send/device-1' },
    });
    expect(await push.pushState('user-1')).toBe('on');
  });

  it('reports a refused permission and registers nothing', async () => {
    installBrowser('default', 'denied');
    const { push, sent } = await loadModule();
    expect(await push.enablePush('user-1')).toBe('denied');
    expect(sent.some((r) => r.url === '/push/subscription')).toBe(false);
  });

  it('is unavailable when the server has no VAPID keys', async () => {
    installBrowser('granted');
    const { push } = await loadModule(false);
    expect(await push.pushState('user-1')).toBe('unavailable');
    expect(await push.enablePush('user-1')).toBe('unavailable');
  });

  it('re-links the subscription after sign-in, but only for the member who turned it on', async () => {
    installBrowser('default');
    const { push, sent } = await loadModule();
    await push.enablePush('user-1');
    sent.length = 0;

    await push.resyncPush('user-2');
    expect(sent).toHaveLength(0);
    expect(await push.pushState('user-2')).toBe('off');

    sent.length = 0;
    await push.resyncPush('user-1');
    expect(sent).toEqual([expect.objectContaining({ method: 'put', url: '/push/subscription' })]);
  });

  it('turning off removes the server registration and the browser subscription', async () => {
    const browser = installBrowser('default');
    const { push, sent } = await loadModule();
    await push.enablePush('user-1');

    expect(await push.disablePush()).toBe('off');
    expect(sent.at(-1)).toMatchObject({ method: 'delete', url: '/push/subscription' });
    expect(browser.current()).toBeNull();
    expect(await push.pushState('user-1')).toBe('off');
  });

  it('signing out unsubscribes this browser', async () => {
    const browser = installBrowser('default');
    const { push } = await loadModule();
    await push.enablePush('user-1');
    await push.forgetPush();
    expect(browser.current()).toBeNull();
    expect(await push.pushState('user-1')).toBe('off');
  });

});
