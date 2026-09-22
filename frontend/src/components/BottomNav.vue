<template>
  <nav
    class="d-md-none position-fixed start-0 end-0 bottom-0 m-3 z-3 surface-glass rounded-3xl border border-white/10 px-3 py-2 d-flex justify-content-around align-items-center user-select-none"
    style="box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), inset 0 1.5px 0 rgba(255, 255, 255, 0.2), inset 0 -2px 0 rgba(0, 0, 0, 0.4); z-index: 1030;"
  >
    <!-- Discover -->
    <router-link
      to="/discover"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-2xl position-relative text-decoration-none"
      :class="$route.path === '/discover' ? 'fw-bold' : 'text-secondary'"
      :style="$route.path === '/discover' ? { color: 'var(--unmute-primary)' } : {}"
    >
      <Compass style="width: 1.25rem; height: 1.25rem;" class="transition-transform" :class="{ 'scale-110': $route.path === '/discover' }" />
      <span style="font-size: 0.65rem;">Discover</span>
      <span
        v-if="$route.path === '/discover'"
        class="position-absolute bottom-0 rounded-pill shadow-sm"
        style="width: 1rem; height: 0.2rem; background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Matches -->
    <router-link
      to="/matches"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-2xl position-relative text-decoration-none"
      :class="$route.path === '/matches' ? 'fw-bold' : 'text-secondary'"
      :style="$route.path === '/matches' ? { color: 'var(--unmute-primary)' } : {}"
    >
      <Sparkles style="width: 1.25rem; height: 1.25rem;" class="transition-transform" :class="{ 'scale-110': $route.path === '/matches' }" />
      <span style="font-size: 0.65rem;">Matches</span>
      <span
        v-if="$route.path === '/matches'"
        class="position-absolute bottom-0 rounded-pill shadow-sm"
        style="width: 1rem; height: 0.2rem; background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Chat / Messages -->
    <router-link
      to="/chat"
      class="position-relative d-flex flex-column align-items-center py-1 px-2 rounded-2xl text-decoration-none"
      :class="$route.path.startsWith('/chat') ? 'fw-bold' : 'text-secondary'"
      :style="$route.path.startsWith('/chat') ? { color: 'var(--unmute-primary)' } : {}"
    >
      <div class="position-relative">
        <MessageSquare style="width: 1.25rem; height: 1.25rem;" class="transition-transform" :class="{ 'scale-110': $route.path.startsWith('/chat') }" />
        <span
          v-if="chatStore.totalUnreadCount > 0"
          class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger text-white fw-bold"
          style="font-size: 0.55rem; padding: 0.15rem 0.35rem;"
        >
          {{ chatStore.totalUnreadCount }}
        </span>
      </div>
      <span style="font-size: 0.65rem;">Messages</span>
      <span
        v-if="$route.path.startsWith('/chat')"
        class="position-absolute bottom-0 rounded-pill shadow-sm"
        style="width: 1rem; height: 0.2rem; background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Profile -->
    <router-link
      to="/profile"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-2xl position-relative text-decoration-none"
      :class="$route.path === '/profile' ? 'fw-bold' : 'text-secondary'"
      :style="$route.path === '/profile' ? { color: 'var(--unmute-primary)' } : {}"
    >
      <User style="width: 1.25rem; height: 1.25rem;" class="transition-transform" :class="{ 'scale-110': $route.path === '/profile' }" />
      <span style="font-size: 0.65rem;">Profile</span>
      <span
        v-if="$route.path === '/profile'"
        class="position-absolute bottom-0 rounded-pill shadow-sm"
        style="width: 1rem; height: 0.2rem; background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>

    <!-- Settings -->
    <router-link
      to="/settings"
      class="d-flex flex-column align-items-center py-1 px-2 rounded-2xl position-relative text-decoration-none"
      :class="$route.path === '/settings' ? 'fw-bold' : 'text-secondary'"
      :style="$route.path === '/settings' ? { color: 'var(--unmute-primary)' } : {}"
    >
      <Settings style="width: 1.25rem; height: 1.25rem;" class="transition-transform" :class="{ 'scale-110': $route.path === '/settings' }" />
      <span style="font-size: 0.65rem;">Settings</span>
      <span
        v-if="$route.path === '/settings'"
        class="position-absolute bottom-0 rounded-pill shadow-sm"
        style="width: 1rem; height: 0.2rem; background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
      ></span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { Compass, Sparkles, MessageSquare, User, Settings } from 'lucide-vue-next';
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();
</script>
