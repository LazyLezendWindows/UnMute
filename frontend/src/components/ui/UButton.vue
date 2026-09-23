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
  overflow: hidden;
  white-space: nowrap;
  isolation: isolate;
  letter-spacing: 0.01em;
  transform: translateY(0);
  transition: transform var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast),
    background var(--unmute-transition-fast), color var(--unmute-transition-fast), filter var(--unmute-transition-fast);
}

/* Primary: neon gradient slab with bevel, glow, and a light sweep on hover */
.u-btn-primary {
  background: var(--unmute-primary-gradient);
  background-size: 140% 100%;
  box-shadow: 0 3px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.u-btn-primary::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: translateX(-120%) skewX(-20deg);
  pointer-events: none;
  z-index: -1;
}

.u-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  background-position: 100% 0;
  box-shadow: 0 5px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), 0 18px 40px -10px var(--unmute-primary),
    var(--unmute-3d-specular);
}

.u-btn-primary:hover:not(:disabled)::after {
  animation: shine-sweep 900ms ease;
}

.u-btn-primary:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary);
}

/* Secondary & glass: frosted panels with a lit edge */
.u-btn-secondary,
.u-btn-glass {
  background: var(--unmute-glass-surface);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: var(--unmute-text-primary);
  box-shadow: inset 0 0 0 1px var(--unmute-glass-border), 0 3px 0 rgba(0, 0, 0, 0.25), var(--unmute-3d-specular);
}

.u-btn-secondary:hover:not(:disabled),
.u-btn-glass:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 1px var(--unmute-glass-border-hover), 0 4px 0 rgba(0, 0, 0, 0.25), var(--unmute-glow-primary);
}

.u-btn-secondary:active:not(:disabled),
.u-btn-glass:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 1px var(--unmute-glass-border), 0 1px 0 rgba(0, 0, 0, 0.25);
}

/* Ghost: text only until hovered */
.u-btn-ghost {
  background: transparent;
  color: var(--unmute-text-secondary);
}

.u-btn-ghost:hover:not(:disabled) {
  background: var(--unmute-primary-surface);
  color: var(--unmute-text-primary);
}

/* Icon */
.u-btn-icon {
  background: var(--unmute-glass-surface);
  color: var(--unmute-text-secondary);
  box-shadow: inset 0 0 0 1px var(--unmute-glass-border), var(--unmute-3d-specular);
}

.u-btn-icon:hover:not(:disabled) {
  transform: translateY(-2px);
  color: var(--unmute-accent-text);
  box-shadow: inset 0 0 0 1px var(--unmute-glass-border-hover), var(--unmute-glow-primary);
}

.u-btn-icon:active:not(:disabled) {
  transform: translateY(1px);
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
