<template>
  <div class="min-vh-100 d-flex flex-column position-relative overflow-hidden u-page">
    <!-- Ambient 3D Depth Lighting & Dynamic Blobs -->
    <div
      class="ambient-blob ambient-blob-primary position-fixed top-0 start-25 rounded-circle pointer-events-none animate-pulse-glow"
    ></div>
    <div
      class="ambient-blob ambient-blob-secondary position-fixed bottom-0 end-25 rounded-circle pointer-events-none animate-pulse-glow"
    ></div>

    <Navbar />

    <main :class="{ 'has-bottom-nav': showBottomNav }" class="app-main flex-grow-1 d-flex flex-column container max-w-4xl px-3 pt-3 pt-md-4 position-relative">
      <slot />
    </main>

    <BottomNav v-if="showBottomNav" />

    <!-- Global Mutual Match Celebration Modal -->
    <MatchModal
      :match="discoverStore.activeMatch"
      @dismiss="discoverStore.dismissMatchModal"
    />
  </div>
</template>

<script setup lang="ts">
import Navbar from '../components/layout/Navbar.vue';
import BottomNav from '../components/layout/BottomNav.vue';
import MatchModal from '../components/matching/MatchModal.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDiscoverStore } from '../stores/discover';

const route = useRoute();
const discoverStore = useDiscoverStore();

// Inside an open conversation the message composer owns the bottom of the screen.
const showBottomNav = computed(() => !(route.name === 'chat' && route.params.id));
</script>

<style scoped lang="scss">
.ambient-blob {
  z-index: 0;
}

.ambient-blob-primary {
  width: 24rem;
  height: 24rem;
  filter: blur(130px);
  background: var(--unmute-primary);
  opacity: 0.14;
}

.ambient-blob-secondary {
  width: 20rem;
  height: 20rem;
  filter: blur(110px);
  background: var(--unmute-primary-light);
  opacity: 0.1;
  animation-delay: 1.5s;
}

.app-main {
  z-index: 10;
  padding-bottom: 1rem;

  // Clearance for the fixed mobile bottom nav (and the home indicator); desktop has no bottom nav.
  &.has-bottom-nav {
    padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
  }

  @media (min-width: 768px) {
    &,
    &.has-bottom-nav {
      padding-bottom: 1.5rem;
    }
  }
}
</style>
