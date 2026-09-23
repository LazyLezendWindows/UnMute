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

    <main class="app-main flex-grow-1 d-flex flex-column container max-w-4xl px-3 py-3 py-md-4 position-relative">
      <slot />
    </main>

    <BottomNav />

    <!-- Global Mutual Match Celebration Modal -->
    <MatchModal
      :match="discoverStore.activeMatch"
      @dismiss="discoverStore.dismissMatchModal"
    />
  </div>
</template>

<script setup lang="ts">
import Navbar from '../components/Navbar.vue';
import BottomNav from '../components/BottomNav.vue';
import MatchModal from '../components/MatchModal.vue';
import { useDiscoverStore } from '../stores/discover';

const discoverStore = useDiscoverStore();
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
  // Clearance for the mobile bottom nav. Currently overridden by Bootstrap's !important
  // py-3 / py-md-4 utilities (as the original inline style was); see follow-up.
  padding-bottom: 6rem;
}
</style>
