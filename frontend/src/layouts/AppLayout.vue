<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <Navbar />

    <main class="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-6 pb-24 md:pb-8">
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
