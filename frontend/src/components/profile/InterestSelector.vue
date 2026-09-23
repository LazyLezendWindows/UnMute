<template>
  <div class="d-flex flex-column gap-2">
    <div class="d-flex align-items-center justify-content-between">
      <span class="small fw-semibold u-text-muted">
        Select up to 10 interests ({{ modelValue.length }}/10 selected)
      </span>
    </div>

    <!-- Interactive chip grid with tactile press depth -->
    <div class="d-flex flex-wrap gap-2">
      <button
        v-for="interest in allInterests"
        :key="interest.id"
        type="button"
        @click="toggleInterest(interest.id)"
        class="u-chip-btn d-inline-flex align-items-center px-3 py-2 border-0 user-select-none"
        :class="{ 'chip-selected': isSelected(interest.id) }"
      >
        <span>{{ interest.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../services/api';
import { Interest } from '../../types';

const props = defineProps<{
  modelValue: string[]; // array of interest IDs
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const allInterests = ref<Interest[]>([]);

onMounted(async () => {
  try {
    const res = await api.get('/users/interests');
    allInterests.value = res.data.data;
  } catch (err) {
    console.error('Failed to load interests:', err);
  }
});

function isSelected(id: string): boolean {
  return props.modelValue.includes(id);
}

function toggleInterest(id: string) {
  if (isSelected(id)) {
    emit(
      'update:modelValue',
      props.modelValue.filter((i) => i !== id)
    );
  } else {
    if (props.modelValue.length < 10) {
      emit('update:modelValue', [...props.modelValue, id]);
    }
  }
}
</script>

<style scoped lang="scss">
.u-chip-btn {
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: var(--radius-md, 14px);
  background-color: var(--unmute-surface-raised, #161e31);
  color: var(--unmute-text-secondary, #94a3b8);
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.08)) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    background-color: var(--unmute-surface-active, #1e293b);
    color: var(--unmute-text-primary, #ffffff);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px) scale(0.97);
  }

  &.chip-selected {
    background: linear-gradient(135deg, var(--theme-primary, #6366f1), var(--theme-primary-hover, #a855f7));
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.25) !important;
    box-shadow: 0 4px 12px var(--theme-glow, rgba(99, 102, 241, 0.35)),
                0 2px 0 var(--theme-primary-dark, #4338ca);
    transform: translateY(-1px);
  }
}
</style>
