<template>
  <div class="auth-stage min-vh-100 flex-shrink-0 position-relative u-page">
    <SpatialScene mode="hero" />

    <div class="auth-grid position-relative">
      <!-- Hero: the 3D sculpture renders behind this column -->
      <section class="auth-hero d-flex flex-column justify-content-end justify-content-md-center">
        <div class="hero-copy">
          <div class="d-flex align-items-center gap-2 mb-3">
            <BrandMark size="2.4rem" />
            <span class="hero-wordmark text-chrome">Unmute</span>
          </div>
          <p class="hero-lead d-none d-md-block">Conversations first.<br />Connections that feel real.</p>
          <ul class="hero-points list-unstyled d-none d-md-flex flex-column gap-2 mb-0">
            <li><i class="ri-shield-check-line" aria-hidden="true"></i> Verified 18+ community</li>
            <li><i class="ri-map-pin-2-line" aria-hidden="true"></i> Your exact location is never shared</li>
            <li><i class="ri-chat-smile-2-line" aria-hidden="true"></i> Matches start from shared interests</li>
          </ul>
        </div>
      </section>

      <!-- Form pane -->
      <section class="auth-panel d-flex align-items-center justify-content-center">
        <div class="auth-pane glass-pane glass-pane-strong w-100">
          <header class="mb-4">
            <h1 class="auth-title mb-1">{{ title }}</h1>
            <p class="auth-subtitle mb-0">{{ subtitle }}</p>
          </header>
          <slot />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import SpatialScene from '../scene/SpatialScene.vue';
import BrandMark from '../layout/BrandMark.vue';

defineProps<{ title: string; subtitle: string }>();
</script>

<style scoped lang="scss">
.auth-grid {
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-rows: minmax(15rem, 34vh) auto;

  @media (min-width: 768px) {
    grid-template-rows: none;
    grid-template-columns: 1.1fr minmax(24rem, 30rem);
    gap: 2rem;
    padding: 2rem 3rem;
  }
}

.auth-hero {
  padding: 1.25rem 1.25rem 1rem;

  @media (min-width: 768px) {
    padding: 0;
    align-items: flex-start;
  }
}

.hero-copy {
  @media (min-width: 768px) {
    margin-top: auto;
    margin-bottom: 3rem;
  }
}

.hero-wordmark {
  font-family: var(--unmute-font-display);
  font-weight: 800;
  font-size: 1.6rem;
  letter-spacing: -0.03em;
}

.hero-lead {
  font-family: var(--unmute-font-display);
  font-weight: 700;
  font-size: clamp(2rem, 3.6vw, 3.25rem);
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: var(--unmute-text-primary);
  margin-bottom: 1.5rem;
}

.hero-points li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--unmute-text-secondary);

  i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    color: var(--unmute-accent-text);
    background: var(--unmute-glass-surface);
    box-shadow: var(--unmute-glass-edge);
  }
}

.auth-panel {
  padding: 0 1rem 2rem;

  @media (min-width: 768px) {
    padding: 0;
  }
}

.auth-pane {
  max-width: 30rem;
  padding: 2rem 1.5rem;
  border-radius: var(--unmute-radius-xl);

  @media (min-width: 768px) {
    padding: 2.5rem 2.25rem;
  }
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
}

.auth-subtitle {
  color: var(--unmute-text-muted);
}
</style>
