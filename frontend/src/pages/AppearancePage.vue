<template>
  <div class="appearance-page d-flex flex-column w-100 pb-5">
    <!-- Header -->
    <header class="appearance-header d-flex align-items-center gap-2 mb-3">
      <button type="button" class="back-btn" @click="router.back()" aria-label="Go back">
        <i class="ri-arrow-left-line" aria-hidden="true"></i>
      </button>
      <h1 class="page-title mb-0">Appearance & Theme</h1>
    </header>

    <div class="appearance-body enter-rise d-flex flex-column gap-4">
      <!-- 3 Theme Cards (Light, Dark, System) -->
      <section class="theme-modes-grid">
        <button
          v-for="opt in THEME_MODES"
          :key="opt.mode"
          type="button"
          class="theme-card"
          :class="{ 'is-active': themeStore.mode === opt.mode }"
          @click="themeStore.setMode(opt.mode)"
        >
          <div class="card-icon-wrap" :class="{ 'icon-active': themeStore.mode === opt.mode }">
            <i :class="opt.icon"></i>
          </div>
          <span class="card-label">{{ opt.label }}</span>
        </button>
      </section>

      <!-- Accent Colour Section -->
      <section class="accent-section">
        <h2 class="section-title mb-1">Accent Colour</h2>
        <p class="section-subtitle mb-3">This colour is used for buttons, highlights and active elements.</p>

        <!-- 2 Rows of Swatches -->
        <div class="swatches-grid">
          <button
            v-for="preset in swatchesList"
            :key="preset.id"
            type="button"
            class="swatch-circle"
            :style="{ background: preset.gradient || preset.primary }"
            :aria-label="preset.name"
            @click="themeStore.setAccent(preset.id)"
          >
            <i v-if="themeStore.accent === preset.id" class="ri-check-line swatch-check" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <!-- Preview Section -->
      <section class="preview-section d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-1">
          <i class="ri-music-2-line preview-icon" aria-hidden="true"></i>
          <h2 class="section-title mb-0">Preview</h2>
        </div>

        <button type="button" class="preview-btn">
          Button
        </button>

        <input
          type="text"
          readonly
          value="Input field"
          class="preview-input w-100"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore, type ThemeMode, type AccentColor } from '../stores/theme';

const router = useRouter();
const themeStore = useThemeStore();

const THEME_MODES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: 'ri-sun-line' },
  { mode: 'dark', label: 'Dark', icon: 'ri-moon-line' },
  { mode: 'system', label: 'System', icon: 'ri-smartphone-line' },
];

// 12 swatches matching the 2-row layout in UX reference image
const swatchesList = computed(() => {
  return [
    { id: 'orchid' as AccentColor, name: 'Orchid', primary: '#d13cdd', gradient: 'linear-gradient(135deg, #e879f9 0%, #c026d3 100%)' },
    { id: 'pink' as AccentColor, name: 'Pink', primary: '#e5195f', gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' },
    { id: 'coral' as AccentColor, name: 'Coral', primary: '#f0506e', gradient: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)' },
    { id: 'blush' as AccentColor, name: 'Blush', primary: '#f7a1c0', gradient: 'linear-gradient(135deg, #fda4af 0%, #fb7185 100%)' },
    { id: 'tangerine' as AccentColor, name: 'Tangerine', primary: '#f15a24', gradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)' },
    { id: 'magenta' as AccentColor, name: 'Magenta', primary: '#d63384', gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)' },
    { id: 'violet' as AccentColor, name: 'Violet', primary: '#7c3aed', gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' },
    { id: 'blue' as AccentColor, name: 'Blue', primary: '#2563eb', gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)' },
    { id: 'sky' as AccentColor, name: 'Sky', primary: '#0ea5e9', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' },
    { id: 'green' as AccentColor, name: 'Green', primary: '#22a55a', gradient: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)' },
  ];
});
</script>

<style scoped lang="scss">
.appearance-page {
  max-width: 28rem;
  margin: 0 auto;
}

.appearance-header {
  padding: 0.5rem 0.25rem;
}

.page-title {
  font-family: var(--unmute-font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
  letter-spacing: -0.02em;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--unmute-text-primary);
  font-size: 1.35rem;
  cursor: pointer;
  transition: background var(--unmute-transition-fast);

  &:hover {
    background: var(--unmute-surface-raised);
  }
}

/* 3 Theme Mode Cards */
.theme-modes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem 0.5rem;
  background: var(--unmute-surface);
  border: 1.5px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-lg);
  box-shadow: 0 2px 8px -2px rgba(70, 25, 55, 0.04);
  cursor: pointer;
  transition: all var(--unmute-transition-fast);

  &.is-active {
    border-color: var(--unmute-primary);
    background: #fff5f8;
    box-shadow: 0 4px 14px -4px rgba(225, 29, 72, 0.25);
  }
}

.card-icon-wrap {
  font-size: 1.5rem;
  color: var(--unmute-text-muted);
  line-height: 1;

  &.icon-active {
    color: var(--unmute-primary);
  }
}

.card-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.section-subtitle {
  font-size: 0.8125rem;
  color: var(--unmute-text-muted);
}

/* Swatches Grid: 2 rows */
.swatches-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
}

.swatch-circle {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: transform var(--unmute-transition-fast);

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.swatch-check {
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 800;
}

/* Preview Section */
.preview-icon {
  color: var(--unmute-primary);
  font-size: 1rem;
}

.preview-btn {
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: var(--unmute-radius-pill);
  border: none;
  background: var(--unmute-primary-gradient);
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 700;
  box-shadow: 0 8px 20px -4px rgba(225, 29, 72, 0.35);
  cursor: pointer;
}

.preview-input {
  padding: 0.8rem 1rem;
  border-radius: var(--unmute-radius-md);
  border: 1px solid var(--unmute-glass-border);
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  font-size: 0.875rem;
  outline: none;
}
</style>
