<template>
  <div
    v-tilt="tilts"
    class="u-card glass-pane position-relative overflow-hidden"
    :class="[variantClass, paddingClass, { 'cursor-pointer user-select-none': interactive }]"
    @click="$emit('click', $event)"
  >
    <!-- Subtle top specular highlight for 3D realism -->
    <div
      class="u-card-specular pe-none position-absolute top-0 start-0 end-0"
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

// Depth cards and clickable cards lean toward the pointer (desktop, motion allowed).
const tilts = computed(() => (props.variant === 'depth3d' ? { max: 6 } : props.variant === 'interactive' ? { max: 4 } : false));

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
  border-radius: var(--unmute-radius-lg, 28px);
  color: var(--unmute-text-primary);
  transition: transform var(--unmute-transition-normal), box-shadow var(--unmute-transition-normal);
}

.u-card-default {
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-md);
}

.u-card-elevated,
.u-card-glass,
.u-card-3d {
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-lg);
}

.u-card-interactive {
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-md);
}

.u-card-interactive:hover {
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-3d-hover);
}

.u-card-specular {
  z-index: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--unmute-glass-highlight), transparent);
}
</style>
