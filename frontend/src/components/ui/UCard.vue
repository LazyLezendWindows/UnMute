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
      return 'surface-glass shadow-xl';
    case 'elevated':
      return 'bg-slate-900/90 border border-slate-800 shadow-2xl';
    case 'interactive':
      return 'bg-slate-900 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-850 shadow-lg hover:shadow-2xl';
    case 'depth3d':
      return 'u-card-3d bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl';
    case 'default':
    default:
      return 'bg-slate-900/95 border border-slate-800 shadow-xl';
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
  transition: transform var(--unmute-transition-normal), box-shadow var(--unmute-transition-normal), border-color var(--unmute-transition-normal);
}

.u-card.interactive:hover {
  transform: translateY(-4px);
}

/* Subtle 3D perspective tilt on hover */
.u-card-3d {
  transform-style: preserve-3d;
  perspective: 1000px;
}

@media (hover: hover) and (pointer: fine) {
  .u-card-3d:hover {
    transform: perspective(1000px) translateY(-5px) rotateX(1deg) rotateY(-1deg);
    box-shadow: var(--unmute-shadow-3d-hover);
    border-color: rgba(124, 58, 237, 0.35);
  }
}
</style>

