<template>
  <div class="app-shell min-vh-100 d-flex flex-column position-relative u-page">

    <AppNav :show-mobile-dock="showMobileDock" />

    <main
      :class="{ 'has-mobile-dock': showMobileDock }"
      class="app-main flex-grow-1 d-flex flex-column position-relative"
    >
      <div class="app-stage flex-grow-1 d-flex flex-column w-100 mx-auto">
        <slot />
      </div>
    </main>

    <!-- Global mutual-match celebration -->
    <MatchModal :match="discoverStore.activeMatch" @dismiss="discoverStore.dismissMatchModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppNav from '../components/layout/AppNav.vue';
import MatchModal from '../components/matching/MatchModal.vue';
import { useDiscoverStore } from '../stores/discover';
import { useChatStore } from '../stores/chat';
import { useAuthStore } from '../stores/auth';
import { resyncPush } from '../platform/webPush';

const route = useRoute();
const discoverStore = useDiscoverStore();
const chatStore = useChatStore();
const authStore = useAuthStore();

// Realtime chat events and the unread badge work on every signed-in page, not just in Chat.
// Re-run on every sign-in: each session gets a new socket.
watch(
  () => authStore.isAuthenticated,
  (signedIn) => {
    if (!signedIn) return;
    chatStore.initSocketHandlers();
    chatStore.loadConversations();
    chatStore.loadRequests();
    if (authStore.user) resyncPush(authStore.user.id);
  },
  { immediate: true }
);

// Inside an open conversation (or secondary screens) the bottom bar is hidden.
const HIDE_DOCK_ROUTES = new Set(['profile-edit', 'profile-interests', 'settings-appearance']);
const showMobileDock = computed(() => {
  if (route.name === 'chat' && (route.params.id || route.query.request)) return false;
  if (HIDE_DOCK_ROUTES.has(route.name as string)) return false;
  return true;
});
</script>

<style scoped lang="scss">
// Grows with its content (the body is a full-height flex column, which would otherwise squeeze
// this to one screen), and clips only sideways so the page itself keeps scrolling vertically.
.app-shell {
  flex-shrink: 0;
  overflow-x: clip;
}

.app-main {
  z-index: 10;
  padding: calc(var(--unmute-safe-top) + 0.75rem) 1rem 1.5rem;

  // Clearance for the bottom tab bar (and the home indicator).
  &.has-mobile-dock {
    padding-bottom: calc(var(--unmute-tabbar-height) + var(--unmute-safe-bottom) + 1rem);
  }

  // Desktop: content sits to the right of the navigation rail.
  @media (min-width: 768px) {
    &,
    &.has-mobile-dock {
      padding: 2rem 2rem 2rem calc(var(--unmute-dock-width) + 2rem);
    }
  }
}

.app-stage {
  max-width: 72rem;
}
</style>
