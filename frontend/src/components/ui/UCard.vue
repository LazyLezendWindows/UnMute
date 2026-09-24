<template>
  <div
    class="u-card glass-pane position-relative overflow-hidden"
    :class="[variantClass, paddingClass, { 'cursor-pointer user-select-none': interactive }]"
    @click="$emit('click', $event)"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type CardVariant = 'default' | 'glass' | 'elevated' | 'interactive' | 'depth3d';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: CardVariant;
    padding?: CardPadding;
    interactive?: boolean;
  }>(),
  {
    variant: 'default',
    padding: 'md',
    interactive: false,
  }
);

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const variantClass = computed(() => {
  switch (props.variant) {
    case 'glass':
      return 'u-card-glass';
    case 'elevated':
      return 'u-card-elevated';
    case 'interactive':
      return 'u-card-interactive';
    case 'depth3d':
      return 'u-card-3d';
    case 'default':
    default:
      return 'u-card-default';
  }
});

const paddingClass = computed(() => {
  switch (props.padding) {
    case 'none':
      return 'p-0';
    case 'sm':
      return 'p-2 p-sm-3';
    case 'lg':
      return 'p-4 p-md-5';
    case 'md':
    default:
      return 'p-3 p-sm-4';
  }
});
</script>

<style scoped>
.u-card {
  border-radius: var(--unmute-radius-lg);
  color: var(--unmute-text-primary);
  transition: box-shadow var(--unmute-transition-normal), border-color var(--unmute-transition-normal);
}

.u-card-default {
  box-shadow: var(--unmute-shadow-sm);
}

.u-card-elevated,
.u-card-glass,
.u-card-3d {
  box-shadow: var(--unmute-shadow-md);
}

.u-card-interactive {
  box-shadow: var(--unmute-shadow-sm);
}

.u-card-interactive:hover {
  border-color: var(--unmute-glass-border-hover);
  box-shadow: var(--unmute-shadow-md);
}
</style>
