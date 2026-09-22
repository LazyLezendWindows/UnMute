<template>
  <header class="position-sticky top-0 surface-glass border-bottom border-white/10 transition-colors" style="z-index: 1020;">
    <div class="container max-w-4xl px-3 d-flex align-items-center justify-content-between" style="height: 4rem;">
      <!-- Brand Logo -->
      <router-link to="/discover" class="d-flex align-items-center gap-2 text-decoration-none user-select-none">
        <div
          class="rounded-2xl d-flex align-items-center justify-center transition-transform"
          style="width: 2.5rem; height: 2.5rem; background: var(--unmute-primary-gradient); box-shadow: 0 3px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);"
        >
          <svg class="text-white" style="width: 1.25rem; height: 1.25rem; stroke-width: 2.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
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
      <nav class="d-none d-md-flex align-items-center gap-2 p-1 rounded-2xl surface-raised border border-white/5">
        <router-link
          to="/discover"
          class="px-3 py-1.5 rounded-xl small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path === '/discover' ? 'text-white' : ''"
          :style="$route.path === '/discover' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Discover
        </router-link>
        <router-link
          to="/matches"
          class="px-3 py-1.5 rounded-xl small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path === '/matches' ? 'text-white' : ''"
          :style="$route.path === '/matches' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Matches
        </router-link>
        <router-link
          to="/chat"
          class="position-relative px-3 py-1.5 rounded-xl small fw-semibold text-decoration-none user-select-none transition-all"
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
          class="px-3 py-1.5 rounded-xl small fw-semibold text-decoration-none user-select-none transition-all"
          :class="$route.path === '/safety' ? 'text-white' : ''"
          :style="$route.path === '/safety' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Safety
        </router-link>
        <router-link
          to="/settings"
          class="px-3 py-1.5 rounded-xl small fw-semibold text-decoration-none user-select-none transition-all"
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
          class="p-2 rounded-xl transition-all surface-raised border border-white/10 user-select-none d-flex align-items-center justify-content-center"
          style="box-shadow: 0 2px 0 var(--unmute-glass-border), var(--unmute-3d-specular);"
          :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <Sun v-if="themeStore.isDarkMode" style="width: 1rem; height: 1rem;" class="text-warning" />
          <Moon v-else style="width: 1rem; height: 1rem; color: var(--unmute-primary);" />
        </button>

        <!-- Settings icon shortcut for mobile -->
        <router-link
          to="/settings"
          class="d-md-none p-2 rounded-xl transition-all surface-raised border border-white/10 user-select-none d-flex align-items-center justify-content-center text-decoration-none"
          style="box-shadow: 0 2px 0 var(--unmute-glass-border), var(--unmute-3d-specular); color: var(--unmute-text-secondary);"
          title="Settings"
        >
          <Settings style="width: 1rem; height: 1rem;" />
        </router-link>

        <router-link
          v-if="authStore.isAuthenticated"
          to="/profile"
          class="d-flex align-items-center gap-2 p-1 rounded-2xl transition-all text-decoration-none border border-transparent"
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
import { Sun, Moon, Settings } from 'lucide-vue-next';
import UAvatar from './ui/UAvatar.vue';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';
import { useThemeStore } from '../stores/theme';

const authStore = useAuthStore();
const chatStore = useChatStore();
const themeStore = useThemeStore();
</script>
