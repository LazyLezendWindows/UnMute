import { describe, it, expect, vi, beforeEach } from 'vitest';

/** An in-memory stand-in for the Keychain/Keystore plugin. */
const vault = new Map<string, string>();
const SecureStoragePlugin = {
  get: vi.fn(async ({ key }: { key: string }) => {
    if (!vault.has(key)) throw new Error('Item with given key does not exist');
    return { value: vault.get(key)! };
  }),
  set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
    vault.set(key, value);
    return { value: true };
  }),
  remove: vi.fn(async ({ key }: { key: string }) => ({ value: vault.delete(key) })),
};
vi.mock('capacitor-secure-storage-plugin', () => ({ SecureStoragePlugin }));

async function loadModules(native: boolean) {
  vi.resetModules();
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  const session = await import('../../src/platform/nativeSession');
  const { api } = await import('../../src/services/api');
  // Capture outgoing requests instead of sending them.
  const sent: Record<string, unknown>[] = [];
  api.defaults.adapter = async (config) => {
    sent.push({ url: config.url, authorization: config.headers.get('Authorization') });
    return { data: { data: {} }, status: 200, statusText: 'OK', headers: {}, config };
  };
  return { session, api, sent };
}

describe('native session token', () => {
  beforeEach(() => {
    vault.clear();
    vi.clearAllMocks();
  });

  it('keeps the token in secure storage, sends it as a bearer credential, and forgets it on sign-out', async () => {
    const { session, api, sent } = await loadModules(true);
    await session.saveNativeSession('token-abcdefghijklmnopqrstuvwxyz0123456789_-');
    expect(vault.get('unmute.session')).toBe('token-abcdefghijklmnopqrstuvwxyz0123456789_-');

    await api.get('/auth/me');
    expect(sent.at(-1)?.authorization).toBe('Bearer token-abcdefghijklmnopqrstuvwxyz0123456789_-');

    await session.clearNativeSession();
    expect(vault.has('unmute.session')).toBe(false);
    await api.get('/auth/me');
    expect(sent.at(-1)?.authorization).toBeUndefined();
  });

  it('restores the saved token on the next app start', async () => {
    vault.set('unmute.session', 'restored-token-0123456789abcdefghijklmnopq');
    const { session, api, sent } = await loadModules(true);
    expect(session.nativeSessionToken()).toBeNull();
    await session.restoreNativeSession();
    await api.get('/auth/session');
    expect(sent.at(-1)?.authorization).toBe('Bearer restored-token-0123456789abcdefghijklmnopq');
  });

  it('does nothing on the web: no token is stored or sent', async () => {
    const { session, api, sent } = await loadModules(false);
    await session.saveNativeSession('should-never-be-stored-0123456789abcdefghij');
    await session.restoreNativeSession();
    expect(SecureStoragePlugin.set).not.toHaveBeenCalled();
    expect(SecureStoragePlugin.get).not.toHaveBeenCalled();
    await api.get('/auth/me');
    expect(sent.at(-1)?.authorization).toBeUndefined();
  });
});
