<template>
  <header class="sticky top-0 z-30 surface-glass border-b border-white/5 shadow-lg transition-colors">
    <div class="container max-w-4xl px-4 h-16 flex items-center justify-between">
      <!-- Brand Logo -->
      <router-link to="/discover" class="flex items-center gap-2.5 group select-none">
        <div
          class="w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-transform"
          style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-glow-primary);"
        >
          <svg class="w-5 h-5 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-lg tracking-tight" style="color: var(--unmute-text-primary);">
            Unmute
          </span>
          <span class="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:inline">
            Connect without the pressure
          </span>
        </div>
      </router-link>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-1.5 p-1 rounded-2xl surface-raised border border-white/5">
        <router-link
          to="/discover"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative"
          :class="$route.path === '/discover' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-100'"
          :style="$route.path === '/discover' ? { background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' } : {}"
        >
          Discover
        </router-link>
        <router-link
          to="/matches"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative"
          :class="$route.path === '/matches' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-100'"
          :style="$route.path === '/matches' ? { background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' } : {}"
        >
          Matches
        </router-link>
        <router-link
          to="/chat"
          class="relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
          :class="$route.path.startsWith('/chat') ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-100'"
          :style="$route.path.startsWith('/chat') ? { background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' } : {}"
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
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
          :class="$route.path === '/safety' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-100'"
          :style="$route.path === '/safety' ? { background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' } : {}"
        >
          Safety
        </router-link>
        <router-link
          to="/settings"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
          :class="$route.path === '/settings' ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-100'"
          :style="$route.path === '/settings' ? { background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' } : {}"
        >
          Settings
        </router-link>
      </nav>

      <!-- Right Actions: Theme Toggle, Settings, & Profile Avatar -->
      <div class="flex items-center gap-2">
        <!-- Quick Dark/Light Mode Toggle -->
        <button
          type="button"
          @click="themeStore.toggleMode()"
          class="p-2 rounded-xl text-slate-400 hover:text-white transition-all surface-raised border border-white/5 active:scale-95"
          :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <Sun v-if="themeStore.isDarkMode" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-purple-600" />
        </button>

        <!-- Settings icon shortcut for mobile -->
        <router-link
          to="/settings"
          class="md:hidden p-2 rounded-xl text-slate-400 hover:text-white transition-all surface-raised border border-white/5 active:scale-95"
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
