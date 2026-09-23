<template>
  <nav
    class="bottom-nav holo-panel d-md-none position-fixed start-0 end-0 bottom-0 m-3 rounded-4 px-2 py-2 d-flex justify-content-around align-items-center user-select-none"
  >
    <router-link
      v-for="item in mobileItems"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-item d-flex flex-column align-items-center py-1 px-2 rounded-3 position-relative text-decoration-none"
      :class="{ 'is-active fw-bold': isNavActive(item, $route.path) }"
    >
      <div v-if="item.unreadBadge" class="position-relative">
        <i class="nav-icon" :class="iconClass(item)"></i>
        <span
          v-if="chatStore.totalUnreadCount > 0"
          class="unread-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger text-white fw-bold"
        >
          {{ chatStore.totalUnreadCount }}
        </span>
      </div>
      <i v-else class="nav-icon" :class="iconClass(item)"></i>
      <span class="nav-label">{{ item.label }}</span>
      <span
        v-if="isNavActive(item, $route.path)"
        class="position-absolute bottom-0 rounded-pill nav-indicator"
      ></span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useChatStore } from '../../stores/chat';
import { NAV_ITEMS, NavItem, isNavActive } from '../../navigation';

const route = useRoute();
const chatStore = useChatStore();
const mobileItems = NAV_ITEMS.filter((item) => item.mobile);

function iconClass(item: NavItem): string {
  return isNavActive(item, route.path) ? `${item.icon}-fill scale-110` : `${item.icon}-line`;
}
</script>

<style scoped lang="scss">
.bottom-nav {
  // Above page content (main is z-index 10) so it is always visible and tappable.
  z-index: 1030;
  box-shadow: var(--unmute-shadow-3d), var(--unmute-3d-card-rim);
}

.bottom-nav-item {
  color: var(--unmute-text-muted);
  transition: color var(--unmute-transition-fast), background-color var(--unmute-transition-fast);

  &.is-active {
    color: var(--unmute-accent-text);
    background: var(--unmute-primary-surface);

    .nav-icon {
      filter: drop-shadow(0 0 8px var(--unmute-accent-text));
    }
  }
}

.unread-badge {
  font-size: 0.55rem;
  padding: 0.15rem 0.35rem;
}

.nav-icon {
  font-size: 1.25rem;
  line-height: 1;
  transition: transform 0.18s ease;
}

.scale-110 {
  transform: scale(1.15);
}

.nav-label {
  font-size: 0.6875rem;
  margin-top: 0.15rem;
}

.nav-indicator {
  width: 1.25rem;
  height: 3px;
  background: var(--unmute-primary-gradient);
  box-shadow: 0 0 12px 1px var(--unmute-accent-text);
}
</style>
