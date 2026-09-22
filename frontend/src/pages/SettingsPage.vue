<template>
  <div class="max-w-xl mx-auto w-full space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="font-display text-2xl sm:text-3xl font-extrabold tracking-tight" style="color: var(--unmute-text-primary);">
        Settings
      </h1>
      <p class="text-xs" style="color: var(--unmute-text-muted);">
        Personalize your appearance, dynamic theme colors, and privacy preferences
      </p>
    </div>

    <!-- Appearance: Mode (Dark vs Light/White) -->
    <UCard variant="elevated" padding="lg" class="space-y-4">
      <div class="flex items-center gap-2">
        <Sun v-if="!themeStore.isDarkMode" class="w-5 h-5 text-amber-500" />
        <Moon v-else class="w-5 h-5" style="color: var(--unmute-primary-light);" />
        <h2 class="font-display font-bold text-base" style="color: var(--unmute-text-primary);">
          Appearance & Theme Mode
        </h2>
      </div>

      <p class="text-xs" style="color: var(--unmute-text-secondary);">
        Choose between deep 3D obsidian dark mode, crystalline white mode, or automatic system adaptation.
      </p>

      <!-- Segmented Mode Selector with 3D tactile buttons -->
      <div class="grid grid-cols-3 gap-2.5 p-1.5 surface-raised rounded-2xl border border-white/5 shadow-inner">
        <button
          type="button"
          @click="themeStore.setMode('dark')"
          class="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all select-none active:translate-y-0.5"
          :style="themeStore.mode === 'dark' ? { background: 'var(--unmute-surface-overlay)', color: 'var(--unmute-text-primary)', border: '1px solid var(--unmute-glass-border-hover)', boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          <Moon class="w-4 h-4 text-purple-400" />
          <span>Dark Mode</span>
        </button>

        <button
          type="button"
          @click="themeStore.setMode('light')"
          class="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all select-none active:translate-y-0.5"
          :style="themeStore.mode === 'light' ? { background: 'var(--unmute-surface-overlay)', color: 'var(--unmute-text-primary)', border: '1px solid var(--unmute-glass-border-hover)', boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          <Sun class="w-4 h-4 text-amber-500" />
          <span>Light (White)</span>
        </button>

        <button
          type="button"
          @click="themeStore.setMode('system')"
          class="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all select-none active:translate-y-0.5"
          :style="themeStore.mode === 'system' ? { background: 'var(--unmute-surface-overlay)', color: 'var(--unmute-text-primary)', border: '1px solid var(--unmute-glass-border-hover)', boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          <Monitor class="w-4 h-4 text-sky-400" />
          <span>System Auto</span>
        </button>
      </div>
    </UCard>

    <!-- Dynamic Theme Accent Colors -->
    <UCard variant="elevated" padding="lg" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Palette class="w-5 h-5" style="color: var(--unmute-primary);" />
          <h2 class="font-display font-bold text-base" style="color: var(--unmute-text-primary);">
            Dynamic Accent Theme
          </h2>
        </div>
        <span
          class="px-3 py-1 text-xs font-bold rounded-full text-white shadow-md select-none font-display tracking-wide"
          :style="{ background: themeStore.activePreset.gradient, boxShadow: '0 2px 0 ' + themeStore.activePreset.bevel + ', ' + themeStore.activePreset.glow + ', var(--unmute-3d-specular)' }"
        >
          {{ themeStore.activePreset.name }}
        </span>
      </div>

      <p class="text-xs" style="color: var(--unmute-text-secondary);">
        Choose an electric theme preset. All buttons, 3D bottom bevels, glow borders, and tabs will instantly re-skin in real time.
      </p>

      <!-- 6-Palette 3D Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
        <button
          v-for="preset in themeStore.presets"
          :key="preset.id"
          type="button"
          @click="themeStore.setAccent(preset.id)"
          class="p-3.5 rounded-2xl surface-raised transition-all flex flex-col items-center gap-2 text-center group relative select-none border active:translate-y-1"
          :class="
            themeStore.accent === preset.id
              ? '-translate-y-1.5'
              : 'border-white/5 hover:border-white/20'
          "
          :style="
            themeStore.accent === preset.id
              ? {
                  borderColor: preset.primary,
                  boxShadow: '0 5px 0 ' + preset.bevel + ', ' + preset.glow + ', var(--unmute-3d-specular)'
                }
              : {
                  boxShadow: '0 3px 0 var(--unmute-glass-border), var(--unmute-3d-specular)'
                }
          "
        >
          <!-- Swatch Circle with Specular 3D highlight -->
          <div
            class="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 relative overflow-hidden"
            :style="{ background: preset.gradient, boxShadow: '0 3px 0 ' + preset.bevel + ', inset 0 1.5px 0 rgba(255,255,255,0.45)' }"
          >
            <Check v-if="themeStore.accent === preset.id" class="w-5 h-5 text-white stroke-[3.5] drop-shadow-md" />
          </div>

          <!-- Name & Subtitle -->
          <div class="flex flex-col items-center">
            <span
              class="text-xs font-bold font-display transition-colors"
              :style="{ color: themeStore.accent === preset.id ? 'var(--unmute-text-primary)' : 'var(--unmute-text-secondary)' }"
            >
              {{ preset.name }}
            </span>
            <span class="text-[10px] text-slate-500 font-medium leading-tight">
              {{ preset.subtitle }}
            </span>
          </div>
        </button>
      </div>
    </UCard>

    <!-- Privacy & Safety Shortcuts -->
    <UCard variant="default" padding="lg" class="space-y-3">
      <h2 class="font-display font-bold text-base mb-2" style="color: var(--unmute-text-primary);">
        Privacy & Account
      </h2>

      <router-link
        to="/safety"
        class="flex items-center justify-between p-3.5 surface-raised rounded-2xl border border-white/5 hover:border-white/20 transition-colors group"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl surface-glass text-amber-400">
            <ShieldCheck class="w-4 h-4" />
          </div>
          <div>
            <h4 class="text-xs font-bold transition-colors" style="color: var(--unmute-text-primary);">
              Safety & Blocked Users
            </h4>
            <p class="text-[11px]" style="color: var(--unmute-text-muted);">
              Manage blocked connections and safety commitments
            </p>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
      </router-link>

      <router-link
        to="/profile"
        class="flex items-center justify-between p-3.5 surface-raised rounded-2xl border border-white/5 hover:border-white/20 transition-colors group"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl surface-glass" style="color: var(--unmute-primary);">
            <User class="w-4 h-4" />
          </div>
          <div>
            <h4 class="text-xs font-bold transition-colors" style="color: var(--unmute-text-primary);">
              Edit Public Profile
            </h4>
            <p class="text-[11px]" style="color: var(--unmute-text-muted);">
              Update your bio, approximate location, and hobbies
            </p>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
      </router-link>
    </UCard>

    <!-- App Info & Log out -->
    <div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style="color: var(--unmute-text-muted);">
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
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
  ShieldCheck,
  User,
  ChevronRight,
} from 'lucide-vue-next';
import UCard from '../components/ui/UCard.vue';
import UBadge from '../components/ui/UBadge.vue';
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
