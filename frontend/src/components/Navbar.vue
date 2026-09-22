<template>
  <header class="position-sticky top-0 surface-glass border-bottom transition-colors" style="z-index: 1020; border-color: var(--unmute-glass-border) !important;">
    <div class="container max-w-4xl px-3 d-flex align-items-center justify-content-between" style="height: 4rem;">
      <!-- Brand Logo -->
      <router-link to="/discover" class="d-flex align-items-center gap-2 text-decoration-none user-select-none">
        <div
          class="rounded-3 d-flex align-items-center justify-content-center transition-transform"
          style="width: 2.5rem; height: 2.5rem; background: var(--unmute-primary-gradient); box-shadow: 0 3px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);"
        >
          <i class="ri-voiceprint-fill text-white fs-5"></i>
        </div>
        <div class="d-flex flex-column">
          <span class="font-display fw-bold fs-5 lh-1" style="color: var(--unmute-text-primary);">
            Unmute
          </span>
          <span class="small d-none d-sm-inline mt-1" style="font-size: 0.65rem; color: var(--unmute-text-muted);">
            Connect without the pressure
          </span>
        </div>
      </router-link>

      <!-- Desktop Nav -->
      <nav class="d-none d-md-flex align-items-center gap-2 p-1 rounded-3 surface-raised border" style="border-color: var(--unmute-glass-border) !important;">
        <router-link
          to="/discover"
          class="px-3 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path === '/discover' ? 'text-white' : ''"
          :style="$route.path === '/discover' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Discover
        </router-link>
        <router-link
          to="/matches"
          class="px-3 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path === '/matches' ? 'text-white' : ''"
          :style="$route.path === '/matches' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Matches
        </router-link>
        <router-link
          to="/chat"
          class="position-relative px-3 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path.startsWith('/chat') ? 'text-white' : ''"
          :style="$route.path.startsWith('/chat') ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Messages
          <span
            v-if="chatStore.totalUnreadCount > 0"
            class="position-absolute top-0 end-0 translate-middle-y px-1.5 py-0.5 rounded-pill bg-danger text-white fw-bold"
            style="font-size: 0.6rem; line-height: 1;"
          >
            {{ chatStore.totalUnreadCount }}
          </span>
        </router-link>
        <router-link
          to="/safety"
          class="px-3 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path === '/safety' ? 'text-white' : ''"
          :style="$route.path === '/safety' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Safety
        </router-link>
        <router-link
          to="/settings"
          class="px-3 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path === '/settings' ? 'text-white' : ''"
          :style="$route.path === '/settings' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Settings
        </router-link>
      </nav>

      <!-- Right Actions: Theme Toggle, Settings, & Profile Avatar -->
      <div class="d-flex align-items-center gap-2">
        <!-- Quick Dark/Light Mode Toggle with 3D tactile button feel -->
        <button
          type="button"
          @click="themeStore.toggleMode()"
          class="p-2 rounded-3 transition-all surface-raised border user-select-none d-flex align-items-center justify-content-center"
          style="border-color: var(--unmute-glass-border) !important; box-shadow: 0 2px 0 var(--unmute-glass-border), var(--unmute-3d-specular);"
          :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <i v-if="themeStore.isDarkMode" class="ri-sun-line text-warning fs-6 lh-1"></i>
          <i v-else class="ri-moon-line fs-6 lh-1" style="color: var(--unmute-primary);"></i>
        </button>

        <!-- Settings icon shortcut for mobile -->
        <router-link
          to="/settings"
          class="d-md-none p-2 rounded-3 transition-all surface-raised border user-select-none d-flex align-items-center justify-content-center text-decoration-none"
          style="border-color: var(--unmute-glass-border) !important; box-shadow: 0 2px 0 var(--unmute-glass-border), var(--unmute-3d-specular); color: var(--unmute-text-secondary);"
          title="Settings"
        >
          <i class="ri-settings-3-line fs-6 lh-1"></i>
        </router-link>

        <router-link
          v-if="authStore.isAuthenticated"
          to="/profile"
          class="d-flex align-items-center gap-2 p-1 rounded-3 transition-all text-decoration-none border border-transparent"
        >
          <UAvatar
            :src="authStore.profile?.avatarUrl"
            :name="authStore.profile?.displayName || 'User'"
            size="sm"
            :border="true"
          />
          <span class="d-none d-sm-inline small fw-semibold" style="color: var(--unmute-text-primary);">
            {{ authStore.profile?.displayName || 'Profile' }}
          </span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import UAvatar from './ui/UAvatar.vue';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';
import { useThemeStore } from '../stores/theme';

const authStore = useAuthStore();
const chatStore = useChatStore();
const themeStore = useThemeStore();
</script>
