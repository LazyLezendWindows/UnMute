<template>
  <div class="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
    <!-- Loading State -->
    <div v-if="discoverStore.loading" class="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
      <div class="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
      <p class="text-xs font-medium">Finding people who share your wavelength...</p>
    </div>

    <!-- Active Discovery Card -->
    <div v-else-if="discoverStore.currentCandidate" class="w-full">
      <DiscoverCard
        :candidate="discoverStore.currentCandidate"
        @like="handleLike"
        @pass="handlePass"
        @open-safety="openSafety"
      />
    </div>

    <!-- Empty / All caught up state -->
    <div v-else class="text-center py-16 px-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
      <div class="inline-flex p-4 rounded-full bg-slate-800 text-brand-400 mb-1">
        <Sparkles class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-bold text-white">You're all caught up!</h3>
      <p class="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
        You've reviewed all active connections matching your criteria. Check back soon or update your interests in your profile.
      </p>
      <div class="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
        <button
          type="button"
          @click="discoverStore.loadFeed"
          class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>Refresh Feed</span>
        </button>
        <router-link
          to="/profile"
          class="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-colors text-center"
        >
          Edit Interests
        </router-link>
      </div>
    </div>

    <!-- Safety Modal (Block / Report) -->
    <SafetyModal
      v-if="safetyTarget"
      :is-open="isSafetyOpen"
      :target-user-id="safetyTarget.id"
      :target-name="safetyTarget.displayName"
      @close="isSafetyOpen = false"
      @action-completed="onSafetyActionCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Sparkles, RefreshCw } from 'lucide-vue-next';
import DiscoverCard from '../components/DiscoverCard.vue';
import SafetyModal from '../components/SafetyModal.vue';
import { useDiscoverStore } from '../stores/discover';

const discoverStore = useDiscoverStore();

const isSafetyOpen = ref(false);
const safetyTarget = ref<{ id: string; displayName: string } | null>(null);

onMounted(() => {
  discoverStore.loadFeed();
});

function handleLike() {
  discoverStore.likeCurrent();
}

function handlePass() {
  discoverStore.passCurrent();
}

function openSafety() {
  if (discoverStore.currentCandidate) {
    safetyTarget.value = {
      id: discoverStore.currentCandidate.id,
      displayName: discoverStore.currentCandidate.displayName,
    };
    isSafetyOpen.value = true;
  }
}

function onSafetyActionCompleted() {
  discoverStore.currentIndex++;
}
</script>
