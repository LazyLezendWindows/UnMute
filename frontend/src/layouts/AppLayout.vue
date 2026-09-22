<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden">
    <!-- Ambient 3D Depth Lighting & Blobs -->
    <div class="fixed top-0 left-1/4 w-96 h-96 rounded-full bg-brand-600/10 blur-[120px] pointer-events-none -z-10 animate-pulse-glow"></div>
    <div class="fixed bottom-10 right-1/4 w-80 h-80 rounded-full bg-pink-600/8 blur-[100px] pointer-events-none -z-10 animate-pulse-glow" style="animation-delay: 1.5s;"></div>

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
