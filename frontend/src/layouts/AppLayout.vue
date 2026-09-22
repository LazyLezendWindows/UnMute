<template>
  <div class="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300" style="background-color: var(--unmute-bg); color: var(--unmute-text-primary);">
    <!-- Ambient 3D Depth Lighting & Dynamic Blobs -->
    <div
      class="fixed top-0 left-1/4 w-96 h-96 rounded-full blur-[130px] pointer-events-none -z-10 animate-pulse-glow"
      style="background: var(--unmute-primary); opacity: 0.14;"
    ></div>
    <div
      class="fixed bottom-10 right-1/4 w-80 h-80 rounded-full blur-[110px] pointer-events-none -z-10 animate-pulse-glow"
      style="background: var(--unmute-primary-light); opacity: 0.10; animation-delay: 1.5s;"
    ></div>

    <Navbar />

    <main class="flex-1 flex flex-col container max-w-4xl px-4 py-4 md:py-6 pb-28 md:pb-10 relative z-10">
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
