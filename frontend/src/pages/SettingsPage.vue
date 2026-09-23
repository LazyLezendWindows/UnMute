<template>
  <div class="d-flex flex-column gap-4 max-w-3xl w-100">
    <PageHeader title="Settings" subtitle="Appearance, accent colour and privacy." />

    <!-- Appearance: Mode (Dark vs Light/White) -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2">
          <i v-if="!themeStore.isDarkMode" class="ri-sun-line fs-5 text-warning"></i>
          <i v-else class="ri-moon-line fs-5 u-text-accent-soft"></i>
          <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">
            Appearance & Theme Mode
          </h2>
        </div>

        <p class="small mb-2 u-text-secondary">
          Bright liquid glass (default), night glass, or follow your device.
        </p>

        <!-- Segmented Mode Selector with 3D tactile buttons -->
        <div class="row g-2 p-1 surface-raised rounded-3 border u-border-glass">
          <div v-for="option in THEME_MODES" :key="option.mode" class="col-4">
            <button
              type="button"
              @click="themeStore.setMode(option.mode)"
              class="theme-mode-btn w-100 d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2 py-2 px-2 border-0 rounded-3 small fw-bold user-select-none"
              :class="{ 'is-active': themeStore.mode === option.mode }"
            >
              <i class="fs-6" :class="option.icon"></i>
              <span>{{ option.label }}</span>
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
            <i class="ri-palette-line fs-5 u-text-accent"></i>
            <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">
              Dynamic Accent Theme
            </h2>
          </div>
          <span
            class="preset-badge badge rounded-pill text-white shadow-sm user-select-none font-display px-3 py-2"
            :style="presetVars(themeStore.activePreset)"
          >
            {{ themeStore.activePreset.name }}
          </span>
        </div>

        <p class="small mb-1 u-text-secondary">
          Pick the accent light used for buttons, highlights and the active dock item.
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
              :class="{ 'preset-active': themeStore.accent === preset.id }"
              :style="presetVars(preset)"
            >
              <!-- Swatch Circle with Specular 3D highlight -->
              <div class="swatch-circle rounded-3 d-flex align-items-center justify-content-center shadow position-relative overflow-hidden">
                <i v-if="themeStore.accent === preset.id" class="ri-check-line text-white fs-5 fw-bold"></i>
              </div>

              <!-- Name & Subtitle -->
              <div class="d-flex flex-column align-items-center">
                <span class="preset-name small fw-bold font-display">
                  {{ preset.name }}
                </span>
                <span class="extra-small fw-medium lh-sm u-text-dim">
                  {{ preset.subtitle }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Motion & 3D: how much the live backdrop may move (battery) -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2">
          <i class="ri-landscape-line fs-5 u-text-accent" aria-hidden="true"></i>
          <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">Motion &amp; 3D</h2>
        </div>
        <p class="small mb-0 u-text-secondary">{{ motionDescriptions[themeStore.motion] }}</p>
        <UChipGroup
          :model-value="themeStore.motion"
          :options="motionOptions"
          label="Motion and 3D background"
          @update:model-value="themeStore.setMotion"
        />
      </div>
    </UCard>

    <!-- Privacy & Safety Shortcuts -->
    <UCard variant="default" padding="lg">
      <div class="d-flex flex-column gap-3">
        <h2 class="font-display fw-bold fs-6 mb-1 u-text-primary">
          Privacy & Account
        </h2>

        <router-link
          to="/safety"
          class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-decoration-none transition-all u-border-glass"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass text-warning">
              <i class="ri-shield-check-fill fs-5"></i>
            </div>
            <div>
              <h4 class="small fw-bold mb-0 u-text-primary">
                Safety & Blocked Users
              </h4>
              <p class="extra-small mb-0 u-text-muted">
                Manage blocked connections and safety commitments
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5 u-text-muted"></i>
        </router-link>

        <router-link
          to="/profile"
          class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-4 border text-decoration-none transition-all u-border-glass"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="p-2 rounded-3 surface-glass u-text-accent">
              <i class="ri-user-3-fill fs-5"></i>
            </div>
            <div>
              <h4 class="small fw-bold mb-0 u-text-primary">
                Edit Public Profile
              </h4>
              <p class="extra-small mb-0 u-text-muted">
                Update your bio, approximate location, and hobbies
              </p>
            </div>
          </div>
          <i class="ri-arrow-right-s-line fs-5 u-text-muted"></i>
        </router-link>
      </div>
    </UCard>

    <!-- App Info & Log out -->
    <div class="pt-2 d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 small u-text-muted">
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
import UChipGroup from '../components/ui/UChipGroup.vue';
import type { MotionPreference } from '../stores/theme';
import PageHeader from '../components/layout/PageHeader.vue';
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UButton from '../components/ui/UButton.vue';
import { useThemeStore, ThemeMode } from '../stores/theme';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const themeStore = useThemeStore();
const authStore = useAuthStore();

const THEME_MODES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: 'ri-sun-line text-warning' },
  { mode: 'dark', label: 'Dark Mode', icon: 'ri-moon-line u-text-accent' },
  { mode: 'system', label: 'System Auto', icon: 'ri-computer-line text-info' },
];

/** A preset's colours as CSS custom properties; the styling itself lives in the stylesheet. */
function presetVars(preset: { primary: string; bevel: string; gradient: string; glow: string }) {
  return {
    '--preset-primary': preset.primary,
    '--preset-bevel': preset.bevel,
    '--preset-gradient': preset.gradient,
    '--preset-glow': preset.glow,
  };
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

const motionOptions: { value: MotionPreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'full', label: 'Full' },
  { value: 'calm', label: 'Calm' },
  { value: 'off', label: 'Off' },
];

const motionDescriptions: Record<MotionPreference, string> = {
  auto: 'The 3D scene moves while you use the app and rests when you stop. It holds still on low battery, data saver or reduced motion.',
  full: 'The 3D scene moves whenever you are using the app, even on low battery. It still rests when you stop.',
  calm: 'The 3D scene is shown as a still image. Lowest energy while keeping the look.',
  off: 'No 3D scene; a soft gradient instead.',
};
</script>

<style scoped lang="scss">
.theme-mode-btn {
  background: transparent;
  color: var(--unmute-text-secondary);
  transition: all 0.18s ease;
  &:hover {
    filter: brightness(1.05);
  }

  &.is-active {
    background: var(--unmute-surface);
    color: var(--unmute-text-primary);
    border: 1px solid var(--unmute-glass-border-hover) !important;
    box-shadow: 0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular);
  }
}

.preset-badge {
  background: var(--preset-gradient);
  box-shadow: 0 2px 0 var(--preset-bevel), var(--preset-glow), var(--unmute-3d-specular);
}

.preset-card-btn {
  background-color: var(--unmute-surface, #ffffff);
  border-color: var(--unmute-glass-border) !important;
  box-shadow: 0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover {
    filter: brightness(1.03);
  }

  &.preset-active {
    border-color: var(--preset-primary) !important;
    box-shadow: 0 5px 0 var(--preset-bevel), var(--preset-glow), var(--unmute-3d-specular);
    transform: translateY(-3px);
  }
}

.swatch-circle {
  width: 2.75rem;
  height: 2.75rem;
  background: var(--preset-gradient);
  box-shadow: 0 3px 0 var(--preset-bevel), inset 0 1.5px 0 rgba(255, 255, 255, 0.45);
}

.preset-name {
  color: var(--unmute-text-secondary);

  .preset-active & {
    color: var(--unmute-text-primary);
  }
}

.extra-small {
  font-size: 0.6875rem;
}
</style>
