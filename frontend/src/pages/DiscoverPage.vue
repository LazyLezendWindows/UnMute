<template>
  <div class="discover-page d-flex flex-column flex-grow-1">
    <PageHeader title="Discover" subtitle="People who share your interests, near and far.">
      <template #actions>
        <UButton variant="glass" size="sm" :aria-label="filterButtonLabel" @click="isFiltersOpen = true">
          <i class="ri-equalizer-2-line me-1" aria-hidden="true"></i>
          <span>Filters</span>
          <span v-if="discoverStore.activeFilterCount" class="filter-count ms-2" aria-hidden="true">
            {{ discoverStore.activeFilterCount }}
          </span>
        </UButton>
      </template>
    </PageHeader>

    <!-- Active filters, each removable -->
    <div v-if="activeChips.length" class="discover-toolbar d-flex align-items-center gap-2 flex-wrap mb-3">
      <button
        v-for="chip in activeChips"
        :key="chip.key"
        type="button"
        class="filter-chip"
        :aria-label="`Remove filter: ${chip.label}`"
        @click="removeFilter(chip.key)"
      >
        <span>{{ chip.label }}</span>
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </div>

    <div class="flex-grow-1 d-flex flex-column justify-content-center">
      <!-- Loading -->
      <div v-if="discoverStore.loading" class="discover-grid">
        <USkeleton type="card" height="34rem" class="stack-skeleton" />
        <USkeleton type="card" height="20rem" class="d-none d-lg-block" />
      </div>

      <!-- The deck -->
      <div v-else-if="discoverStore.currentCandidate" class="discover-grid animate-fade-in">
        <div class="deck-column">
          <DiscoverStack
            ref="stack"
            :top="discoverStore.currentCandidate"
            :behind="behind"
            @like="handleLike"
            @pass="handlePass"
            @open-safety="openSafety"
          />

          <!-- Action orbs -->
          <div class="deck-actions">
            <button type="button" class="action-orb orb-pass" aria-label="Pass" title="Pass" @click="stack?.fling('left')">
              <i class="ri-close-line" aria-hidden="true"></i>
            </button>
            <button type="button" class="action-orb orb-like" aria-label="Connect" title="Connect" @click="stack?.fling('right')">
              <i class="ri-heart-3-fill" aria-hidden="true"></i>
            </button>
          </div>
          <p class="deck-hint d-none d-md-block mb-0">Drag the card, or use ← →</p>
        </div>

        <CandidateDetails :candidate="discoverStore.currentCandidate" />
      </div>

      <!-- The feed could not load: say so rather than pretending no one is left -->
      <UEmptyState v-else-if="discoverStore.error" title="Couldn't load people" :description="discoverStore.error">
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

      <!-- Everyone reviewed -->
      <UEmptyState
        v-else
        title="You're all caught up!"
        description="You've seen everyone for now. Check back soon, or add interests to meet more people."
      >
        <template #icon>
          <i class="ri-sparkling-fill fs-2"></i>
        </template>
        <template #action>
          <UButton variant="secondary" size="md" @click="discoverStore.loadFeed">
            <i class="ri-refresh-line me-2"></i>
            <span>Refresh</span>
          </UButton>
          <UButton variant="primary" size="md" @click="$router.push('/profile')">Edit interests</UButton>
        </template>
      </UEmptyState>
    </div>

    <DiscoverFilters
      :is-open="isFiltersOpen"
      :filters="discoverStore.filters"
      @close="isFiltersOpen = false"
      @apply="applyFilters"
    />

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
import DiscoverStack from '../components/discovery/DiscoverStack.vue';
import CandidateDetails from '../components/discovery/CandidateDetails.vue';
import PageHeader from '../components/layout/PageHeader.vue';
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

const stack = ref<InstanceType<typeof DiscoverStack> | null>(null);

/** The next two people, shown receding behind the current card. */
const behind = computed(() =>
  discoverStore.feed.slice(discoverStore.currentIndex + 1, discoverStore.currentIndex + 3)
);

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
.discover-grid {
  display: grid;
  gap: 1.5rem;
  align-items: start;

  @media (min-width: 992px) {
    grid-template-columns: minmax(20rem, 26rem) minmax(18rem, 1fr);
    gap: 2.5rem;
  }
}

.stack-skeleton {
  max-width: 26rem;
  width: 100%;
  margin: 0 auto;
  border-radius: var(--unmute-radius-xl);
}

.deck-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.deck-actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.4rem;
}

.action-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  transition: transform var(--unmute-transition-bounce), box-shadow var(--unmute-transition-fast);

  &:hover {
    transform: translateY(-3px) scale(1.05);
  }

  &:active {
    transform: scale(0.94);
  }
}

.orb-pass {
  width: 3.75rem;
  height: 3.75rem;
  font-size: 1.6rem;
  color: var(--unmute-text-secondary);
  background: var(--unmute-glass-strong);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-md);
}

.orb-like {
  width: 4.5rem;
  height: 4.5rem;
  font-size: 1.8rem;
  color: #fff;
  background: radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.55), transparent 42%), var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 8px rgba(0, 0, 0, 0.18);
}

.deck-hint {
  margin-top: 0.9rem;
  font-size: 0.75rem;
  color: var(--unmute-text-muted);
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  color: var(--unmute-on-ink);
  background: var(--unmute-ink);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border: 0;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--unmute-text-primary);
  background: var(--unmute-glass-strong);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-sm);

  &:hover {
    background: var(--unmute-primary-surface);
  }
}
</style>
