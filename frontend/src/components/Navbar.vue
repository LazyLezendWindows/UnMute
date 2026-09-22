<template>
  <header class="sticky top-0 z-30 surface-glass border-b border-white/5 shadow-lg">
    <div class="container max-w-4xl px-4 h-16 flex items-center justify-between">
      <!-- Brand Logo -->
      <router-link to="/discover" class="flex items-center gap-2.5 group select-none">
        <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-pink-500 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 group-active:scale-95 transition-transform">
          <svg class="w-5 h-5 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
            Unmute
          </span>
          <span class="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:inline">
            Connect without the pressure
          </span>
        </div>
      </router-link>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/60 border border-white/5">
        <router-link
          to="/discover"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative"
          :class="$route.path === '/discover' ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-md shadow-brand-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          Discover
        </router-link>
        <router-link
          to="/matches"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative"
          :class="$route.path === '/matches' ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-md shadow-brand-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          Matches
        </router-link>
        <router-link
          to="/chat"
          class="relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
          :class="$route.path.startsWith('/chat') ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-md shadow-brand-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          Messages
          <span
            v-if="chatStore.totalUnreadCount > 0"
            class="absolute top-1 -right-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-pink-500 text-white rounded-full leading-none shadow-sm shadow-pink-500/50"
          >
            {{ chatStore.totalUnreadCount }}
          </span>
        </router-link>
        <router-link
          to="/safety"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
          :class="$route.path === '/safety' ? 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-md shadow-brand-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          Safety
        </router-link>
      </nav>

      <!-- Profile Avatar & Actions -->
      <div class="flex items-center gap-2">
        <router-link
          v-if="authStore.isAuthenticated"
          to="/profile"
          class="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700/60"
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
import UAvatar from './ui/UAvatar.vue';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';

const authStore = useAuthStore();
const chatStore = useChatStore();
</script>
