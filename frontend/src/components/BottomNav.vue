<template>
  <nav
    class="d-md-none position-fixed start-0 end-0 bottom-0 m-3 z-3 surface-glass rounded-4 border px-3 py-2 d-flex justify-content-around align-items-center user-select-none bottom-nav-3d"
    style="z-index: 1030; border-color: var(--unmute-glass-border) !important; box-shadow: var(--unmute-shadow-3d), var(--unmute-3d-card-rim);"
  >
    <!-- Discover -->
    <router-link
      to="/discover"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-3 position-relative text-decoration-none"
      :class="$route.path === '/discover' ? 'fw-bold' : ''"
      :style="$route.path === '/discover' ? { color: 'var(--unmute-primary)' } : { color: 'var(--unmute-text-muted)' }"
    >
      <i
        class="nav-icon"
        :class="$route.path === '/discover' ? 'ri-compass-3-fill scale-110' : 'ri-compass-3-line'"
      ></i>
      <span class="nav-label">Discover</span>
      <span
        v-if="$route.path === '/discover'"
        class="position-absolute bottom-0 rounded-pill shadow-sm nav-indicator"
        style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Matches -->
    <router-link
      to="/matches"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-3 position-relative text-decoration-none"
      :class="$route.path === '/matches' ? 'fw-bold' : ''"
      :style="$route.path === '/matches' ? { color: 'var(--unmute-primary)' } : { color: 'var(--unmute-text-muted)' }"
    >
      <i
        class="nav-icon"
        :class="$route.path === '/matches' ? 'ri-sparkling-fill scale-110' : 'ri-sparkling-line'"
      ></i>
      <span class="nav-label">Matches</span>
      <span
        v-if="$route.path === '/matches'"
        class="position-absolute bottom-0 rounded-pill shadow-sm nav-indicator"
        style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Chat / Messages -->
    <router-link
      to="/chat"
      class="position-relative d-flex flex-column align-items-center py-1 px-2 rounded-3 text-decoration-none"
      :class="$route.path.startsWith('/chat') ? 'fw-bold' : ''"
      :style="$route.path.startsWith('/chat') ? { color: 'var(--unmute-primary)' } : { color: 'var(--unmute-text-muted)' }"
    >
      <div class="position-relative">
        <i
          class="nav-icon"
          :class="$route.path.startsWith('/chat') ? 'ri-message-3-fill scale-110' : 'ri-message-3-line'"
        ></i>
        <span
          v-if="chatStore.totalUnreadCount > 0"
          class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger text-white fw-bold"
          style="font-size: 0.55rem; padding: 0.15rem 0.35rem;"
        >
          {{ chatStore.totalUnreadCount }}
        </span>
      </div>
      <span class="nav-label">Messages</span>
      <span
        v-if="$route.path.startsWith('/chat')"
        class="position-absolute bottom-0 rounded-pill shadow-sm nav-indicator"
        style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Profile -->
    <router-link
      to="/profile"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-3 position-relative text-decoration-none"
      :class="$route.path === '/profile' ? 'fw-bold' : ''"
      :style="$route.path === '/profile' ? { color: 'var(--unmute-primary)' } : { color: 'var(--unmute-text-muted)' }"
    >
      <i
        class="nav-icon"
        :class="$route.path === '/profile' ? 'ri-user-3-fill scale-110' : 'ri-user-3-line'"
      ></i>
      <span class="nav-label">Profile</span>
      <span
        v-if="$route.path === '/profile'"
        class="position-absolute bottom-0 rounded-pill shadow-sm nav-indicator"
        style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Settings -->
    <router-link
      to="/settings"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-3 position-relative text-decoration-none"
      :class="$route.path === '/settings' ? 'fw-bold' : ''"
      :style="$route.path === '/settings' ? { color: 'var(--unmute-primary)' } : { color: 'var(--unmute-text-muted)' }"
    >
      <i
        class="nav-icon"
        :class="$route.path === '/settings' ? 'ri-settings-3-fill scale-110' : 'ri-settings-3-line'"
      ></i>
      <span class="nav-label">Settings</span>
      <span
        v-if="$route.path === '/settings'"
        class="position-absolute bottom-0 rounded-pill shadow-sm nav-indicator"
        style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();
</script>

<style scoped lang="scss">
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
  width: 1rem;
  height: 0.2rem;
}
</style>
