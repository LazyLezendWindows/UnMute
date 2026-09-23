<template>
  <header class="app-header position-sticky top-0 px-2 px-md-3 pt-2 pt-md-3">
    <div class="app-header-bar holo-panel container max-w-4xl px-3 d-flex align-items-center justify-content-between rounded-4">
      <!-- Brand Logo -->
      <router-link to="/discover" class="d-flex align-items-center gap-2 text-decoration-none user-select-none">
        <div class="brand-mark rounded-circle d-flex align-items-center justify-content-center">
          <span class="brand-ring rounded-circle" aria-hidden="true"></span>
          <i class="ri-voiceprint-fill text-white fs-5 position-relative"></i>
        </div>
        <div class="d-flex flex-column">
          <span class="font-display fw-bold fs-5 lh-1 u-text-primary">
            Unmute
          </span>
          <span class="brand-tagline small d-none d-sm-inline mt-1">
            Connect without the pressure
          </span>
        </div>
      </router-link>

      <!-- Desktop Nav -->
      <nav class="nav-track d-none d-md-flex align-items-center gap-1 p-1 rounded-pill">
        <router-link
          v-for="item in desktopItems"
          :key="item.to"
          :to="item.to"
          class="nav-pill px-3 py-1.5 rounded-pill small fw-semibold text-decoration-none user-select-none transition-all"
          :class="{ 'is-active text-white': isNavActive(item, $route.path), 'position-relative': item.unreadBadge }"
        >
          {{ item.label }}
          <span
            v-if="item.unreadBadge && chatStore.totalUnreadCount > 0"
            class="unread-badge position-absolute top-0 end-0 translate-middle-y px-1.5 py-0.5 rounded-pill bg-danger text-white fw-bold"
          >
            {{ chatStore.totalUnreadCount }}
          </span>
        </router-link>
      </nav>

      <!-- Right Actions: Theme Toggle, Settings, & Profile Avatar -->
      <div class="d-flex align-items-center gap-2">
        <!-- Quick Dark/Light Mode Toggle with 3D tactile button feel -->
        <button
          type="button"
          :aria-label="themeStore.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="themeStore.toggleMode()"
          class="icon-button p-2 rounded-circle transition-all border-0 user-select-none d-flex align-items-center justify-content-center"
          :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <i v-if="themeStore.isDarkMode" class="ri-sun-line fs-6 lh-1 u-text-accent"></i>
          <i v-else class="ri-moon-line fs-6 lh-1 u-text-accent"></i>
        </button>

        <!-- Settings icon shortcut for mobile -->
        <router-link
          to="/settings"
          class="icon-button d-md-none p-2 rounded-circle transition-all border-0 user-select-none d-flex align-items-center justify-content-center text-decoration-none u-text-secondary"
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
          <span class="d-none d-sm-inline small fw-semibold u-text-primary">
            {{ authStore.profile?.displayName || 'Profile' }}
          </span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import UAvatar from '../ui/UAvatar.vue';
import { NAV_ITEMS, isNavActive } from '../../navigation';
import { useAuthStore } from '../../stores/auth';
import { useChatStore } from '../../stores/chat';
import { useThemeStore } from '../../stores/theme';

const authStore = useAuthStore();
const chatStore = useChatStore();
const themeStore = useThemeStore();
const desktopItems = NAV_ITEMS.filter((item) => item.desktop);
</script>

<style scoped lang="scss">
.app-header {
  z-index: 1020;
}

.app-header-bar {
  height: 4rem;
  box-shadow: var(--unmute-shadow-lg);
}

.brand-mark {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--unmute-surface);
  box-shadow: var(--unmute-glow-primary);
}

// Spinning holographic ring around the logo mark
.brand-ring {
  position: absolute;
  inset: 0;
  padding: 2px;
  background: conic-gradient(from 0deg, #00e5ff, #7c5cff, #ff3dc8, #00e5ff);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: holo-spin 8s linear infinite;
}

.brand-mark i {
  background: var(--unmute-primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-tagline {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--unmute-text-muted);
}

.nav-track {
  background: var(--unmute-input-bg);
  border: 1px solid var(--unmute-glass-border);
}

.nav-pill {
  color: var(--unmute-text-secondary);

  &:hover {
    color: var(--unmute-text-primary);
  }

  &.is-active {
    background: var(--unmute-primary-gradient);
    box-shadow: var(--unmute-glow-primary), var(--unmute-3d-specular);
  }
}

.unread-badge {
  font-size: 0.6rem;
  line-height: 1;
}

.icon-button {
  width: 2.4rem;
  height: 2.4rem;
  background: var(--unmute-glass-surface);
  box-shadow: inset 0 0 0 1px var(--unmute-glass-border), var(--unmute-3d-specular);

  &:hover {
    box-shadow: inset 0 0 0 1px var(--unmute-glass-border-hover), var(--unmute-glow-primary);
  }
}
</style>
