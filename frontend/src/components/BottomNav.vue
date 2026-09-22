<template>
  <nav class="md:hidden fixed bottom-3 left-4 right-4 z-40 surface-glass rounded-3xl border border-white/10 shadow-2xl px-5 py-2 flex justify-between items-center">
    <!-- Discover -->
    <router-link
      to="/discover"
      class="flex flex-col items-center gap-1 text-[11px] font-medium transition-all py-1 px-3 rounded-2xl relative"
      :class="$route.path === '/discover' ? 'text-brand-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <Compass class="w-5 h-5 transition-transform" :class="{ 'scale-110': $route.path === '/discover' }" />
      <span>Discover</span>
      <span
        v-if="$route.path === '/discover'"
        class="absolute -bottom-1 w-4 h-1 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 shadow-sm shadow-brand-500"
      ></span>
    </router-link>

    <!-- Matches -->
    <router-link
      to="/matches"
      class="flex flex-col items-center gap-1 text-[11px] font-medium transition-all py-1 px-3 rounded-2xl relative"
      :class="$route.path === '/matches' ? 'text-brand-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <Sparkles class="w-5 h-5 transition-transform" :class="{ 'scale-110': $route.path === '/matches' }" />
      <span>Matches</span>
      <span
        v-if="$route.path === '/matches'"
        class="absolute -bottom-1 w-4 h-1 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 shadow-sm shadow-brand-500"
      ></span>
    </router-link>

    <!-- Chat / Messages -->
    <router-link
      to="/chat"
      class="relative flex flex-col items-center gap-1 text-[11px] font-medium transition-all py-1 px-3 rounded-2xl"
      :class="$route.path.startsWith('/chat') ? 'text-brand-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <div class="relative">
        <MessageSquare class="w-5 h-5 transition-transform" :class="{ 'scale-110': $route.path.startsWith('/chat') }" />
        <span
          v-if="chatStore.totalUnreadCount > 0"
          class="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-extrabold bg-pink-500 text-white rounded-full leading-none shadow-sm shadow-pink-500/50"
        >
          {{ chatStore.totalUnreadCount }}
        </span>
      </div>
      <span>Messages</span>
      <span
        v-if="$route.path.startsWith('/chat')"
        class="absolute -bottom-1 w-4 h-1 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 shadow-sm shadow-brand-500"
      ></span>
    </router-link>

    <!-- Profile -->
    <router-link
      to="/profile"
      class="flex flex-col items-center gap-1 text-[11px] font-medium transition-all py-1 px-3 rounded-2xl relative"
      :class="$route.path === '/profile' ? 'text-brand-300 font-bold' : 'text-slate-400 hover:text-slate-200'"
    >
      <User class="w-5 h-5 transition-transform" :class="{ 'scale-110': $route.path === '/profile' }" />
      <span>Profile</span>
      <span
        v-if="$route.path === '/profile'"
        class="absolute -bottom-1 w-4 h-1 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 shadow-sm shadow-brand-500"
      ></span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { Compass, Sparkles, MessageSquare, User } from 'lucide-vue-next';
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();
</script>
