<template>
  <div class="welcome">
    <main class="welcome-inner">
      <header class="welcome-brand">
        <h1 class="visually-hidden">Unmute</h1>
        <BrandMark size="6.5rem" wordmark stacked />
        <p class="welcome-tagline">Real People<br />Real Conversations</p>
      </header>

      <!-- Decorative: two people getting to know each other. -->
      <div class="welcome-art" aria-hidden="true">
        <span class="art-glow"></span>
        <span class="art-heart art-heart-1"><i class="ri-heart-3-fill"></i></span>
        <span class="art-heart art-heart-2"><i class="ri-heart-3-fill"></i></span>
        <span class="art-heart art-heart-3"><i class="ri-heart-3-fill"></i></span>

        <div class="art-row art-row-left">
          <span class="art-avatar art-avatar-a"><i class="ri-user-smile-fill"></i></span>
          <span class="art-bubble art-bubble-in">You like hiking too? 🏔️</span>
        </div>
        <div class="art-row art-row-right">
          <span class="art-bubble art-bubble-out">Every weekend! Coffee first? ☕</span>
          <span class="art-avatar art-avatar-b"><i class="ri-user-heart-fill"></i></span>
        </div>
        <div class="art-row art-row-left">
          <span class="art-avatar art-avatar-a"><i class="ri-user-smile-fill"></i></span>
          <span class="art-bubble art-bubble-in art-typing"><span></span><span></span><span></span></span>
        </div>
      </div>

      <div class="welcome-actions">
        <router-link to="/register" class="welcome-start">
          Get Started
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </router-link>
        <p class="welcome-signin">
          Already have an account?
          <router-link to="/login">Sign in</router-link>
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import BrandMark from '../components/layout/BrandMark.vue';
</script>

<style scoped lang="scss">
.welcome {
  min-height: 100svh;
  display: flex;
  justify-content: center;
  padding: calc(var(--unmute-safe-top) + 1.5rem) 1.5rem calc(var(--unmute-safe-bottom) + 1.5rem);
  background: var(--unmute-hero-bg);
}

.welcome-inner {
  width: 100%;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
}

.welcome-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: clamp(0.5rem, 5vh, 3rem);
}

.welcome-tagline {
  margin: 1rem 0 0;
  font-family: var(--unmute-font-display);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--unmute-brand-tagline);
}

// Illustration: a framed conversation, sized from the viewport height so the page never scrolls.
.welcome-art {
  position: relative;
  flex: 1;
  min-height: 12rem;
  max-height: 21rem;
  width: 100%;
  max-width: 22rem;
  align-self: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.875rem;
  padding: 1.25rem 1rem;
  border-radius: var(--unmute-radius-xl);
  background: var(--unmute-hero-panel);
  border: 1px solid var(--unmute-hero-panel-border);
  box-shadow: 0 24px 50px -30px rgba(90, 20, 70, 0.45);
}

.art-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(70% 60% at 50% 50%, rgba(244, 51, 111, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.art-row {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;

  &.art-row-right {
    justify-content: flex-end;
  }
}

.art-avatar {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #fff;
  box-shadow: 0 6px 14px -6px rgba(90, 20, 70, 0.5);
}

.art-avatar-a {
  background: linear-gradient(135deg, #ff8fb5, #e3175c);
}

.art-avatar-b {
  background: linear-gradient(135deg, #b85bd1, #7d1b8a);
}

.art-bubble {
  max-width: 74%;
  padding: 0.7rem 1rem;
  border-radius: 1.15rem;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.35;
  box-shadow: 0 8px 20px -12px rgba(90, 20, 70, 0.45);
}

.art-bubble-in {
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  border-bottom-left-radius: 0.35rem;
}

.art-bubble-out {
  background: linear-gradient(100deg, #e3175c 0%, #8e1d8c 100%);
  color: #fff;
  border-bottom-right-radius: 0.35rem;
}

.art-typing {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.8rem 0.9rem;

  span {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: #d6a3c2;
    animation: typing 1.2s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.15s;
    }
    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
}

.art-heart {
  position: absolute;
  color: #f4336f;
  opacity: 0.8;

  &.art-heart-1 {
    top: -0.9rem;
    right: 1.5rem;
    font-size: 1.75rem;
    transform: rotate(12deg);
  }
  &.art-heart-2 {
    bottom: -0.6rem;
    left: 2.25rem;
    font-size: 1.2rem;
    color: #b0166f;
    transform: rotate(-10deg);
  }
  &.art-heart-3 {
    top: 40%;
    right: -0.55rem;
    font-size: 1rem;
  }
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .art-typing span {
    animation: none;
  }
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.welcome-start {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.5rem;
  border-radius: var(--unmute-radius-pill);
  font-size: 1.0625rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary);

  i {
    position: absolute;
    right: 1.25rem;
    font-size: 1.4rem;
  }

  &:hover {
    color: #fff;
    filter: brightness(1.06);
  }
}

.welcome-signin {
  margin: 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--unmute-text-secondary);

  a {
    margin-left: 0.25rem;
    font-weight: 700;
    color: var(--unmute-accent-text);
  }
}

// Short screens: a smaller logo and a two-message illustration, so nothing scrolls.
@media (max-height: 700px) {
  .welcome-brand {
    padding-top: 0;

    :deep(.brand) {
      --mark-size: 4.5rem !important;
    }
  }

  .welcome-tagline {
    margin-top: 0.5rem;
    font-size: 1rem;
  }

  .welcome-art {
    min-height: 9rem;
    padding: 1rem 0.875rem;

    .art-row:last-child {
      display: none;
    }
  }
}
</style>
