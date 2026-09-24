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
  white-space: nowrap;
  letter-spacing: 0.005em;
  min-height: 2.25rem;
  transition: box-shadow var(--unmute-transition-fast), background var(--unmute-transition-fast),
    color var(--unmute-transition-fast), filter var(--unmute-transition-fast), transform var(--unmute-transition-fast);
}

.u-button.px-4.py-3 {
  min-height: 3.25rem;
  font-size: 1rem;
}

.u-btn-primary {
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary);
}

.u-btn-danger {
  background: var(--unmute-danger);
  box-shadow: 0 8px 18px -10px var(--unmute-danger);
}

.u-btn-primary:hover:not(:disabled),
.u-btn-danger:hover:not(:disabled) {
  filter: brightness(1.06);
}

.u-button:active:not(:disabled) {
  transform: scale(0.98);
}

/* White pills with a hairline border */
.u-btn-secondary,
.u-btn-glass,
.u-btn-icon {
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  border: 1px solid var(--unmute-glass-border) !important;
  box-shadow: var(--unmute-shadow-sm);
}

.u-btn-icon {
  color: var(--unmute-text-secondary);
}

.u-btn-secondary:hover:not(:disabled),
.u-btn-glass:hover:not(:disabled),
.u-btn-icon:hover:not(:disabled) {
  color: var(--unmute-text-primary);
  border-color: var(--unmute-glass-border-hover) !important;
  background: var(--unmute-surface-raised);
}

.u-btn-ghost {
  background: transparent;
  color: var(--unmute-text-secondary);
}

.u-btn-ghost:hover:not(:disabled) {
  background: var(--unmute-surface-overlay);
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

@media (prefers-reduced-motion: reduce) {
  .u-button:active:not(:disabled) {
    transform: none;
  }
}
</style>
