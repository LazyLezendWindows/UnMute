import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';
import { useToastStore } from './toast';
import { useAuthStore } from './auth';
import { DiscoveryCandidate, Institution, Place } from '../types';

/** Discovery filters as the viewer chose them; applied by the backend, never client-side. */
export interface DiscoverFilters {
  radiusKm: number | null;
  /** Kept whole (not just the id) so the active-filter chips can name it without another request. */
  place: Place | null;
  sameInstitution: boolean;
  institution: Institution | null;
  minAge: number | null;
  maxAge: number | null;
  /** People who share at least one of these interests. */
  interestIds: string[];
}

export const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100, 200] as const;

/** Feed tabs: best matches, nearest first, or only people who share an interest with you. */
export type DiscoverTab = 'forYou' | 'nearby' | 'interests';

export function emptyFilters(): DiscoverFilters {
  return { radiusKm: null, place: null, sameInstitution: false, institution: null, minAge: null, maxAge: null, interestIds: [] };
}

const STORAGE_PREFIX = 'unmute.discoverFilters.v1:';

// Per-viewer convenience only: storage can be unavailable (private mode, blocked site data).
function readSavedFilters(userId: string): DiscoverFilters {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    return raw ? { ...emptyFilters(), ...JSON.parse(raw) } : emptyFilters();
  } catch {
    return emptyFilters();
  }
}

function saveFilters(userId: string, filters: DiscoverFilters): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(filters));
  } catch {
    // Not persisting is fine; the filters still apply for this visit.
  }
}

export const useDiscoverStore = defineStore('discover', () => {
  const feed = ref<DiscoveryCandidate[]>([]);
  const currentIndex = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeMatch = ref<{
    conversationId: string;
    matchedUser: {
      id: string;
      displayName: string;
      age: number;
      avatarUrl?: string;
    };
  } | null>(null);

  const currentCandidate = computed<DiscoveryCandidate | null>(() => {
    if (currentIndex.value < feed.value.length) {
      return feed.value[currentIndex.value];
    }
    return null;
  });

  const hasMore = computed(() => currentIndex.value < feed.value.length);

  const filters = ref<DiscoverFilters>(emptyFilters());
  const tab = ref<DiscoverTab>('forYou');
  let filtersOwner: string | null = null;

  /** Loads the signed-in viewer's saved filters once, and again if a different member signs in. */
  function syncFiltersOwner() {
    const userId = useAuthStore().user?.id ?? null;
    if (userId && userId !== filtersOwner) {
      filtersOwner = userId;
      filters.value = readSavedFilters(userId);
    }
  }

  const activeFilterCount = computed(() => {
    const f = filters.value;
    return [
      f.radiusKm !== null,
      f.place,
      f.sameInstitution || f.institution,
      f.minAge !== null || f.maxAge !== null,
      f.interestIds.length > 0,
    ].filter(Boolean).length;
  });

  /**
   * Query parameters for the backend. Filters the viewer can no longer use (distance without an
   * area, "my college" without one) are dropped rather than sent to fail.
   */
  function filterParams(): Record<string, string | number | boolean> {
    const f = filters.value;
    const profile = useAuthStore().profile;
    const params: Record<string, string | number | boolean> = {};
    if (f.radiusKm !== null && profile?.location) params.radiusKm = f.radiusKm;
    if (f.place) params.placeId = f.place.id;
    if (f.sameInstitution && profile?.education) params.sameInstitution = true;
    else if (f.institution) params.institutionId = f.institution.id;
    if (f.minAge !== null) params.minAge = f.minAge;
    if (f.maxAge !== null) params.maxAge = f.maxAge;
    if (f.interestIds.length) params.interestIds = f.interestIds.join(',');
    if (tab.value === 'nearby') params.sort = 'nearby';
    if (tab.value === 'interests') params.sharedInterests = true;
    return params;
  }

  /** Nearby needs the viewer's own area; the page asks them to set one instead of loading. */
  const tabNeedsArea = computed(() => tab.value === 'nearby' && !useAuthStore().profile?.location);

  function setTab(next: DiscoverTab) {
    if (tab.value === next) return;
    tab.value = next;
    if (tabNeedsArea.value) {
      feed.value = [];
      currentIndex.value = 0;
      error.value = null;
      return;
    }
    return loadFeed();
  }

  function setFilters(next: DiscoverFilters) {
    syncFiltersOwner();
    filters.value = next;
    if (filtersOwner) saveFilters(filtersOwner, next);
    return loadFeed();
  }

  function clearFilters() {
    return setFilters(emptyFilters());
  }

  async function loadFeed() {
    syncFiltersOwner();
    if (tabNeedsArea.value) return;
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get('/discover', { params: filterParams() });
      feed.value = res.data.data;
      currentIndex.value = 0;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Advances optimistically; if the server rejects the action the card comes back
   * (when the user hasn't moved on further) so a failed like is never silently lost.
   */
  async function interactWithCurrent(action: 'like' | 'pass') {
    if (!currentCandidate.value) return;
    const target = currentCandidate.value;
    const index = currentIndex.value;
    currentIndex.value++;

    try {
      const res = await api.post(`/interactions/${action}`, { targetUserId: target.id });
      if (action === 'like' && res.data.data.matched) {
        activeMatch.value = res.data.data;
      }
    } catch (err: any) {
      if (currentIndex.value === index + 1) currentIndex.value = index;
      useToastStore().error(
        action === 'like'
          ? `Couldn't connect with ${target.displayName}. ${err.message}`
          : `Couldn't skip ${target.displayName}. ${err.message}`
      );
    }
  }

  const likeCurrent = () => interactWithCurrent('like');
  const passCurrent = () => interactWithCurrent('pass');

  async function blockUser(targetUserId: string, reason = '') {
    await api.post('/safety/block', { targetUserId, reason });
    // Remove from feed if present
    feed.value = feed.value.filter((u) => u.id !== targetUserId);
  }

  async function reportUser(reportedUserId: string, category: string, details = '') {
    await api.post('/safety/reports', { reportedUserId, category, details });
  }

  function dismissMatchModal() {
    activeMatch.value = null;
  }

  return {
    feed,
    currentIndex,
    loading,
    error,
    currentCandidate,
    hasMore,
    activeMatch,
    filters,
    tab,
    tabNeedsArea,
    setTab,
    activeFilterCount,
    setFilters,
    clearFilters,
    loadFeed,
    likeCurrent,
    passCurrent,
    blockUser,
    reportUser,
    dismissMatchModal,
  };
});
