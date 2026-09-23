<template>
  <!-- Desktop: vertical glass dock on the left edge -->
  <nav class="dock-rail glass-pane glass-pane-strong d-none d-md-flex flex-column align-items-center" aria-label="Main">
    <router-link to="/discover" class="dock-logo" aria-label="Unmute home">
      <BrandMark size="2.6rem" />
    </router-link>

    <div class="dock-items d-flex flex-column align-items-center">
      <router-link
        v-for="item in desktopItems"
        :key="item.to"
        :to="item.to"
        class="dock-item"
        :class="{ 'is-active': isNavActive(item, $route.path) }"
        :aria-label="item.label"
        :aria-current="isNavActive(item, $route.path) ? 'page' : undefined"
      >
        <i :class="iconClass(item)" aria-hidden="true"></i>
        <span v-if="item.unreadBadge && chatStore.totalUnreadCount > 0" class="dock-badge">
          {{ chatStore.totalUnreadCount }}
        </span>
        <span class="dock-tip" role="presentation">{{ item.label }}</span>
      </router-link>
    </div>

    <div class="d-flex flex-column align-items-center gap-2 mt-auto">
      <ThemeToggle />
      <router-link v-if="authStore.isAuthenticated" to="/profile" class="dock-avatar" aria-label="Your profile">
        <UAvatar :src="authStore.profile?.avatarUrl" :name="authStore.profile?.displayName || 'You'" size="sm" />
        <span class="dock-tip" role="presentation">Profile</span>
      </router-link>
    </div>
  </nav>

  <!-- Mobile: slim top bar + floating orb dock at the bottom -->
  <header class="mobile-bar d-flex d-md-none align-items-center justify-content-between">
    <router-link to="/discover" class="d-flex align-items-center gap-2 text-decoration-none" aria-label="Unmute home">
      <BrandMark size="2.1rem" />
      <span class="mobile-wordmark text-chrome">Unmute</span>
    </router-link>
    <div class="d-flex align-items-center gap-2">
      <ThemeToggle />
      <router-link v-if="authStore.isAuthenticated" to="/profile" class="dock-avatar" aria-label="Your profile">
        <UAvatar :src="authStore.profile?.avatarUrl" :name="authStore.profile?.displayName || 'You'" size="sm" />
      </router-link>
    </div>
  </header>

  <nav v-if="showMobileDock" class="orb-dock glass-pane glass-pane-strong d-flex d-md-none" aria-label="Main">
    <router-link
      v-for="item in mobileItems"
      :key="item.to"
      :to="item.to"
      class="orb-item"
      :class="{ 'is-active': isNavActive(item, $route.path) }"
      :aria-current="isNavActive(item, $route.path) ? 'page' : undefined"
    >
      <span class="orb-icon">
        <i :class="iconClass(item)" aria-hidden="true"></i>
        <span v-if="item.unreadBadge && chatStore.totalUnreadCount > 0" class="dock-badge">
          {{ chatStore.totalUnreadCount }}
        </span>
      </span>
      <span class="orb-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import UAvatar from '../ui/UAvatar.vue';
import BrandMark from './BrandMark.vue';
import ThemeToggle from './ThemeToggle.vue';
import { NAV_ITEMS, NavItem, isNavActive } from '../../navigation';
import { useAuthStore } from '../../stores/auth';
import { useChatStore } from '../../stores/chat';

defineProps<{ showMobileDock: boolean }>();

const route = useRoute();
const authStore = useAuthStore();
const chatStore = useChatStore();
const desktopItems = NAV_ITEMS.filter((item) => item.desktop);
const mobileItems = NAV_ITEMS.filter((item) => item.mobile);

function iconClass(item: NavItem): string {
  return isNavActive(item, route.path) ? `${item.icon}-fill` : `${item.icon}-line`;
}
</script>

<style scoped lang="scss">
// ---- Desktop rail ----
.dock-rail {
  position: fixed;
  z-index: 1030;
  top: 1rem;
  bottom: 1rem;
  left: 1rem;
  width: var(--unmute-dock-width);
  padding: 1.1rem 0 1rem;
  border-radius: var(--unmute-radius-xl);
}

.dock-logo {
  margin-bottom: 1.6rem;
}

.dock-items {
  gap: 0.55rem;
}

.dock-item,
.dock-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.1rem;
  height: 3.1rem;
  border-radius: 50%;
  color: var(--unmute-text-muted);
  font-size: 1.3rem;
  text-decoration: none;
  transition: color var(--unmute-transition-fast), background var(--unmute-transition-fast),
    transform var(--unmute-transition-fast), box-shadow var(--unmute-transition-fast);

  &:hover {
    color: var(--unmute-text-primary);
    background: var(--unmute-glass-surface);
    box-shadow: var(--unmute-glass-edge);
    transform: translateY(-1px);
  }

  &:hover .dock-tip,
  &:focus-visible .dock-tip {
    opacity: 1;
    transform: translate(0, -50%);
  }

  &.is-active {
    color: var(--unmute-on-ink);
    background: var(--unmute-ink);
    box-shadow: var(--unmute-btn-3d-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
}

// Tooltip bubble to the right of the rail
.dock-tip {
  position: absolute;
  left: calc(100% + 0.9rem);
  top: 50%;
  transform: translate(-6px, -50%);
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
  padding: 0.35rem 0.75rem;
  border-radius: var(--unmute-radius-pill);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--unmute-text-primary);
  background: var(--unmute-glass-strong);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-md);
  transition: opacity var(--unmute-transition-fast), transform var(--unmute-transition-fast);
}

.dock-badge {
  position: absolute;
  top: 0.15rem;
  right: 0.1rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.3rem;
  border-radius: 9999px;
  background: var(--unmute-danger);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
  box-shadow: 0 0 0 2px var(--unmute-glass-strong);
}

// ---- Mobile ----
.mobile-bar {
  position: sticky;
  top: 0;
  z-index: 1020;
  padding: 0.75rem 1rem;
}

.mobile-wordmark {
  font-family: var(--unmute-font-display);
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: -0.03em;
}

.orb-dock {
  position: fixed;
  z-index: 1030;
  left: 0.9rem;
  right: 0.9rem;
  bottom: calc(0.9rem + env(safe-area-inset-bottom, 0px));
  justify-content: space-around;
  padding: 0.45rem 0.4rem;
  border-radius: var(--unmute-radius-pill);
}

.orb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 3.4rem;
  color: var(--unmute-text-muted);
  text-decoration: none;

  .orb-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 50%;
    font-size: 1.2rem;
    transition: transform var(--unmute-transition-bounce), background var(--unmute-transition-fast),
      box-shadow var(--unmute-transition-fast), color var(--unmute-transition-fast);
  }

  .orb-label {
    font-size: 0.64rem;
    font-weight: 600;
  }

  // The active tab rises out of the dock as a lit orb.
  &.is-active {
    color: var(--unmute-text-primary);

    .orb-icon {
      color: #fff;
      background: var(--unmute-primary-gradient);
      transform: translateY(-0.7rem) scale(1.08);
      box-shadow: var(--unmute-glow-primary), inset 0 1px 0 rgba(255, 255, 255, 0.45),
        0 0 0 4px var(--unmute-glass-strong);
    }

    .orb-label {
      transform: translateY(-0.45rem);
    }
  }
}
</style>
