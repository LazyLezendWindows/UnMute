import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const get = vi.fn(async (_url: string, _config?: any) => ({ data: { data: [] } }));
vi.mock('../../src/services/api', () => ({ api: { get, post: vi.fn() }, onUnauthorized: vi.fn(), ApiError: Error }));
vi.mock('../../src/services/socket', () => ({ connectSocket: vi.fn(), disconnectSocket: vi.fn() }));
vi.mock('../../src/composables/useGoogleIdentity', () => ({ useGoogleIdentity: () => ({ disableAutoSelect: vi.fn() }) }));

const { useDiscoverStore, emptyFilters } = await import('../../src/stores/discover');
const { useAuthStore } = await import('../../src/stores/auth');

function signIn(profile: Record<string, unknown> = {}) {
  const auth = useAuthStore();
  auth.user = { id: 'viewer-1', email: 'v@example.com', profile: { location: null, education: null, ...profile } as any };
}

describe('discover store filters', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    get.mockClear();
  });

  it('sends only filters the viewer can use', async () => {
    signIn();
    const store = useDiscoverStore();
    await store.setFilters({ ...emptyFilters(), radiusKm: 25, sameInstitution: true, minAge: 21 });
    // No area and no college: distance and "my college" are dropped instead of failing server-side.
    expect(get.mock.calls.at(-1)?.[1]).toEqual({ params: { minAge: 21 } });

    signIn({ location: { source: 'place' }, education: { institutionId: 'i' } });
    await store.loadFeed();
    expect(get.mock.calls.at(-1)?.[1]).toEqual({ params: { radiusKm: 25, sameInstitution: true, minAge: 21 } });
    expect(store.activeFilterCount).toBe(3);
  });

  it('remembers filters per viewer and survives unavailable storage', async () => {
    signIn();
    await useDiscoverStore().setFilters({ ...emptyFilters(), maxAge: 30 });

    setActivePinia(createPinia());
    signIn();
    const again = useDiscoverStore();
    await again.loadFeed();
    expect(again.filters.maxAge).toBe(30);

    setActivePinia(createPinia());
    signIn();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const blocked = useDiscoverStore();
    await expect(blocked.loadFeed()).resolves.toBeUndefined();
    expect(blocked.filters).toEqual(emptyFilters());
    vi.restoreAllMocks();
  });

  it('sends interest filters to the server and counts them as one active filter', async () => {
    signIn();
    const store = useDiscoverStore();
    await store.setFilters({ ...emptyFilters(), interestIds: ['i-1', 'i-2'] });
    expect(get.mock.calls.at(-1)?.[1]).toEqual({ params: { interestIds: 'i-1,i-2' } });
    expect(store.activeFilterCount).toBe(1);
  });

  it('upgrades filters saved before interests existed', async () => {
    localStorage.setItem('unmute.discoverFilters.v1:viewer-1', JSON.stringify({ radiusKm: null, place: null, sameInstitution: false, institution: null, minAge: 21, maxAge: null }));
    signIn();
    const store = useDiscoverStore();
    await store.loadFeed();
    expect(store.filters.interestIds).toEqual([]);
    expect(get.mock.calls.at(-1)?.[1]).toEqual({ params: { minAge: 21 } });
  });
});
