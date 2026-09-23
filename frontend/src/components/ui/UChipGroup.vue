<template>
  <div
    class="u-chip-group d-flex flex-wrap gap-2"
    role="radiogroup"
    :aria-label="label"
    :aria-disabled="disabled || undefined"
    @keydown="onKeydown"
  >
    <button
      v-for="(option, index) in options"
      :key="String(option.value)"
      ref="buttons"
      type="button"
      role="radio"
      :aria-checked="option.value === modelValue"
      :tabindex="index === focusIndex ? 0 : -1"
      :disabled="disabled || option.disabled"
      :title="option.title"
      class="u-chip-group-option d-inline-flex align-items-center px-3 py-1 small fw-semibold rounded-pill user-select-none"
      :class="{ 'is-selected': option.value === modelValue }"
      @click="choose(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="V extends string | number | null">
import { computed, ref } from 'vue';

export interface ChipOption<Value> {
  value: Value;
  label: string;
  title?: string;
  disabled?: boolean;
}

const props = defineProps<{
  modelValue: V;
  options: ChipOption<V>[];
  /** Accessible name for the group. */
  label: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: V): void }>();

const buttons = ref<HTMLButtonElement[]>([]);

// Roving tabindex: the group is one tab stop; arrow keys move between options.
const focusIndex = computed(() => {
  const selected = props.options.findIndex((o) => o.value === props.modelValue);
  return selected >= 0 ? selected : 0;
});

function choose(value: V) {
  if (value !== props.modelValue) emit('update:modelValue', value);
}

function onKeydown(event: KeyboardEvent) {
  const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
  if (!delta) return;
  event.preventDefault();
  const enabled = props.options.map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled);
  if (!enabled.length) return;
  const current = enabled.findIndex(({ i }) => i === focusIndex.value);
  const next = enabled[(current + delta + enabled.length) % enabled.length];
  choose(next.o.value);
  buttons.value[next.i]?.focus();
}
</script>

<style scoped lang="scss">
.u-chip-group-option {
  background: var(--unmute-glass-surface);
  color: var(--unmute-text-secondary);
  border: 0;
  box-shadow: var(--unmute-glass-edge);
  transition: transform var(--unmute-transition-fast), background var(--unmute-transition-fast),
    color var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast);

  &:hover:not(:disabled) {
    color: var(--unmute-text-primary);
    border-color: var(--unmute-glass-border-hover);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--unmute-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &.is-selected {
    background: var(--unmute-primary-gradient);
    color: #fff;
    box-shadow: var(--unmute-glow-primary), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
}
</style>
