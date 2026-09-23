import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';
import { useToastStore } from './toast';
import { DiscoveryCandidate } from '../types';

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

  async function loadFeed() {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.get('/discover');
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
    try {
      await api.post('/safety/block', { targetUserId, reason });
      // Remove from feed if present
      feed.value = feed.value.filter((u) => u.id !== targetUserId);
    } catch (err: any) {
      throw err;
    }
  }

  async function reportUser(reportedUserId: string, category: string, details = '') {
    try {
      await api.post('/safety/reports', { reportedUserId, category, details });
    } catch (err: any) {
      throw err;
    }
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
    loadFeed,
    likeCurrent,
    passCurrent,
    blockUser,
    reportUser,
    dismissMatchModal,
  };
});
