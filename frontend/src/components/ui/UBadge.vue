<template>
  <span
    class="u-badge inline-flex items-center gap-1 font-semibold rounded-full select-none transition-colors"
    :class="[variantClass, sizeClass]"
  >
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full shrink-0" :class="dotClass"></span>
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
      return 'bg-brand-500/20 text-brand-300 border border-brand-500/30';
    case 'glow':
      return 'bg-gradient-to-r from-brand-600 to-pink-600 text-white shadow-sm shadow-brand-500/30';
    case 'success':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'warning':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'danger':
      return 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
    case 'glass':
      return 'surface-glass text-slate-200 border-white/10';
    case 'outline':
      return 'bg-transparent text-slate-300 border border-slate-700';
    case 'secondary':
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-750';
  }
});

const sizeClass = computed(() => {
  switch (props.size) {
    case 'md':
      return 'px-3 py-1 text-xs';
    case 'sm':
    default:
      return 'px-2 py-0.5 text-[11px]';
  }
});

const dotClass = computed(() => {
  switch (props.variant) {
    case 'primary':
    case 'glow':
      return 'bg-brand-400';
    case 'success':
      return 'bg-emerald-400';
    case 'warning':
      return 'bg-amber-400';
    case 'danger':
      return 'bg-rose-400';
    default:
      return 'bg-slate-400';
  }
});
</script>
