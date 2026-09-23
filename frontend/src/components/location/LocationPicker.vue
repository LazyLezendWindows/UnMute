<template>
  <div class="d-flex flex-column gap-3">
    <!-- Current area -->
    <div class="location-current d-flex align-items-start gap-3 p-3 rounded-4">
      <i class="ri-map-pin-2-fill fs-4 u-text-accent flex-shrink-0" aria-hidden="true"></i>
      <div class="flex-grow-1 min-w-0" aria-live="polite">
        <template v-if="location">
          <div class="small u-text-muted">Others see</div>
          <div class="fw-bold u-text-primary text-truncate">{{ location.label || 'Your area' }}</div>
          <div class="location-source u-text-muted">{{ sourceDescription }}</div>
        </template>
        <template v-else>
          <div class="fw-semibold u-text-primary">No area set</div>
          <div class="location-source u-text-muted">
            Add one to see who's nearby. Others only ever see the area name, never your position.
          </div>
        </template>
      </div>
      <UButton v-if="location" variant="ghost" size="sm" :disabled="busy" @click="remove">Remove</UButton>
    </div>

    <!-- How much of the area to show -->
    <div v-if="location" class="d-flex flex-column gap-2">
      <span class="small fw-semibold u-text-secondary">How much to show others</span>
      <UChipGroup
        :model-value="location.precision"
        :options="precisionOptions"
        label="How much of your area to show others"
        :disabled="busy"
        @update:model-value="changePrecision"
      />
    </div>

    <!-- Ways to set the area -->
    <div class="d-flex flex-column gap-2">
      <span class="small fw-semibold u-text-secondary">{{ location ? 'Change your area' : 'Set your area' }}</span>
      <UChipGroup v-model="method" :options="methodOptions" label="How to set your area" :disabled="busy" />
    </div>

    <div v-if="method === 'search'">
      <UTypeahead
        :model-value="null"
        :fetch-items="(q: string) => searchPlaces(q, { kinds: SETTLEMENT_KINDS })"
        :item-key="(p: Place) => p.id"
        :item-label="(p: Place) => p.name"
        :item-meta="placeMeta"
        label="Town, city, village or district"
        placeholder="e.g. Secunderabad, Kandi, Pune"
        icon="ri-search-line"
        :disabled="busy"
        @update:model-value="choosePlace"
      />
    </div>

    <form v-else-if="method === 'pincode'" class="d-flex align-items-end gap-2" @submit.prevent="usePincode">
      <div class="flex-grow-1">
        <UInput
          v-model="pincode"
          label="PIN code"
          placeholder="6-digit PIN code"
          :maxlength="6"
          :error="pincodeError"
          :disabled="busy"
        />
      </div>
      <UButton type="submit" variant="secondary" size="md" :loading="busy" :disabled="!/^\d{6}$/.test(pincode)">
        Use PIN
      </UButton>
    </form>

    <div v-else class="d-flex flex-column gap-2">
      <p class="small mb-0 u-text-muted">
        Your browser shares your position once. Unmute keeps only a roughly 1 km area and matches it to the nearest town;
        the exact position is never stored or shown.
      </p>
      <div>
        <UButton variant="secondary" size="md" :loading="busy" :disabled="!geolocationSupported" @click="useDevice">
          <i class="ri-focus-3-line me-2" aria-hidden="true"></i>
          Use my current location
        </UButton>
      </div>
      <p v-if="!geolocationSupported" class="small text-danger mb-0">This browser can't share its location.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import UButton from '../ui/UButton.vue';
import UInput from '../ui/UInput.vue';
import UChipGroup from '../ui/UChipGroup.vue';
import UTypeahead from '../ui/UTypeahead.vue';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { placeKindLabel, placeMeta, searchPlaces } from '../../services/directory';
import { LocationPrecision, Place, PlaceKind } from '../../types';

const SETTLEMENT_KINDS: PlaceKind[] = ['city', 'town', 'village', 'district', 'subdistrict'];

const authStore = useAuthStore();
const toast = useToastStore();

const location = computed(() => authStore.profile?.location ?? null);
const method = ref<'search' | 'pincode' | 'device'>('search');
const busy = ref(false);
const pincode = ref('');
const pincodeError = ref<string | null>(null);
const geolocationSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

const methodOptions = [
  { value: 'search' as const, label: 'Search' },
  { value: 'pincode' as const, label: 'PIN code' },
  { value: 'device' as const, label: 'Near me' },
];

const precisionOptions: { value: LocationPrecision; label: string; title: string }[] = [
  { value: 'locality', label: 'Locality', title: 'Your town or village' },
  { value: 'city', label: 'City', title: 'Your city, or your district for villages' },
  { value: 'state', label: 'State only', title: 'Only your state' },
];

const sourceDescription = computed(() => {
  const loc = location.value;
  if (!loc) return '';
  switch (loc.source) {
    case 'device':
      return `Set from your device · near ${loc.placeName}`;
    case 'pincode':
      return `Set from PIN code ${loc.pincode}`;
    default:
      return `Set to ${loc.placeName}${loc.placeKind ? ` (${placeKindLabel(loc.placeKind).toLowerCase()})` : ''}`;
  }
});

async function save(action: () => Promise<unknown>, success: string): Promise<boolean> {
  busy.value = true;
  try {
    await action();
    toast.success(success);
    return true;
  } catch (err: any) {
    toast.error(err.message);
    return false;
  } finally {
    busy.value = false;
  }
}

function choosePlace(place: Place | null) {
  if (!place) return;
  save(
    () => authStore.setLocation({ mode: 'place', placeId: place.id, precision: location.value?.precision }),
    'Area updated.'
  );
}

async function usePincode() {
  pincodeError.value = null;
  busy.value = true;
  try {
    await authStore.setLocation({ mode: 'pincode', pincode: pincode.value, precision: location.value?.precision });
    pincode.value = '';
    toast.success('Area updated.');
  } catch (err: any) {
    // Wrong or unknown PIN codes are a form problem, so they stay next to the field.
    pincodeError.value = err.message;
  } finally {
    busy.value = false;
  }
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 10 * 60 * 1000,
    })
  );
}

async function useDevice() {
  busy.value = true;
  let position: GeolocationPosition;
  try {
    position = await currentPosition();
  } catch (err: any) {
    busy.value = false;
    toast.error(
      err?.code === 1
        ? 'Location access was blocked. Allow it in your browser settings, or search for your area instead.'
        : "Couldn't get your position. Try again, or search for your area instead."
    );
    return;
  }
  busy.value = false;
  await save(
    () =>
      authStore.setLocation({
        mode: 'device',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        precision: location.value?.precision,
      }),
    'Area updated from your location.'
  );
}

function changePrecision(precision: LocationPrecision) {
  save(() => authStore.setLocationPrecision(precision), 'Visibility updated.');
}

function remove() {
  save(() => authStore.clearLocation(), 'Area removed.');
}
</script>

<style scoped lang="scss">
.location-current {
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
}

.location-source {
  font-size: 0.75rem;
}

.min-w-0 {
  min-width: 0;
}
</style>
