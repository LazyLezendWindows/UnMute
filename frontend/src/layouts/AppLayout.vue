<template>
  <div class="app-shell min-vh-100 d-flex flex-column position-relative u-page">
    <SpatialScene mode="ambient" />

    <SpatialDock :show-mobile-dock="showMobileDock" />

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
import SpatialScene from '../components/scene/SpatialScene.vue';
import SpatialDock from '../components/layout/SpatialDock.vue';
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
    if (authStore.user) resyncPush(authStore.user.id);
  },
  { immediate: true }
);

// Inside an open conversation the message composer owns the bottom of the screen.
const showMobileDock = computed(() => !(route.name === 'chat' && route.params.id));
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
  padding: 0.5rem 1rem 1.5rem;

  // Clearance for the floating mobile dock (and the home indicator).
  &.has-mobile-dock {
    padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
  }

  // Desktop: content sits to the right of the dock rail.
  @media (min-width: 768px) {
    &,
    &.has-mobile-dock {
      padding: 2rem 2rem 2rem calc(var(--unmute-dock-width) + 3rem);
    }
  }
}

.app-stage {
  max-width: 72rem;
}
</style>
