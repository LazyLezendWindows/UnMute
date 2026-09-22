<template>
  <div class="min-vh-100 d-flex flex-column position-relative overflow-hidden" style="background-color: var(--unmute-bg); color: var(--unmute-text-primary);">
    <!-- Ambient 3D Depth Lighting & Dynamic Blobs -->
    <div
      class="position-fixed top-0 start-25 rounded-circle pointer-events-none animate-pulse-glow"
      style="width: 24rem; height: 24rem; filter: blur(130px); z-index: 0; background: var(--unmute-primary); opacity: 0.14;"
    ></div>
    <div
      class="position-fixed bottom-0 end-25 rounded-circle pointer-events-none animate-pulse-glow"
      style="width: 20rem; height: 20rem; filter: blur(110px); z-index: 0; background: var(--unmute-primary-light); opacity: 0.10; animation-delay: 1.5s;"
    ></div>

    <Navbar />

    <main class="flex-grow-1 d-flex flex-column container max-w-4xl px-3 py-3 py-md-4 position-relative" style="z-index: 10; padding-bottom: 6rem;">
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
