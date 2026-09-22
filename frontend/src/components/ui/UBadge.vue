<template>
  <span
    class="u-badge d-inline-flex align-items-center gap-1 fw-semibold rounded-pill user-select-none transition-colors"
    :class="[variantClass, sizeClass]"
  >
    <span v-if="dot" class="rounded-circle flex-shrink-0" :class="dotClass" style="width: 0.35rem; height: 0.35rem;"></span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'glass' | 'outline' | 'glow';
type BadgeSize = 'sm' | 'md';

const props = withDefaults(
  defineProps<{
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
  }>(),
  {
    variant: 'secondary',
    size: 'sm',
    dot: false,
  }
);

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'u-badge-primary border';
    case 'glow':
      return 'u-badge-glow text-white';
    case 'success':
      return 'bg-success bg-opacity-10 text-success border border-success border-opacity-25 shadow-sm';
    case 'warning':
      return 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 shadow-sm';
    case 'danger':
      return 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 shadow-sm';
    case 'glass':
      return 'surface-glass text-light border border-white border-opacity-10 shadow-sm';
    case 'outline':
      return 'bg-transparent text-secondary border border-secondary';
    case 'secondary':
    default:
      return 'surface-raised text-secondary border border-white border-opacity-10 shadow-sm';
  }
});

const sizeClass = computed(() => {
  switch (props.size) {
    case 'md':
      return 'px-2.5 py-1 small';
    case 'sm':
    default:
      return 'px-2 py-0.5';
  }
});

const dotClass = computed(() => {
  switch (props.variant) {
    case 'primary':
    case 'glow':
      return 'bg-primary';
    case 'success':
      return 'bg-success';
    case 'warning':
      return 'bg-warning';
    case 'danger':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
});
</script>

<style scoped>
.u-badge {
  box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.2);
}

.u-badge-primary {
  background: var(--unmute-primary-surface);
  color: var(--unmute-primary-light);
  border-color: var(--unmute-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.u-badge-glow {
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
</style>

