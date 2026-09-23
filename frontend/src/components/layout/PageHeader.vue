<template>
  <header class="page-header d-flex align-items-end justify-content-between gap-3 flex-wrap">
    <div class="min-w-0">
      <h1 class="page-title mb-1">{{ title }}</h1>
      <p v-if="subtitle" class="page-subtitle mb-0">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="d-flex align-items-center gap-2 flex-shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: clamp(1.9rem, 3.2vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--unmute-text-primary);
}

.page-subtitle {
  color: var(--unmute-text-muted);
  font-size: 0.95rem;
}

.min-w-0 {
  min-width: 0;
}
</style>
