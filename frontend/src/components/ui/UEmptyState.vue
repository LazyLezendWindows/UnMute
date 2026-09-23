<template>
  <div class="u-empty-state text-center py-5 px-3 max-w-md mx-auto d-flex flex-column align-items-center justify-content-center position-relative">
    <!-- Soft ambient glow background blob -->
    <div class="empty-glow position-absolute rounded-circle pointer-events-none"></div>

    <!-- Icon container with subtle float -->
    <div class="empty-icon-container d-flex align-items-center justify-content-center mb-3 enter-rise">
      <component :is="icon" v-if="icon" class="empty-icon" />
      <slot name="icon" v-else />
    </div>

    <!-- Title & Description -->
    <h3 class="fs-5 fw-bold mb-2 font-display u-text-primary">
      {{ title }}
    </h3>
    <p class="fs-6 max-w-xs mx-auto mb-4 u-text-muted">
      {{ description }}
    </p>

    <!-- Action Slot -->
    <div v-if="$slots.action" class="d-flex flex-wrap align-items-center justify-content-center gap-2">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  icon?: any;
}>();
</script>

<style scoped lang="scss">
.empty-glow {
  width: 10rem;
  height: 10rem;
  background: var(--unmute-primary-surface);
  filter: blur(48px);
  z-index: 0;
}

.empty-icon-container {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: var(--radius-xl, 24px);
  background: var(--unmute-surface-raised, #131b2e);
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.1));
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
  color: var(--unmute-accent-text);
  position: relative;
  z-index: 1;
}

.empty-icon {
  width: 2rem;
  height: 2rem;
}
</style>
