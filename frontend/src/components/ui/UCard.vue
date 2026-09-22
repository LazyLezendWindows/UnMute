<template>
  <div
    class="u-card rounded-3xl transition-all position-relative overflow-hidden"
    :class="[variantClass, paddingClass, { 'cursor-pointer user-select-none': interactive }]"
    @click="$emit('click', $event)"
  >
    <!-- Optional subtle top specular highlight for 3D realism -->
    <div
      class="u-card-specular pe-none position-absolute top-0 start-0 end-0"
      style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);"
    ></div>

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
  transform: translateY(0);
  transition: transform var(--unmute-transition-normal), box-shadow var(--unmute-transition-normal), border-color var(--unmute-transition-normal), background-color var(--unmute-transition-normal);
}

.u-card-default {
  background-color: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-md), var(--unmute-3d-card-rim);
  color: var(--unmute-text-primary);
}

.u-card-elevated {
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-3d), var(--unmute-3d-card-rim);
  color: var(--unmute-text-primary);
}

.u-card-glass {
  background: var(--unmute-glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-3d), var(--unmute-3d-card-rim);
  color: var(--unmute-text-primary);
}

.u-card-interactive {
  background-color: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-sm), var(--unmute-3d-card-rim);
  color: var(--unmute-text-primary);
}

.u-card-interactive:hover {
  transform: translateY(-5px) scale(1.01);
  border-color: var(--unmute-primary);
  box-shadow: var(--unmute-shadow-3d-hover), var(--unmute-3d-card-rim);
}

/* 3D perspective tilt on hover */
.u-card-3d {
  background-color: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-3d), var(--unmute-3d-card-rim);
  color: var(--unmute-text-primary);
  transform-style: preserve-3d;
  perspective: 1200px;
}

@media (hover: hover) and (pointer: fine) {
  .u-card-3d:hover {
    transform: perspective(1200px) translateY(-6px) rotateX(1.5deg) rotateY(-1.5deg);
    box-shadow: var(--unmute-shadow-3d-hover), var(--unmute-3d-card-rim);
    border-color: var(--unmute-primary);
  }
}
</style>

