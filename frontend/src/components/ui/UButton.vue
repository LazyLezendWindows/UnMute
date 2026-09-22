<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="u-button inline-flex items-center justify-center font-semibold transition-all relative select-none"
    :class="[
      variantClass,
      sizeClass,
      { 'opacity-50 cursor-not-allowed pointer-events-none': disabled || loading },
      { 'w-full': block },
    ]"
    @click="$emit('click', $event)"
  >
    <!-- Loading spinner -->
    <span
      v-if="loading"
      class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2 shrink-0"
    ></span>

    <!-- Leading Icon -->
    <component
      :is="icon"
      v-if="icon && !loading"
      class="shrink-0"
      :class="size === 'sm' ? 'w-3.5 h-3.5 mr-1.5' : size === 'lg' ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-2'"
    />

    <!-- Slot content -->
    <slot />

    <!-- Trailing Icon -->
    <component
      :is="iconRight"
      v-if="iconRight"
      class="shrink-0"
      :class="size === 'sm' ? 'w-3.5 h-3.5 ml-1.5' : size === 'lg' ? 'w-5 h-5 ml-2' : 'w-4 h-4 ml-2'"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    icon?: any;
    iconRight?: any;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
  }
);

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-gradient-to-r from-brand-600 via-purple-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white shadow-lg shadow-brand-500/25 border border-white/10 hover:shadow-brand-500/40';
    case 'secondary':
      return 'bg-slate-800 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/80 shadow-sm';
    case 'glass':
      return 'surface-glass text-slate-100 hover:bg-slate-800/80 hover:text-white border-white/10 shadow-md';
    case 'danger':
      return 'bg-rose-600/90 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 border border-rose-500/30';
    case 'ghost':
      return 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100';
    case 'icon':
      return 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-full border border-slate-700/50 shadow-sm';
    default:
      return '';
  }
});

const sizeClass = computed(() => {
  if (props.variant === 'icon') {
    return 'p-2 rounded-xl';
  }
  switch (props.size) {
    case 'sm':
      return 'px-3 py-1.5 text-xs rounded-xl';
    case 'lg':
      return 'px-6 py-3.5 text-sm rounded-2xl';
    case 'md':
    default:
      return 'px-4 py-2.5 text-xs sm:text-sm rounded-xl';
  }
});
</script>

<style scoped>
.u-button {
  transform: translateY(0);
  transition: transform var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast), background var(--unmute-transition-fast);
}

.u-button:hover:not(:disabled) {
  transform: translateY(-1.5px);
}

.u-button:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.985);
}
</style>
