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
      return 'u-btn-primary text-white border border-white/10';
    case 'secondary':
      return 'u-btn-secondary';
    case 'glass':
      return 'u-btn-glass';
    case 'danger':
      return 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 border border-rose-500/30';
    case 'ghost':
      return 'u-btn-ghost';
    case 'icon':
      return 'u-btn-icon';
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
  transition: transform var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast), background var(--unmute-transition-fast), border-color var(--unmute-transition-fast), color var(--unmute-transition-fast), filter var(--unmute-transition-fast);
}

/* 3D Dynamic Primary Button */
.u-btn-primary {
  background: var(--unmute-primary-gradient);
  box-shadow: 0 4px 0 var(--unmute-primary-bevel), 0 10px 22px rgba(0, 0, 0, 0.35), var(--unmute-3d-specular);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.u-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--unmute-primary-bevel), 0 14px 28px rgba(0, 0, 0, 0.45), var(--unmute-3d-specular);
  filter: brightness(1.08);
}

.u-btn-primary:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--unmute-primary-bevel), 0 3px 8px rgba(0, 0, 0, 0.3), var(--unmute-3d-specular);
}

/* 3D Secondary Variant */
.u-btn-secondary {
  background-color: var(--unmute-surface-raised);
  color: var(--unmute-text-primary);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: 0 3px 0 var(--unmute-glass-border), 0 6px 16px rgba(0, 0, 0, 0.25), var(--unmute-3d-specular);
}

.u-btn-secondary:hover:not(:disabled) {
  transform: translateY(-1.5px);
  background-color: var(--unmute-surface-overlay);
  border-color: var(--unmute-glass-border-hover);
  box-shadow: 0 4.5px 0 var(--unmute-glass-border-hover), 0 8px 20px rgba(0, 0, 0, 0.3), var(--unmute-3d-specular);
}

.u-btn-secondary:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--unmute-glass-border), 0 2px 6px rgba(0, 0, 0, 0.2), var(--unmute-3d-specular);
}

/* 3D Glass Variant */
.u-btn-glass {
  background: var(--unmute-glass-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: var(--unmute-text-primary);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: 0 3px 0 var(--unmute-glass-border), 0 6px 16px rgba(0, 0, 0, 0.2), var(--unmute-3d-specular);
}

.u-btn-glass:hover:not(:disabled) {
  transform: translateY(-1.5px);
  border-color: var(--unmute-glass-border-hover);
  box-shadow: 0 4.5px 0 var(--unmute-glass-border-hover), 0 8px 20px rgba(0, 0, 0, 0.25), var(--unmute-3d-specular);
}

.u-btn-glass:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--unmute-glass-border), 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Dynamic Ghost Variant */
.u-btn-ghost {
  background: transparent;
  color: var(--unmute-text-secondary);
  border: 1px solid transparent;
}

.u-btn-ghost:hover:not(:disabled) {
  background-color: var(--unmute-surface-raised);
  color: var(--unmute-text-primary);
  border-color: var(--unmute-glass-border);
  transform: translateY(-1px);
}

.u-btn-ghost:active:not(:disabled) {
  transform: translateY(1px);
}

/* 3D Icon Variant */
.u-btn-icon {
  background-color: var(--unmute-surface-raised);
  color: var(--unmute-text-secondary);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: 0 3px 0 var(--unmute-glass-border), 0 4px 12px rgba(0, 0, 0, 0.2), var(--unmute-3d-specular);
}

.u-btn-icon:hover:not(:disabled) {
  transform: translateY(-1.5px);
  color: var(--unmute-text-primary);
  border-color: var(--unmute-primary);
  box-shadow: 0 4px 0 var(--unmute-primary), 0 6px 16px rgba(0, 0, 0, 0.3), var(--unmute-3d-specular);
}

.u-btn-icon:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--unmute-glass-border), 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>

