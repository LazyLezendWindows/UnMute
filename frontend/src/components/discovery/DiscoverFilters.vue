<template>
  <UModal :is-open="isOpen" title="Discovery filters" max-width="md" @close="$emit('close')">
    <form id="discover-filters-form" class="d-flex flex-column gap-4" @submit.prevent="apply">
      <!-- Distance -->
      <fieldset class="d-flex flex-column gap-2">
        <legend class="small fw-semibold mb-0 u-text-secondary">Distance</legend>
        <UChipGroup v-model="draft.radiusKm" :options="radiusOptions" label="Maximum distance" :disabled="!hasLocation" />
        <p v-if="!hasLocation" class="filter-hint mb-0 u-text-muted">
          <router-link to="/profile" class="u-link-strong" @click="$emit('close')">Set your area</router-link>
          to filter by distance.
        </p>
      </fieldset>

      <!-- Area -->
      <fieldset class="d-flex flex-column gap-2">
        <legend class="small fw-semibold mb-0 u-text-secondary">Area</legend>
        <UTypeahead
          v-model="draft.place"
          :fetch-items="(q: string) => searchPlaces(q)"
          :item-key="(p: Place) => p.id"
          :item-label="(p: Place) => p.name"
          :item-meta="placeMeta"
          placeholder="Any state, district, city or village"
          icon="ri-map-pin-line"
        />
      </fieldset>

      <!-- College -->
      <fieldset class="d-flex flex-column gap-2">
        <legend class="small fw-semibold mb-0 u-text-secondary">College</legend>
        <UChipGroup v-model="collegeMode" :options="collegeOptions" label="College filter" />
        <p v-if="!hasEducation && collegeMode !== 'specific'" class="filter-hint mb-0 u-text-muted">
          <router-link to="/profile" class="u-link-strong" @click="$emit('close')">Add your college</router-link>
          to find people from it.
        </p>
        <UTypeahead
          v-if="collegeMode === 'specific'"
          v-model="draft.institution"
          :fetch-items="(q: string) => searchInstitutions(q)"
          :item-key="(i: Institution) => i.id"
          :item-label="(i: Institution) => i.shortName || i.name"
          :item-meta="institutionMeta"
          placeholder="Search colleges and universities"
          icon="ri-graduation-cap-line"
        />
      </fieldset>

      <!-- Age -->
      <fieldset class="d-flex flex-column gap-2">
        <legend class="small fw-semibold mb-0 u-text-secondary">Age</legend>
        <div class="row g-3">
          <div class="col-6">
            <UInput v-model="minAge" label="From" type="number" :min="18" :max="100" placeholder="18" />
          </div>
          <div class="col-6">
            <UInput v-model="maxAge" label="To" type="number" :min="18" :max="100" placeholder="Any" />
          </div>
        </div>
        <p v-if="ageError" class="small text-danger fw-medium mb-0" role="alert">{{ ageError }}</p>
      </fieldset>
    </form>

    <template #footer>
      <UButton variant="ghost" size="md" @click="resetDraft">Reset</UButton>
      <UButton type="submit" form="discover-filters-form" variant="primary" size="md" :disabled="Boolean(ageError)">
        Show people
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UModal from '../ui/UModal.vue';
import UButton from '../ui/UButton.vue';
import UInput from '../ui/UInput.vue';
import UChipGroup from '../ui/UChipGroup.vue';
import UTypeahead from '../ui/UTypeahead.vue';
import { DiscoverFilters, RADIUS_OPTIONS_KM, emptyFilters } from '../../stores/discover';
import { useAuthStore } from '../../stores/auth';
import { institutionMeta, placeMeta, searchInstitutions, searchPlaces } from '../../services/directory';
import { Institution, Place } from '../../types';

const props = defineProps<{ isOpen: boolean; filters: DiscoverFilters }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', filters: DiscoverFilters): void;
}>();

const authStore = useAuthStore();
const hasLocation = computed(() => Boolean(authStore.profile?.location));
const hasEducation = computed(() => Boolean(authStore.profile?.education));

// Edits happen on a draft; nothing changes until "Show people".
const draft = ref<DiscoverFilters>(emptyFilters());
const collegeMode = ref<'any' | 'mine' | 'specific'>('any');
const minAge = ref('');
const maxAge = ref('');

function loadDraft(from: DiscoverFilters) {
  draft.value = { ...from };
  collegeMode.value = from.sameInstitution ? 'mine' : from.institution ? 'specific' : 'any';
  minAge.value = from.minAge !== null ? String(from.minAge) : '';
  maxAge.value = from.maxAge !== null ? String(from.maxAge) : '';
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) loadDraft(props.filters);
  },
  { immediate: true }
);

const radiusOptions = computed(() => [
  { value: null, label: 'Anywhere' },
  ...RADIUS_OPTIONS_KM.map((km) => ({ value: km, label: `${km} km` })),
]);

const collegeOptions = computed(() => [
  { value: 'any' as const, label: 'Anyone' },
  { value: 'mine' as const, label: 'My college', disabled: !hasEducation.value },
  { value: 'specific' as const, label: 'Choose…' },
]);

const toAge = (value: string) => (value.trim() ? Number(value) : null);

const ageError = computed(() => {
  const min = toAge(minAge.value);
  const max = toAge(maxAge.value);
  for (const age of [min, max]) {
    if (age !== null && (!Number.isInteger(age) || age < 18 || age > 100)) return 'Ages must be whole numbers from 18 to 100.';
  }
  if (min !== null && max !== null && min > max) return '"From" cannot be above "To".';
  return '';
});

function resetDraft() {
  loadDraft(emptyFilters());
}

function apply() {
  if (ageError.value) return;
  emit('apply', {
    ...draft.value,
    radiusKm: hasLocation.value ? draft.value.radiusKm : null,
    sameInstitution: collegeMode.value === 'mine',
    institution: collegeMode.value === 'specific' ? draft.value.institution : null,
    minAge: toAge(minAge.value),
    maxAge: toAge(maxAge.value),
  });
}
</script>

<style scoped>
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.filter-hint {
  font-size: 0.75rem;
}
</style>
