<template>
  <header class="position-sticky top-0 py-2 py-md-3 transition-colors" style="z-index: 1020;">
    <div class="container max-w-4xl px-3">
      <div
        class="d-flex align-items-center justify-content-between px-3 px-md-4 rounded-4 surface-glass border shadow-sm transition-all navbar-elyse-card"
        style="height: 4.25rem; border-color: var(--unmute-glass-border) !important; background: var(--unmute-glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);"
      >
        <!-- Brand Logo -->
        <router-link to="/discover" class="d-flex align-items-center gap-2.5 text-decoration-none user-select-none">
          <div
            class="rounded-3 d-flex align-items-center justify-content-center transition-transform brand-logo-badge"
            style="width: 2.6rem; height: 2.6rem; background: var(--unmute-obsidian-gradient); box-shadow: 0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2);"
          >
            <i class="ri-voiceprint-fill fs-5" style="color: var(--unmute-gold-light);"></i>
          </div>
          <div class="d-flex flex-column">
            <span class="brand-heading fw-bold fs-4 lh-1" style="color: var(--unmute-text-primary); letter-spacing: -0.02em;">
              Unmute
            </span>
            <span class="d-none d-sm-inline mt-1" style="font-size: 0.65rem; color: var(--unmute-gold-dark); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;">
              Curated Sanctuary
            </span>
          </div>
        </router-link>

        <!-- Desktop Nav -->
        <nav class="d-none d-md-flex align-items-center gap-1.5 p-1 rounded-pill surface-raised border" style="border-color: var(--unmute-glass-border) !important;">
          <router-link
            to="/discover"
            class="px-3.5 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
            :class="$route.path === '/discover' ? 'text-white' : ''"
            :style="$route.path === '/discover' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } : { color: 'var(--unmute-text-secondary)' }"
          >
            Discover
          </router-link>
          <router-link
            to="/matches"
            class="px-3.5 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
            :class="$route.path === '/matches' ? 'text-white' : ''"
            :style="$route.path === '/matches' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } : { color: 'var(--unmute-text-secondary)' }"
          >
            Matches
          </router-link>
          <router-link
            to="/chat"
            class="position-relative px-3.5 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
            :class="$route.path.startsWith('/chat') ? 'text-white' : ''"
            :style="$route.path.startsWith('/chat') ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } : { color: 'var(--unmute-text-secondary)' }"
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
            class="px-3.5 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
            :class="$route.path === '/safety' ? 'text-white' : ''"
            :style="$route.path === '/safety' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } : { color: 'var(--unmute-text-secondary)' }"
          >
            Safety
          </router-link>
          <router-link
            to="/settings"
            class="px-3.5 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
            :class="$route.path === '/settings' ? 'text-white' : ''"
            :style="$route.path === '/settings' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } : { color: 'var(--unmute-text-secondary)' }"
          >
            Settings
          </router-link>
        </nav>

        <!-- Right Actions: Theme Toggle, Settings, & Profile Avatar -->
        <div class="d-flex align-items-center gap-2.5">
          <!-- Quick Dark/Light Mode Toggle with tactile feel -->
          <button
            type="button"
            @click="themeStore.toggleMode()"
            class="p-2 rounded-circle transition-all surface-raised border user-select-none d-flex align-items-center justify-content-center"
            style="width: 2.35rem; height: 2.35rem; border-color: var(--unmute-glass-border) !important;"
            :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <i v-if="themeStore.isDarkMode" class="ri-sun-line text-warning fs-6 lh-1"></i>
            <i v-else class="ri-moon-line fs-6 lh-1" style="color: var(--unmute-text-primary);"></i>
          </button>

          <!-- Settings icon shortcut for mobile -->
          <router-link
            to="/settings"
            class="d-md-none p-2 rounded-circle transition-all surface-raised border user-select-none d-flex align-items-center justify-content-center text-decoration-none"
            style="width: 2.35rem; height: 2.35rem; border-color: var(--unmute-glass-border) !important; color: var(--unmute-text-secondary);"
            title="Settings"
          >
            <i class="ri-settings-3-line fs-6 lh-1"></i>
          </router-link>

          <router-link
            v-if="authStore.isAuthenticated"
            to="/profile"
            class="d-flex align-items-center gap-2 p-1 rounded-pill transition-all text-decoration-none profile-badge-link"
          >
            <div class="position-relative">
              <UAvatar
                :src="authStore.profile?.avatarUrl"
                :name="authStore.profile?.displayName || 'User'"
                size="sm"
                :border="true"
              />
              <span
                v-if="authStore.profile?.isVerified"
                class="position-absolute bottom-0 end-0 translate-middle-y badge rounded-circle p-0 d-flex align-items-center justify-content-center bg-white"
                style="width: 14px; height: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"
              >
                <i class="ri-checkbox-circle-fill text-primary" style="font-size: 12px; color: var(--unmute-gold) !important;"></i>
              </span>
            </div>
            <span class="d-none d-sm-inline small fw-semibold" style="color: var(--unmute-text-primary);">
              {{ authStore.profile?.displayName || 'Profile' }}
            </span>
          </router-link>
        </div>
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

<style scoped lang="scss">
.navbar-elyse-card {
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
}

.brand-heading {
  font-family: 'Playfair Display', Georgia, serif;
}

.brand-logo-badge {
  transition: transform var(--unmute-transition-fast);
  &:hover {
    transform: scale(1.05);
  }
}

.profile-badge-link {
  background: var(--unmute-surface-raised);
  border: 1px solid var(--unmute-glass-border) !important;
  padding-right: 0.75rem !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);

  &:hover {
    background: var(--unmute-surface-overlay);
    border-color: var(--unmute-gold-border) !important;
  }
}
</style>
