<template>
  <div class="discover-page d-flex flex-column flex-grow-1">
    <header class="discover-header">
      <h1 class="visually-hidden">Discover</h1>
      <BrandMark size="2rem" wordmark class="d-md-none" />
      <span class="discover-title d-none d-md-block" aria-hidden="true">Discover</span>
      <button type="button" class="filter-button" :aria-label="filterButtonLabel" @click="isFiltersOpen = true">
        <i class="ri-equalizer-2-line" aria-hidden="true"></i>
        <span class="d-none d-sm-inline">Filters</span>
        <span v-if="discoverStore.activeFilterCount" class="filter-count" aria-hidden="true">
          {{ discoverStore.activeFilterCount }}
        </span>
      </button>
    </header>

    <!-- For You / Nearby / Interests -->
    <div class="discover-tabs" role="tablist" aria-label="Show people">
      <button
        v-for="option in TABS"
        :key="option.id"
        type="button"
        role="tab"
        class="discover-tab"
        :class="{ 'is-active': discoverStore.tab === option.id }"
        :aria-selected="discoverStore.tab === option.id"
        @click="discoverStore.setTab(option.id)"
      >
        {{ option.label }}
      </button>
    </div>

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
      <!-- Nearby needs the viewer's own area -->
      <UEmptyState
        v-if="discoverStore.tabNeedsArea"
        title="Set your area to see people nearby"
        description="Only your town or city is used, and others only ever see an approximate distance."
      >
        <template #icon>
          <i class="ri-map-pin-2-line fs-2"></i>
        </template>
        <template #action>
          <UButton variant="primary" size="md" @click="$router.push('/profile')">Set my area</UButton>
        </template>
      </UEmptyState>

      <!-- Loading -->
      <div v-else-if="discoverStore.loading" class="discover-grid">
        <USkeleton type="card" height="34rem" class="stack-skeleton" />
        <USkeleton type="card" height="20rem" class="d-none d-lg-block" />
      </div>

      <!-- The deck -->
      <div v-else-if="discoverStore.currentCandidate" class="discover-grid animate-fade-in">
        <div class="deck-column enter-rise" style="--i: 0">
          <DiscoverStack
            ref="stack"
            :top="discoverStore.currentCandidate"
            :behind="behind"
            @like="handleLike"
            @pass="handlePass"
            @open-safety="openSafety"
          />

          <!-- Pass / message / connect -->
          <div class="deck-actions">
            <button type="button" class="action-orb orb-pass" aria-label="Pass" title="Pass" @click="stack?.fling('left')">
              <i class="ri-close-line" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="action-orb orb-message"
              :aria-label="`Message ${discoverStore.currentCandidate.displayName}`"
              title="Message"
              @click="openMessage"
            >
              <i class="ri-chat-heart-fill" aria-hidden="true"></i>
            </button>
            <button type="button" class="action-orb orb-like" aria-label="Connect" title="Connect" @click="stack?.fling('right')">
              <i class="ri-heart-3-fill" aria-hidden="true"></i>
            </button>
          </div>
          <p class="deck-hint d-none d-md-block mb-0">Drag the card, or use ← →</p>
        </div>

        <CandidateDetails class="enter-rise" style="--i: 1" :candidate="discoverStore.currentCandidate" />
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

    <MessageRequestModal
      v-if="messageTarget"
      :is-open="isMessageOpen"
      :recipient="messageTarget"
      @close="isMessageOpen = false"
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
import MessageRequestModal from '../components/chat/MessageRequestModal.vue';
import BrandMark from '../components/layout/BrandMark.vue';
import type { DiscoverTab } from '../stores/discover';
import DiscoverFilters from '../components/discovery/DiscoverFilters.vue';
import SafetyModal from '../components/safety/SafetyModal.vue';
import USkeleton from '../components/ui/USkeleton.vue';
import UEmptyState from '../components/ui/UEmptyState.vue';
import UButton from '../components/ui/UButton.vue';
import { useDiscoverStore, DiscoverFilters as Filters } from '../stores/discover';

const discoverStore = useDiscoverStore();

const isFiltersOpen = ref(false);

const TABS: { id: DiscoverTab; label: string }[] = [
  { id: 'forYou', label: 'For You' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'interests', label: 'Interests' },
];

type ChipKey = 'radius' | 'place' | 'college' | 'age' | 'interests';

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
  if (f.interestIds.length) {
    chips.push({ key: 'interests', label: f.interestIds.length === 1 ? '1 interest' : `${f.interestIds.length} interests` });
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
  if (key === 'interests') next.interestIds = [];
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

// Message someone without matching first: a request they approve (see MessageRequestModal).
const isMessageOpen = ref(false);
const messageTarget = ref<{ id: string; displayName: string } | null>(null);

function openMessage() {
  const candidate = discoverStore.currentCandidate;
  if (!candidate) return;
  messageTarget.value = { id: candidate.id, displayName: candidate.displayName };
  isMessageOpen.value = true;
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
  grid-template-columns: minmax(0, 1fr);
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
  min-width: 0;
  width: 100%;
}

.deck-actions {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  // The buttons overlap the bottom of the card, as in the reference.
  margin-top: -2.25rem;
}

.action-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  transition: transform var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast);

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: scale(0.94);
  }
}

.orb-pass,
.orb-message {
  width: 3.75rem;
  height: 3.75rem;
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-md);
}

.orb-pass {
  font-size: 1.75rem;
  color: var(--unmute-text-secondary);
}

.orb-message {
  font-size: 1.5rem;
  color: var(--unmute-primary);
}

.orb-like {
  width: 4.25rem;
  height: 4.25rem;
  font-size: 1.9rem;
  color: #fff;
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary), 0 0 0 4px var(--unmute-surface);
}

@media (prefers-reduced-motion: reduce) {
  .action-orb:hover,
  .action-orb:active {
    transform: none;
  }
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
  color: #fff;
  background: var(--unmute-primary-gradient);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--unmute-glass-border);
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--unmute-text-primary);
  background: var(--unmute-surface);

  &:hover {
    background: var(--unmute-primary-surface);
  }
}

.discover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.875rem;
}

.discover-title {
  font-family: var(--unmute-font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
}

.filter-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 2.75rem;
  height: 2.75rem;
  padding: 0 0.85rem;
  border: 1px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-pill);
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  font-weight: 600;
  font-size: 0.875rem;

  i {
    font-size: 1.2rem;
  }

  &:hover {
    border-color: var(--unmute-glass-border-hover);
  }
}

.discover-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  padding: 0.25rem;
  margin: 0 auto 1rem;
  width: 100%;
  max-width: 26rem;
  border-radius: var(--unmute-radius-pill);
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
}

.discover-tab {
  border: 0;
  border-radius: var(--unmute-radius-pill);
  padding: 0.45rem 0.5rem;
  background: transparent;
  color: var(--unmute-text-muted);
  font-size: 0.875rem;
  font-weight: 600;

  &.is-active {
    color: var(--unmute-accent-text);
    background: var(--unmute-primary-surface);
    font-weight: 700;
  }
}
</style>
