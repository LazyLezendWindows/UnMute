<template>
  <header class="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
    <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
      <!-- Brand Logo -->
      <router-link to="/discover" class="flex items-center gap-2.5 group">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-pink-500 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Unmute
          </span>
          <span class="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:inline">
            Connect without the pressure
          </span>
        </div>
      </router-link>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-1">
        <router-link
          to="/discover"
          class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/discover' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'"
        >
          Discover
        </router-link>
        <router-link
          to="/matches"
          class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/matches' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'"
        >
          Matches
        </router-link>
        <router-link
          to="/chat"
          class="relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="$route.path.startsWith('/chat') ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'"
        >
          Messages
          <span
            v-if="chatStore.totalUnreadCount > 0"
            class="absolute top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-pink-500 text-white rounded-full leading-none"
          >
            {{ chatStore.totalUnreadCount }}
          </span>
        </router-link>
        <router-link
          to="/safety"
          class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="$route.path === '/safety' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'"
        >
          Safety
        </router-link>
      </nav>

      <!-- Profile Avatar & Actions -->
      <div class="flex items-center gap-2">
        <router-link
          v-if="authStore.isAuthenticated"
          to="/profile"
          class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
            <img
              v-if="authStore.profile?.avatarUrl"
              :src="authStore.profile.avatarUrl"
              alt="Avatar"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs font-semibold text-brand-400">
              {{ (authStore.profile?.displayName || 'U').charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="hidden sm:inline text-xs font-medium text-slate-300">
            {{ authStore.profile?.displayName || 'Profile' }}
          </span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';

const authStore = useAuthStore();
const chatStore = useChatStore();
</script>
