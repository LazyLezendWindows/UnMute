import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';
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

  async function likeCurrent() {
    if (!currentCandidate.value) return;
    const target = currentCandidate.value;
    currentIndex.value++;

    try {
      const res = await api.post('/interactions/like', {
        targetUserId: target.id,
      });

      if (res.data.data.matched) {
        activeMatch.value = res.data.data;
      }
    } catch (err: any) {
      console.error('Failed to like:', err);
    }
  }

  async function passCurrent() {
    if (!currentCandidate.value) return;
    const target = currentCandidate.value;
    currentIndex.value++;

    try {
      await api.post('/interactions/pass', {
        targetUserId: target.id,
      });
    } catch (err: any) {
      console.error('Failed to pass:', err);
    }
  }

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
