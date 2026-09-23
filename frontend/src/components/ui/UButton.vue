<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="u-button d-inline-flex align-items-center justify-content-center fw-semibold transition-all position-relative user-select-none border-0"
    :class="[
      variantClass,
      sizeClass,
      { 'opacity-50 pe-none': disabled || loading },
      { 'w-100': block },
    ]"
    @click="$emit('click', $event)"
  >
    <!-- Loading spinner -->
    <span
      v-if="loading"
      class="spinner-border spinner-border-sm me-2"
      role="status"
    ></span>

    <!-- Leading Icon -->
    <component
      :is="icon"
      v-if="icon && !loading"
      class="u-button-icon flex-shrink-0"
      :class="[`u-button-icon-${size}`, size === 'sm' ? 'me-1.5' : 'me-2']"
    />

    <!-- Slot content -->
    <slot />

    <!-- Trailing Icon -->
    <component
      :is="iconRight"
      v-if="iconRight"
      class="u-button-icon flex-shrink-0"
      :class="[`u-button-icon-${size}`, size === 'sm' ? 'ms-1.5' : 'ms-2']"
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
      return 'u-btn-primary text-white';
    case 'secondary':
      return 'u-btn-secondary';
    case 'glass':
      return 'u-btn-glass';
    case 'danger':
      return 'btn-danger text-white';
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
      return 'px-3 py-1.5 small rounded-xl';
    case 'lg':
      return 'px-4 py-3 rounded-2xl';
    case 'md':
    default:
      return 'px-3 py-2 small rounded-xl';
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

.u-button-icon {
  width: 1.05rem;
  height: 1.05rem;
}

.u-button-icon-sm {
  width: 0.9rem;
  height: 0.9rem;
}

.u-button-icon-lg {
  width: 1.25rem;
  height: 1.25rem;
}
</style>

