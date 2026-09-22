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
      return 'u-badge-primary border';
    case 'glow':
      return 'u-badge-glow text-white';
    case 'success':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm';
    case 'warning':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm';
    case 'danger':
      return 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm';
    case 'glass':
      return 'surface-glass text-slate-200 border-white/10 shadow-sm';
    case 'outline':
      return 'bg-transparent text-slate-300 border border-slate-700';
    case 'secondary':
    default:
      return 'surface-raised text-slate-300 border border-white/5 shadow-sm';
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

