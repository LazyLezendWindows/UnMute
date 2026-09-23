<template>
  <header class="app-header position-sticky top-0 surface-glass border-bottom transition-colors u-border-glass">
    <div class="app-header-bar container max-w-4xl px-3 d-flex align-items-center justify-content-between">
      <!-- Brand Logo -->
      <router-link to="/discover" class="d-flex align-items-center gap-2 text-decoration-none user-select-none">
        <div class="brand-mark rounded-3 d-flex align-items-center justify-content-center transition-transform">
          <i class="ri-voiceprint-fill text-white fs-5"></i>
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
      <nav class="d-none d-md-flex align-items-center gap-2 p-1 rounded-3 surface-raised border u-border-glass">
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
          @click="themeStore.toggleMode()"
          class="icon-button p-2 rounded-3 transition-all surface-raised border user-select-none d-flex align-items-center justify-content-center u-border-glass"
          :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <i v-if="themeStore.isDarkMode" class="ri-sun-line text-warning fs-6 lh-1"></i>
          <i v-else class="ri-moon-line fs-6 lh-1 u-text-accent"></i>
        </button>

        <!-- Settings icon shortcut for mobile -->
        <router-link
          to="/settings"
          class="icon-button d-md-none p-2 rounded-3 transition-all surface-raised border user-select-none d-flex align-items-center justify-content-center text-decoration-none u-border-glass u-text-secondary"
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
import UAvatar from './ui/UAvatar.vue';
import { NAV_ITEMS, isNavActive } from '../navigation';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';
import { useThemeStore } from '../stores/theme';

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
}

.brand-mark {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--unmute-primary-gradient);
  box-shadow: 0 3px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);
}

.brand-tagline {
  font-size: 0.65rem;
  color: var(--unmute-text-muted);
}

.nav-pill {
  color: var(--unmute-text-secondary);

  &.is-active {
    background: var(--unmute-primary-gradient);
    box-shadow: 0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);
  }
}

.unread-badge {
  font-size: 0.6rem;
  line-height: 1;
}

.icon-button {
  box-shadow: 0 2px 0 var(--unmute-glass-border), var(--unmute-3d-specular);
}
</style>
