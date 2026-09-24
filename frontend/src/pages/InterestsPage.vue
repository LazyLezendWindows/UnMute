<template>
  <div class="interests-page d-flex flex-column w-100 pb-5">
    <!-- Header -->
    <header class="interests-header d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="back-btn" @click="router.back()" aria-label="Go back">
          <i class="ri-arrow-left-line" aria-hidden="true"></i>
        </button>
        <h1 class="page-title mb-0">Interests</h1>
      </div>
      <button
        v-if="hasChanges"
        type="button"
        class="save-btn"
        :disabled="saving"
        @click="saveInterests"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </header>

    <div class="interests-body enter-rise d-flex flex-column gap-4">
      <!-- Search Input -->
      <div class="search-wrap position-relative">
        <i class="ri-search-line search-icon" aria-hidden="true"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search interests"
          class="search-input w-100"
          autocomplete="off"
        />
        <button v-if="searchQuery" type="button" class="clear-search-btn" @click="searchQuery = ''" aria-label="Clear search">
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary spinner-border-sm" role="status">
          <span class="visually-hidden">Loading interests...</span>
        </div>
      </div>

      <template v-else>
        <!-- Selected Section -->
        <section class="selected-section">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h2 class="section-title mb-0">Selected ({{ selectedInterests.length }}/10)</h2>
            <span v-if="selectedInterests.length >= 10" class="limit-note">Max 10 reached</span>
          </div>

          <div v-if="selectedInterests.length > 0" class="d-flex flex-wrap gap-2">
            <button
              v-for="interest in selectedInterests"
              :key="interest.id"
              type="button"
              class="chip-selected"
              @click="toggleInterest(interest.id)"
            >
              <span>{{ interest.name }}</span>
              <i class="ri-close-line ms-1" aria-hidden="true"></i>
            </button>
          </div>
          <p v-else class="text-muted small mb-0">No interests selected yet. Pick your favorites below.</p>
        </section>

        <!-- More Interests Section -->
        <section class="more-section">
          <h2 class="section-title mb-3">More Interests</h2>

          <div v-if="availableInterests.length > 0" class="d-flex flex-wrap gap-2">
            <button
              v-for="interest in availableInterests"
              :key="interest.id"
              type="button"
              class="chip-available"
              :disabled="selectedIds.size >= 10"
              @click="toggleInterest(interest.id)"
            >
              <span>{{ interest.name }}</span>
            </button>
          </div>
          <p v-else class="text-muted small mb-0">
            {{ searchQuery ? `No interests found matching "${searchQuery}"` : 'All available interests have been selected' }}
          </p>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import type { Interest } from '../types';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

const searchQuery = ref('');
const loading = ref(true);
const saving = ref(false);

const allInterests = ref<Interest[]>([]);
const selectedIds = ref<Set<string>>(new Set());
const initialIds = ref<Set<string>>(new Set());

onMounted(async () => {
  try {
    const res = await api.get('/users/interests');
    allInterests.value = res.data.data || [];
  } catch (err: any) {
    toast.error(`Couldn't load interests: ${err.message}`);
  } finally {
    loading.value = false;
  }

  // Populate from real user profile
  const userInterests = authStore.profile?.interests || [];
  const current = new Set(userInterests.map((i) => i.id));
  selectedIds.value = new Set(current);
  initialIds.value = new Set(current);
});

const hasChanges = computed(() => {
  if (selectedIds.value.size !== initialIds.value.size) return true;
  for (const id of selectedIds.value) {
    if (!initialIds.value.has(id)) return true;
  }
  return false;
});

const interestMap = computed(() => {
  const map = new Map<string, Interest>();
  for (const item of allInterests.value) {
    map.set(item.id, item);
  }
  return map;
});

const selectedInterests = computed(() => {
  const list: Interest[] = [];
  for (const id of selectedIds.value) {
    const item = interestMap.value.get(id);
    if (item) list.push(item);
  }
  return list;
});

const availableInterests = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return allInterests.value.filter((item) => {
    if (selectedIds.value.has(item.id)) return false;
    return !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });
});

function toggleInterest(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    if (selectedIds.value.size >= 10) {
      toast.info('You can select up to 10 interests.');
      return;
    }
    selectedIds.value.add(id);
  }
}

async function saveInterests() {
  saving.value = true;
  try {
    await authStore.updateProfile({ interestIds: Array.from(selectedIds.value) });
    initialIds.value = new Set(selectedIds.value);
    toast.success('Interests saved successfully.');
    router.back();
  } catch (err: any) {
    toast.error(err.message || 'Failed to save interests');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="scss">
.interests-page {
  max-width: 28rem;
  margin: 0 auto;
}

.interests-header {
  padding: 0.5rem 0.25rem;
}

.page-title {
  font-family: var(--unmute-font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
  letter-spacing: -0.02em;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--unmute-text-primary);
  font-size: 1.35rem;
  cursor: pointer;
  transition: background var(--unmute-transition-fast);

  &:hover {
    background: var(--unmute-surface-raised);
  }
}

.save-btn {
  padding: 0.4rem 1.15rem;
  border-radius: var(--unmute-radius-pill);
  border: none;
  background: var(--unmute-primary-gradient);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px -2px rgba(225, 29, 72, 0.4);
  cursor: pointer;
  transition: transform var(--unmute-transition-fast), filter var(--unmute-transition-fast);

  &:hover {
    filter: brightness(1.05);
  }

  &:active {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.search-wrap {
  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--unmute-text-muted);
    font-size: 1.1rem;
    pointer-events: none;
  }

  .clear-search-btn {
    position: absolute;
    right: 0.85rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--unmute-text-muted);
    font-size: 1.1rem;
    cursor: pointer;
  }
}

.search-input {
  padding: 0.75rem 2.5rem 0.75rem 2.75rem;
  border-radius: var(--unmute-radius-pill);
  border: 1px solid var(--unmute-glass-border);
  background: var(--unmute-surface);
  font-size: 0.9375rem;
  color: var(--unmute-text-primary);
  outline: none;
  transition: border-color var(--unmute-transition-fast);

  &::placeholder {
    color: var(--unmute-text-muted);
  }

  &:focus {
    border-color: var(--unmute-primary);
  }
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.limit-note {
  font-size: 0.75rem;
  color: var(--unmute-danger);
  font-weight: 600;
}

/* Selected chips: Pink fill with dark magenta text */
.chip-selected {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.95rem;
  border-radius: var(--unmute-radius-pill);
  background: #fce7f3;
  color: #be185d;
  border: 1px solid rgba(225, 29, 72, 0.18);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--unmute-transition-fast), filter var(--unmute-transition-fast);

  i {
    font-size: 1rem;
    line-height: 1;
  }

  &:hover {
    filter: brightness(0.97);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.96);
  }
}

/* More chips: Clean white surface with light border and dark text */
.chip-available {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.95rem;
  border-radius: var(--unmute-radius-pill);
  background: var(--unmute-surface);
  color: var(--unmute-text-secondary);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--unmute-transition-fast);

  &:hover:not(:disabled) {
    border-color: var(--unmute-primary);
    color: var(--unmute-primary);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}
</style>
