<template>
  <div class="d-flex flex-column gap-4 max-w-xl mx-auto w-100">
    <!-- Page Header -->
    <div>
      <h1 class="font-display fs-3 fw-bolder tracking-tight mb-1" style="color: var(--unmute-text-primary);">
        Settings
      </h1>
      <p class="small mb-0" style="color: var(--unmute-text-muted);">
        Personalize your appearance, dynamic theme colors, and privacy preferences
      </p>
    </div>

    <!-- Appearance: Mode (Dark vs Light/White) -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2">
          <i v-if="!themeStore.isDarkMode" class="ri-sun-line fs-5 text-warning"></i>
          <i v-else class="ri-moon-line fs-5" style="color: var(--unmute-primary-light);"></i>
          <h2 class="font-display fw-bold fs-6 mb-0" style="color: var(--unmute-text-primary);">
            Appearance & Theme Mode
          </h2>
        </div>

        <p class="small mb-2" style="color: var(--unmute-text-secondary);">
          Choose between crystalline white mode (default), deep 3D obsidian dark mode, or automatic system adaptation.
        </p>

        <!-- Segmented Mode Selector with 3D tactile buttons -->
        <div class="row g-2 p-1 surface-raised rounded-3 border" style="border-color: var(--unmute-glass-border) !important;">
          <div class="col-4">
            <button
              type="button"
              @click="themeStore.setMode('light')"
              class="theme-mode-btn w-100 d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2 py-2 px-2 border-0 rounded-3 small fw-bold user-select-none"
              :style="themeStore.mode === 'light' ? { background: 'var(--unmute-surface)', color: 'var(--unmute-text-primary)', border: '1px solid var(--unmute-glass-border-hover) !important', boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
            >
              <i class="ri-sun-line text-warning fs-6"></i>
              <span>Light (White)</span>
            </button>
          </div>

          <div class="col-4">
            <button
              type="button"
              @click="themeStore.setMode('dark')"
              class="theme-mode-btn w-100 d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2 py-2 px-2 border-0 rounded-3 small fw-bold user-select-none"
              :style="themeStore.mode === 'dark' ? { background: 'var(--unmute-surface)', color: 'var(--unmute-text-primary)', border: '1px solid var(--unmute-glass-border-hover) !important', boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
            >
              <i class="ri-moon-line fs-6" style="color: var(--unmute-primary);"></i>
              <span>Dark Mode</span>
            </button>
          </div>

          <div class="col-4">
            <button
              type="button"
              @click="themeStore.setMode('system')"
              class="theme-mode-btn w-100 d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2 py-2 px-2 border-0 rounded-3 small fw-bold user-select-none"
              :style="themeStore.mode === 'system' ? { background: 'var(--unmute-surface)', color: 'var(--unmute-text-primary)', border: '1px solid var(--unmute-glass-border-hover) !important', boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
            >
              <i class="ri-computer-line text-info fs-6"></i>
              <span>System Auto</span>
            </button>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Dynamic Theme Accent Colors -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <i class="ri-palette-line fs-5" style="color: var(--unmute-primary);"></i>
            <h2 class="font-display fw-bold fs-6 mb-0" style="color: var(--unmute-text-primary);">
              Dynamic Accent Theme
            </h2>
          </div>
          <span
            class="badge rounded-pill text-white shadow-sm user-select-none font-display px-3 py-2"
            :style="{ background: themeStore.activePreset.gradient, boxShadow: '0 2px 0 ' + themeStore.activePreset.bevel + ', ' + themeStore.activePreset.glow + ', var(--unmute-3d-specular)' }"
          >
            {{ themeStore.activePreset.name }}
          </span>
        </div>

        <p class="small mb-1" style="color: var(--unmute-text-secondary);">
          Choose an electric theme preset. All cards, buttons, 3D bottom bevels, glow borders, and tabs will instantly re-skin in real time.
        </p>

        <!-- 6-Palette 3D Grid using Bootstrap row & cols -->
        <div class="row g-3 pt-2">
          <div
            v-for="preset in themeStore.presets"
            :key="preset.id"
            class="col-6 col-sm-4"
          >
            <button
              type="button"
              @click="themeStore.setAccent(preset.id)"
              class="preset-card-btn w-100 p-3 rounded-4 surface-raised d-flex flex-column align-items-center gap-2 text-center user-select-none border"
              :class="themeStore.accent === preset.id ? 'preset-active' : ''"
              :style="
                themeStore.accent === preset.id
                  ? {
                      borderColor: preset.primary + ' !important',
                      boxShadow: '0 5px 0 ' + preset.bevel + ', ' + preset.glow + ', var(--unmute-3d-specular)',
                      transform: 'translateY(-3px)'
                    }
                  : {
                      borderColor: 'var(--unmute-glass-border) !important',
                      boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)'
                    }
              "
            >
              <!-- Swatch Circle with Specular 3D highlight -->
              <div
                class="swatch-circle rounded-3 d-flex align-items-center justify-content-center shadow position-relative overflow-hidden"
                :style="{ background: preset.gradient, boxShadow: '0 3px 0 ' + preset.bevel + ', inset 0 1.5px 0 rgba(255,255,255,0.45)' }"
              >
                <i v-if="themeStore.accent === preset.id" class="ri-check-line text-white fs-5 fw-bold"></i>
              </div>

              <!-- Name & Subtitle -->
              <div class="d-flex flex-column align-items-center">
                <span
                  class="small fw-bold font-display"
                  :style="{ color: themeStore.accent === preset.id ? 'var(--unmute-text-primary)' : 'var(--unmute-text-secondary)' }"
                >
                  {{ preset.name }}
                </span>
                <span class="extra-small fw-medium lh-sm" style="color: var(--unmute-text-dim);">
                  {{ preset.subtitle }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Privacy & Safety Shortcuts -->
    <UCard variant="default" padding="lg">
      <div class="d-flex flex-column gap-3">
        <h2 class="font-display fw-bold fs-6 mb-1" style="color: var(--unmute-text-primary);">
          Privacy & Account
        </h2>

        <router-link
          to="/safety"
          class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-decoration-none transition-all"
          style="border-color: var(--unmute-glass-border) !important;"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass text-warning">
              <i class="ri-shield-check-fill fs-5"></i>
            </div>
            <div>
              <h4 class="small fw-bold mb-0" style="color: var(--unmute-text-primary);">
                Safety & Blocked Users
              </h4>
              <p class="extra-small mb-0" style="color: var(--unmute-text-muted);">
                Manage blocked connections and safety commitments
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5" style="color: var(--unmute-text-muted);"></i>
        </router-link>

        <router-link
          to="/profile"
          class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-decoration-none transition-all"
          style="border-color: var(--unmute-glass-border) !important;"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass" style="color: var(--unmute-primary);">
              <i class="ri-user-3-fill fs-5"></i>
            </div>
            <div>
              <h4 class="small fw-bold mb-0" style="color: var(--unmute-text-primary);">
                Edit Public Profile
              </h4>
              <p class="extra-small mb-0" style="color: var(--unmute-text-muted);">
                Update your bio, approximate location, and hobbies
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5" style="color: var(--unmute-text-muted);"></i>
        </router-link>
      </div>
    </UCard>

    <!-- App Info & Log out -->
    <div class="pt-2 d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 small" style="color: var(--unmute-text-muted);">
      <span>Unmute v1.0.0 — Connect without the pressure</span>
      <UButton
        variant="ghost"
        size="sm"
        @click="handleLogout"
      >
        Sign out
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UButton from '../components/ui/UButton.vue';
import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const themeStore = useThemeStore();
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped lang="scss">
.theme-mode-btn {
  background: transparent;
  transition: all 0.18s ease;
  &:hover {
    filter: brightness(1.05);
  }
}

.preset-card-btn {
  background-color: var(--unmute-surface, #ffffff);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover {
    filter: brightness(1.03);
  }
}

.swatch-circle {
  width: 2.75rem;
  height: 2.75rem;
}

.extra-small {
  font-size: 0.6875rem;
}
</style>
