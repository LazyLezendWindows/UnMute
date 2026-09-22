<template>
  <div
    class="u-card rounded-3xl transition-all relative overflow-hidden"
    :class="[variantClass, paddingClass, { 'cursor-pointer select-none': interactive }]"
    @click="$emit('click', $event)"
  >
    <!-- Optional subtle top specular highlight for 3D realism -->
    <div class="u-card-specular pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

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
      return 'p-3 sm:p-4';
    case 'lg':
      return 'p-6 sm:p-8';
    case 'md':
    default:
      return 'p-5 sm:p-6';
  }
});
</script>

<style scoped>
.u-card {
  transform: translateY(0);
  transition: transform var(--unmute-transition-normal), box-shadow var(--unmute-transition-normal), border-color var(--unmute-transition-normal), background-color var(--unmute-transition-normal);
}

.u-card-default {
  background-color: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-md);
  color: var(--unmute-text-primary);
}

.u-card-elevated {
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-lg);
  color: var(--unmute-text-primary);
}

.u-card-glass {
  background: var(--unmute-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-lg);
  color: var(--unmute-text-primary);
}

.u-card-interactive {
  background-color: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-sm);
  color: var(--unmute-text-primary);
}

.u-card-interactive:hover {
  transform: translateY(-4px);
  border-color: var(--unmute-primary);
  box-shadow: var(--unmute-shadow-lg);
}

/* Subtle 3D perspective tilt on hover */
.u-card-3d {
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-3d);
  color: var(--unmute-text-primary);
  transform-style: preserve-3d;
  perspective: 1000px;
}

@media (hover: hover) and (pointer: fine) {
  .u-card-3d:hover {
    transform: perspective(1000px) translateY(-5px) rotateX(1deg) rotateY(-1deg);
    box-shadow: var(--unmute-shadow-3d-hover);
    border-color: var(--unmute-primary);
  }
}
</style>

