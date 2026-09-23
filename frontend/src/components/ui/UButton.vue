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
      return 'u-btn-danger text-white';
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
    return 'p-2 rounded-circle';
  }
  switch (props.size) {
    case 'sm':
      return 'px-3 py-1.5 small rounded-pill';
    case 'lg':
      return 'px-4 py-3 rounded-pill';
    case 'md':
    default:
      return 'px-3 py-2 small rounded-pill';
  }
});
</script>

<style scoped>
.u-button {
  overflow: hidden;
  isolation: isolate;
  white-space: nowrap;
  letter-spacing: 0.005em;
  transition: transform var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast),
    background var(--unmute-transition-fast), color var(--unmute-transition-fast), filter var(--unmute-transition-fast);
}

/* A curved-glass sheen over the top half of filled buttons */
.u-btn-primary::before,
.u-btn-danger::before {
  content: '';
  position: absolute;
  inset: 0 0 50% 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
  pointer-events: none;
  z-index: -1;
}

.u-btn-primary {
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.12);
}

.u-btn-danger {
  background: linear-gradient(135deg, #ff7aa0 0%, var(--unmute-danger) 100%);
  box-shadow: 0 12px 30px -12px var(--unmute-danger), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.u-btn-primary:hover:not(:disabled),
.u-btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.06) saturate(1.05);
}

.u-btn-primary:active:not(:disabled),
.u-btn-danger:active:not(:disabled) {
  transform: translateY(1px) scale(0.985);
}

/* Glass pills */
.u-btn-secondary,
.u-btn-glass,
.u-btn-icon {
  background: var(--unmute-glass-surface);
  backdrop-filter: blur(20px) saturate(170%);
  -webkit-backdrop-filter: blur(20px) saturate(170%);
  color: var(--unmute-text-primary);
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-sm);
}

.u-btn-icon {
  color: var(--unmute-text-secondary);
}

.u-btn-secondary:hover:not(:disabled),
.u-btn-glass:hover:not(:disabled),
.u-btn-icon:hover:not(:disabled) {
  transform: translateY(-2px);
  color: var(--unmute-text-primary);
  background: var(--unmute-glass-strong);
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-md);
}

.u-btn-secondary:active:not(:disabled),
.u-btn-glass:active:not(:disabled),
.u-btn-icon:active:not(:disabled) {
  transform: translateY(1px) scale(0.985);
}

.u-btn-ghost {
  background: transparent;
  color: var(--unmute-text-secondary);
}

.u-btn-ghost:hover:not(:disabled) {
  background: var(--unmute-glass-surface);
  color: var(--unmute-text-primary);
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
