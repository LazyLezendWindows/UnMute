<template>
  <div class="flex-grow-1 d-flex flex-column justify-content-center max-w-lg mx-auto w-100 py-3">
    <!-- Loading State: Card Skeleton with shimmer -->
    <div v-if="discoverStore.loading" class="w-100 d-flex flex-column gap-3">
      <USkeleton type="card" height="480px" />
      <div class="d-flex gap-3">
        <USkeleton type="button" class="flex-fill" />
        <USkeleton type="button" class="flex-fill" />
      </div>
    </div>

    <!-- Active Discovery Card with 3D Depth -->
    <div v-else-if="discoverStore.currentCandidate" class="w-100 animate-fade-in">
      <DiscoverCard
        :candidate="discoverStore.currentCandidate"
        @like="handleLike"
        @pass="handlePass"
        @open-safety="openSafety"
      />
    </div>

    <!-- Empty State with Ambient 3D Glow -->
    <UEmptyState
      v-else
      title="You're all caught up!"
      description="You've reviewed all active connections matching your criteria. Check back soon or update your interests to meet more people."
    >
      <template #icon>
        <i class="ri-sparkling-fill fs-2"></i>
      </template>
      <template #action>
        <UButton
          variant="secondary"
          size="md"
          @click="discoverStore.loadFeed"
        >
          <i class="ri-refresh-line me-2"></i>
          <span>Refresh Feed</span>
        </UButton>
        <UButton
          variant="primary"
          size="md"
          @click="$router.push('/profile')"
        >
          Edit Interests
        </UButton>
      </template>
    </UEmptyState>

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
import DiscoverCard from '../components/discovery/DiscoverCard.vue';
import SafetyModal from '../components/safety/SafetyModal.vue';
import USkeleton from '../components/ui/USkeleton.vue';
import UEmptyState from '../components/ui/UEmptyState.vue';
import UButton from '../components/ui/UButton.vue';
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
