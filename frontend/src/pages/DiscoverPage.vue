<template>
  <div class="flex-grow-1 d-flex flex-column max-w-lg mx-auto w-100 py-3">
    <!-- Filters toolbar: the button plus a removable chip per active filter -->
    <div class="discover-toolbar d-flex align-items-center gap-2 flex-wrap mb-3 w-100 max-w-md mx-auto">
      <UButton variant="glass" size="sm" :aria-label="filterButtonLabel" @click="isFiltersOpen = true">
        <i class="ri-equalizer-line me-1" aria-hidden="true"></i>
        <span>Filters</span>
        <span v-if="discoverStore.activeFilterCount" class="filter-count ms-2 rounded-pill px-2" aria-hidden="true">
          {{ discoverStore.activeFilterCount }}
        </span>
      </UButton>
      <button
        v-for="chip in activeChips"
        :key="chip.key"
        type="button"
        class="filter-chip d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 small fw-semibold"
        :aria-label="`Remove filter: ${chip.label}`"
        @click="removeFilter(chip.key)"
      >
        <span>{{ chip.label }}</span>
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </div>

    <div class="flex-grow-1 d-flex flex-column justify-content-center">
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

      <!-- The feed could not load: say so rather than pretending no one is left -->
      <UEmptyState
        v-else-if="discoverStore.error"
        title="Couldn't load people"
        :description="discoverStore.error"
      >
        <template #icon>
          <i class="ri-wifi-off-line fs-2"></i>
        </template>
        <template #action>
          <UButton variant="primary" size="md" @click="discoverStore.loadFeed">
            <i class="ri-refresh-line me-2"></i>
            <span>Try again</span>
          </UButton>
        </template>
      </UEmptyState>

      <!-- Nobody matches the active filters -->
      <UEmptyState
        v-else-if="discoverStore.activeFilterCount"
        title="No one matches these filters"
        description="Try a wider distance or area, or clear some filters to see more people."
      >
        <template #icon>
          <i class="ri-filter-off-line fs-2"></i>
        </template>
        <template #action>
          <UButton variant="secondary" size="md" @click="isFiltersOpen = true">Adjust filters</UButton>
          <UButton variant="primary" size="md" @click="discoverStore.clearFilters">Clear filters</UButton>
        </template>
      </UEmptyState>

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

    </div>

    <DiscoverFilters
      :is-open="isFiltersOpen"
      :filters="discoverStore.filters"
      @close="isFiltersOpen = false"
      @apply="applyFilters"
    />

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
import { computed, ref, onMounted } from 'vue';
import DiscoverCard from '../components/discovery/DiscoverCard.vue';
import DiscoverFilters from '../components/discovery/DiscoverFilters.vue';
import SafetyModal from '../components/safety/SafetyModal.vue';
import USkeleton from '../components/ui/USkeleton.vue';
import UEmptyState from '../components/ui/UEmptyState.vue';
import UButton from '../components/ui/UButton.vue';
import { useDiscoverStore, DiscoverFilters as Filters } from '../stores/discover';

const discoverStore = useDiscoverStore();

const isFiltersOpen = ref(false);

type ChipKey = 'radius' | 'place' | 'college' | 'age';

const activeChips = computed(() => {
  const f = discoverStore.filters;
  const chips: { key: ChipKey; label: string }[] = [];
  if (f.radiusKm !== null) chips.push({ key: 'radius', label: `Within ${f.radiusKm} km` });
  if (f.place) chips.push({ key: 'place', label: f.place.name });
  if (f.sameInstitution) chips.push({ key: 'college', label: 'My college' });
  else if (f.institution) chips.push({ key: 'college', label: f.institution.shortName || f.institution.name });
  if (f.minAge !== null || f.maxAge !== null) {
    const label =
      f.minAge !== null && f.maxAge !== null
        ? `Age ${f.minAge}–${f.maxAge}`
        : f.minAge !== null
          ? `Age ${f.minAge}+`
          : `Age up to ${f.maxAge}`;
    chips.push({ key: 'age', label });
  }
  return chips;
});

const filterButtonLabel = computed(() =>
  discoverStore.activeFilterCount ? `Filters, ${discoverStore.activeFilterCount} active` : 'Filters'
);

function applyFilters(filters: Filters) {
  isFiltersOpen.value = false;
  discoverStore.setFilters(filters);
}

function removeFilter(key: ChipKey) {
  const next = { ...discoverStore.filters };
  if (key === 'radius') next.radiusKm = null;
  if (key === 'place') next.place = null;
  if (key === 'college') {
    next.sameInstitution = false;
    next.institution = null;
  }
  if (key === 'age') {
    next.minAge = null;
    next.maxAge = null;
  }
  discoverStore.setFilters(next);
}

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

<style scoped lang="scss">
.filter-count {
  background: var(--unmute-primary-gradient);
  color: #ffffff;
  font-size: 0.7rem;
  line-height: 1.4;
}

.filter-chip {
  background-color: var(--unmute-primary-surface);
  color: var(--unmute-accent-text);
  border: 1px solid var(--unmute-glass-border);
  font-size: 0.75rem;
  transition: background-color var(--unmute-transition-fast);

  &:hover,
  &:focus-visible {
    background-color: var(--unmute-surface-active);
  }

  &:focus-visible {
    outline: 2px solid var(--unmute-primary);
    outline-offset: 2px;
  }
}
</style>
