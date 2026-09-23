<template>
  <div class="app-shell min-vh-100 d-flex flex-column position-relative u-page">
    <SpaceBackdrop />

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
import SpaceBackdrop from '../components/layout/SpaceBackdrop.vue';
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
// Grows with its content (the body is a full-height flex column, which would otherwise squeeze
// this to one screen), and clips only sideways so the page itself keeps scrolling vertically.
.app-shell {
  flex-shrink: 0;
  overflow-x: clip;
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
