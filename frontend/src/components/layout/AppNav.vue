<template>
  <!-- Desktop / tablet: a slim labelled rail on the left -->
  <nav class="nav-rail d-none d-md-flex" aria-label="Main">
    <router-link to="/discover" class="rail-logo" aria-label="Unmute home">
      <BrandMark size="2.4rem" />
    </router-link>

    <router-link
      v-for="item in desktopItems"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ 'is-active': isNavActive(item, $route.path) }"
      :aria-current="isNavActive(item, $route.path) ? 'page' : undefined"
    >
      <span class="nav-icon">
        <i :class="iconClass(item, isNavActive(item, $route.path))" aria-hidden="true"></i>
        <span v-if="item.unreadBadge && messagesBadge > 0" class="nav-badge">{{ badgeText }}</span>
      </span>
      <span class="nav-label">{{ item.label }}</span>
    </router-link>

    <div class="rail-footer">
      <ThemeToggle />
    </div>
  </nav>

  <!-- Phones: a bottom tab bar -->
  <nav v-if="showMobileDock" class="tab-bar d-flex d-md-none" aria-label="Main">
    <router-link
      v-for="item in mobileItems"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ 'is-active': mobileActive(item) }"
      :aria-current="mobileActive(item) ? 'page' : undefined"
    >
      <span class="nav-icon">
        <i :class="iconClass(item, mobileActive(item))" aria-hidden="true"></i>
        <span v-if="item.unreadBadge && messagesBadge > 0" class="nav-badge">{{ badgeText }}</span>
      </span>
      <span class="nav-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BrandMark from './BrandMark.vue';
import ThemeToggle from './ThemeToggle.vue';
import { NAV_ITEMS, NavItem, isNavActive } from '../../navigation';
import { useChatStore } from '../../stores/chat';

defineProps<{ showMobileDock: boolean }>();

const route = useRoute();
const chatStore = useChatStore();

const desktopItems = NAV_ITEMS.filter((i) => i.desktop);
const mobileItems = NAV_ITEMS.filter((i) => i.mobile);

/** Unread messages plus requests awaiting an answer. */
const messagesBadge = computed(() => chatStore.totalUnreadCount + chatStore.pendingRequestCount);
const badgeText = computed(() => (messagesBadge.value > 99 ? '99+' : String(messagesBadge.value)));

/** On phones Settings and Safety are reached from Profile, so Profile stays highlighted there. */
function mobileActive(item: NavItem): boolean {
  const path = route.path;
  return isNavActive(item, path) || (item.to === '/profile' && (path.startsWith('/settings') || path === '/safety'));
}

function iconClass(item: NavItem, active: boolean): string {
  return `${item.icon}-${active ? 'fill' : 'line'}`;
}
</script>

<style scoped lang="scss">
.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  color: var(--unmute-text-muted);
  text-decoration: none;
  font-size: 0.6875rem;
  font-weight: 600;
  transition: color var(--unmute-transition-fast);

  &:hover {
    color: var(--unmute-text-primary);
  }

  &.is-active {
    color: var(--unmute-accent-text);
    font-weight: 700;

    // The small accent mark above the active icon, as in the reference.
    &::before {
      content: '';
      position: absolute;
      top: -0.45rem;
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 50%;
      background: var(--unmute-primary);
    }
  }
}

.nav-icon {
  position: relative;
  font-size: 1.4rem;
  line-height: 1;
}

.nav-badge {
  position: absolute;
  top: -0.3rem;
  left: 0.9rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.3rem;
  border-radius: 9999px;
  background: var(--unmute-primary);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
  box-shadow: 0 0 0 2px var(--unmute-surface);
}

// ---- Phones ----
.tab-bar {
  position: fixed;
  z-index: 1030;
  left: 0;
  right: 0;
  bottom: 0;
  justify-content: space-around;
  align-items: center;
  height: calc(var(--unmute-tabbar-height) + var(--unmute-safe-bottom));
  padding: 0.35rem 0.5rem var(--unmute-safe-bottom);
  background: var(--unmute-surface);
  border-top: 1px solid var(--unmute-glass-border);
  box-shadow: 0 -4px 16px -8px rgba(70, 25, 55, 0.12);

  .nav-item {
    flex: 1;
    min-height: 3rem;
    justify-content: center;
  }
}

// ---- Desktop rail ----
.nav-rail {
  position: fixed;
  z-index: 1030;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--unmute-dock-width);
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 0;
  background: var(--unmute-surface);
  border-right: 1px solid var(--unmute-glass-border);

  .nav-item {
    width: 100%;
    padding: 0.35rem 0;

    &.is-active::before {
      top: 50%;
      left: 0;
      width: 0.25rem;
      height: 2rem;
      border-radius: 0 4px 4px 0;
      transform: translateY(-50%);
    }
  }
}

.rail-logo {
  margin-bottom: 0.75rem;
}

.rail-footer {
  margin-top: auto;
}
</style>
