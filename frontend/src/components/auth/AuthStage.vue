<template>
  <div class="auth-stage">
    <main class="auth-column">
      <router-link to="/welcome" class="auth-brand" aria-label="Unmute home">
        <BrandMark size="2.4rem" wordmark />
      </router-link>
      <header class="auth-header">
        <h1 class="auth-title">{{ title }}</h1>
        <p class="auth-subtitle">{{ subtitle }}</p>
      </header>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import BrandMark from '../layout/BrandMark.vue';

defineProps<{ title: string; subtitle: string }>();
</script>

<style scoped lang="scss">
.auth-stage {
  min-height: 100svh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: calc(var(--unmute-safe-top) + 2rem) 1.25rem calc(var(--unmute-safe-bottom) + 2rem);
  background:
    radial-gradient(120% 60% at 50% -10%, rgba(244, 51, 111, 0.12) 0%, transparent 60%),
    var(--unmute-bg);

  @media (min-width: 576px) {
    align-items: center;
  }
}

.auth-column {
  width: 100%;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 576px) {
    max-width: 27rem;
    padding: 2.5rem 2.25rem;
    background: var(--unmute-surface);
    border: 1px solid var(--unmute-glass-border);
    border-radius: var(--unmute-radius-xl);
    box-shadow: var(--unmute-shadow-lg);
  }
}

.auth-brand {
  align-self: center;
  text-decoration: none;
  border-radius: var(--unmute-radius-sm);
}

.auth-header {
  text-align: center;
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.35rem;
  color: var(--unmute-text-primary);
}

.auth-subtitle {
  margin: 0;
  color: var(--unmute-text-muted);
}
</style>
