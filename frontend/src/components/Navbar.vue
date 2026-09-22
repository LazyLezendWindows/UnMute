<template>
  <header class="sticky top-0 z-30 surface-glass border-b border-white/5 shadow-lg transition-colors">
    <div class="container max-w-4xl px-4 h-16 flex items-center justify-between">
      <!-- Brand Logo -->
      <router-link to="/discover" class="flex items-center gap-2.5 group select-none">
        <div
          class="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform"
          style="background: var(--unmute-primary-gradient); box-shadow: 0 3px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);"
        >
          <svg class="w-5 h-5 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="font-display font-extrabold text-xl tracking-tight leading-none" style="color: var(--unmute-text-primary);">
            Unmute
          </span>
          <span class="text-[10px] font-medium tracking-wide mt-0.5 hidden sm:inline" style="color: var(--unmute-text-muted);">
            Connect without the pressure
          </span>
        </div>
      </router-link>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl surface-raised border border-white/5 shadow-inner">
        <router-link
          to="/discover"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative select-none"
          :class="$route.path === '/discover' ? 'text-white' : 'hover:text-white'"
          :style="$route.path === '/discover' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Discover
        </router-link>
        <router-link
          to="/matches"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative select-none"
          :class="$route.path === '/matches' ? 'text-white' : 'hover:text-white'"
          :style="$route.path === '/matches' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Matches
        </router-link>
        <router-link
          to="/chat"
          class="relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all select-none"
          :class="$route.path.startsWith('/chat') ? 'text-white' : 'hover:text-white'"
          :style="$route.path.startsWith('/chat') ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Messages
          <span
            v-if="chatStore.totalUnreadCount > 0"
            class="absolute top-1 -right-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-500 text-white rounded-full leading-none shadow-sm shadow-rose-500/50"
          >
            {{ chatStore.totalUnreadCount }}
          </span>
        </router-link>
        <router-link
          to="/safety"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all select-none"
          :class="$route.path === '/safety' ? 'text-white' : 'hover:text-white'"
          :style="$route.path === '/safety' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Safety
        </router-link>
        <router-link
          to="/settings"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all select-none"
          :class="$route.path === '/settings' ? 'text-white' : 'hover:text-white'"
          :style="$route.path === '/settings' ? { background: 'var(--unmute-primary-gradient)', boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular)' } : { color: 'var(--unmute-text-secondary)' }"
        >
          Settings
        </router-link>
      </nav>

      <!-- Right Actions: Theme Toggle, Settings, & Profile Avatar -->
      <div class="flex items-center gap-2">
        <!-- Quick Dark/Light Mode Toggle with 3D tactile button feel -->
        <button
          type="button"
          @click="themeStore.toggleMode()"
          class="p-2.5 rounded-xl transition-all surface-raised border border-white/10 active:translate-y-0.5 select-none"
          style="box-shadow: 0 2px 0 var(--unmute-glass-border), var(--unmute-3d-specular);"
          :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <Sun v-if="themeStore.isDarkMode" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4" style="color: var(--unmute-primary);" />
        </button>

        <!-- Settings icon shortcut for mobile -->
        <router-link
          to="/settings"
          class="md:hidden p-2.5 rounded-xl transition-all surface-raised border border-white/10 active:translate-y-0.5 select-none"
          style="box-shadow: 0 2px 0 var(--unmute-glass-border), var(--unmute-3d-specular); color: var(--unmute-text-secondary);"
          title="Settings"
        >
          <Settings class="w-4 h-4" />
        </router-link>

        <router-link
          v-if="authStore.isAuthenticated"
          to="/profile"
          class="flex items-center gap-2.5 p-1.5 rounded-2xl transition-all border border-transparent hover:border-white/10"
        >
          <UAvatar
            :src="authStore.profile?.avatarUrl"
            :name="authStore.profile?.displayName || 'User'"
            size="sm"
            :border="true"
          />
          <span class="hidden sm:inline text-xs font-semibold text-slate-200">
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
