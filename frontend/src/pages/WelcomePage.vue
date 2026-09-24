<template>
  <div class="welcome">
    <main class="welcome-inner">
      <header class="welcome-brand">
        <h1 class="visually-hidden">Unmute</h1>
        <BrandMark size="6.2rem" wordmark stacked />
        <p class="welcome-tagline">Real People<br />Real Conversations</p>
      </header>

      <!-- Scenic Hero Illustration: Couple sitting on a hill at sunset -->
      <div class="welcome-hero-art" aria-hidden="true">
        <svg class="hero-svg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" fill="none">
          <defs>
            <!-- Sky Gradient -->
            <linearGradient id="sky-grad" x1="200" y1="0" x2="200" y2="320" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#fff5f9" />
              <stop offset="35%" stop-color="#fed6e8" />
              <stop offset="70%" stop-color="#e9a3c8" />
              <stop offset="100%" stop-color="#b45a98" />
            </linearGradient>

            <!-- Sunset Sun Glow -->
            <radialGradient id="sun-glow" cx="200" cy="180" r="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
              <stop offset="30%" stop-color="#ffb8db" stop-opacity="0.6" />
              <stop offset="70%" stop-color="#e5195f" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#b45a98" stop-opacity="0" />
            </radialGradient>

            <!-- Distant Mountains -->
            <linearGradient id="mountains-grad" x1="0" y1="160" x2="400" y2="240" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#c974a6" stop-opacity="0.5" />
              <stop offset="100%" stop-color="#9d4b80" stop-opacity="0.7" />
            </linearGradient>

            <!-- Midground Clouds -->
            <linearGradient id="clouds-grad-1" x1="0" y1="180" x2="0" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#f8bfdc" stop-opacity="0.4" />
            </linearGradient>

            <!-- Hill Foreground -->
            <linearGradient id="hill-grad" x1="200" y1="230" x2="200" y2="320" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#692257" />
              <stop offset="60%" stop-color="#46103b" />
              <stop offset="100%" stop-color="#2d0825" />
            </linearGradient>

            <!-- Silhouette Gradient -->
            <linearGradient id="sil-grad" x1="200" y1="190" x2="200" y2="270" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#541644" />
              <stop offset="100%" stop-color="#320b29" />
            </linearGradient>
          </defs>

          <!-- Sky Background -->
          <rect width="400" height="320" rx="32" fill="url(#sky-grad)" />

          <!-- Sun Glow -->
          <circle cx="200" cy="180" r="140" fill="url(#sun-glow)" />

          <!-- Soft Dreamy Clouds in Background -->
          <path d="M-20 180 Q40 140 100 160 Q160 140 220 165 Q280 145 350 160 Q420 140 440 180 L440 240 L-20 240 Z" fill="url(#mountains-grad)" />
          <path d="M-10 200 C30 180 80 185 120 195 C170 175 240 180 290 200 C340 185 390 195 420 210 L420 270 L-10 270 Z" fill="url(#clouds-grad-1)" />

          <!-- Rolling Sunset Hill -->
          <path d="M-20 255 Q120 225 240 240 Q340 250 420 235 L420 320 L-20 320 Z" fill="url(#hill-grad)" />

          <!-- Small Wildflower Sprigs on Hill -->
          <path d="M80 252 Q83 242 85 245 M85 245 Q88 238 90 248 M290 252 Q293 243 296 248 M310 255 Q313 246 317 251" stroke="#ffb1d3" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />

          <!-- Couple Silhouette Sitting Together -->
          <!-- Person on Left (Guy with arm around or relaxed leaning) -->
          <!-- Head & hair -->
          <ellipse cx="178" cy="207" rx="10" ry="12" fill="url(#sil-grad)" />
          <!-- Torso & shoulders -->
          <path d="M166 219 C164 227 160 245 160 256 C160 262 170 265 186 265 C196 265 198 261 198 256 C198 244 194 226 190 219 Z" fill="url(#sil-grad)" />
          <!-- Arm -->
          <path d="M166 226 C158 236 155 248 158 258 C160 260 165 259 166 255 C168 248 171 238 173 230 Z" fill="url(#sil-grad)" />

          <!-- Person on Right (Girl leaning gently towards him) -->
          <!-- Head & long hair -->
          <ellipse cx="198" cy="211" rx="9" ry="11" fill="url(#sil-grad)" />
          <!-- Long flowing hair -->
          <path d="M192 208 C192 200 205 200 208 208 C211 216 212 228 210 236 C207 242 202 244 200 240 C198 232 195 220 193 214 Z" fill="url(#sil-grad)" />
          <!-- Torso & dress/shawl -->
          <path d="M188 221 C188 230 186 246 186 258 C186 264 195 266 210 266 C220 266 223 262 222 257 C220 245 214 227 207 221 Z" fill="url(#sil-grad)" />

          <!-- Soft Floating Light Orbs -->
          <circle cx="120" cy="140" r="3" fill="#ffffff" opacity="0.6" />
          <circle cx="280" cy="130" r="2.5" fill="#ffffff" opacity="0.7" />
          <circle cx="320" cy="160" r="2" fill="#ffd1e6" opacity="0.5" />
          <circle cx="80" cy="170" r="2" fill="#ffffff" opacity="0.5" />
        </svg>
      </div>

      <div class="welcome-actions">
        <router-link to="/register" class="welcome-start">
          <span>Get Started</span>
          <span class="chevron-wrap">
            <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
          </span>
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
  padding: calc(var(--unmute-safe-top) + 1.25rem) 1.5rem calc(var(--unmute-safe-bottom) + 1.5rem);
  background: var(--unmute-bg);
}

.welcome-inner {
  width: 100%;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.25rem;
}

.welcome-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: clamp(0.25rem, 3vh, 1.5rem);
}

.welcome-tagline {
  margin: 0.75rem 0 0;
  font-family: var(--unmute-font-body);
  font-size: 1.0625rem;
  font-weight: 500;
  line-height: 1.35;
  color: #9f457e;
  letter-spacing: -0.01em;
}

.welcome-hero-art {
  position: relative;
  width: 100%;
  max-width: 22.5rem;
  align-self: center;
  border-radius: var(--unmute-radius-xl);
  overflow: hidden;
  box-shadow: 0 16px 36px -12px rgba(180, 40, 110, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.hero-svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 400 / 320;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 0.5rem;
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
  color: #ffffff;
  text-decoration: none;
  background: linear-gradient(100deg, #f4336f 0%, #e01b6a 50%, #8e1d8c 100%);
  box-shadow: 0 10px 24px -6px rgba(229, 25, 95, 0.5);
  transition: transform var(--unmute-transition-fast), filter var(--unmute-transition-fast);

  .chevron-wrap {
    position: absolute;
    right: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.35rem;
    line-height: 1;
  }

  &:hover {
    color: #ffffff;
    filter: brightness(1.05);
  }

  &:active {
    transform: scale(0.98);
  }
}

.welcome-signin {
  margin: 0;
  text-align: center;
  font-size: 0.9375rem;
  color: var(--unmute-text-secondary);

  a {
    margin-left: 0.25rem;
    font-weight: 700;
    color: var(--unmute-accent-text);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-height: 700px) {
  .welcome-brand {
    padding-top: 0;
    :deep(.brand) {
      --mark-size: 4.5rem !important;
    }
  }
  .welcome-tagline {
    margin-top: 0.4rem;
    font-size: 0.9375rem;
  }
}
</style>
