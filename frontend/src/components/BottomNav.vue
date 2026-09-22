<template>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 px-6 flex justify-around items-center">
    <!-- Discover -->
    <router-link
      to="/discover"
      class="flex flex-col items-center gap-1 text-xs transition-colors py-1 px-3 rounded-xl"
      :class="$route.path === '/discover' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'"
    >
      <Compass class="w-5 h-5" />
      <span>Discover</span>
    </router-link>

    <!-- Matches -->
    <router-link
      to="/matches"
      class="flex flex-col items-center gap-1 text-xs transition-colors py-1 px-3 rounded-xl"
      :class="$route.path === '/matches' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'"
    >
      <Sparkles class="w-5 h-5" />
      <span>Matches</span>
    </router-link>

    <!-- Chat / Messages -->
    <router-link
      to="/chat"
      class="relative flex flex-col items-center gap-1 text-xs transition-colors py-1 px-3 rounded-xl"
      :class="$route.path.startsWith('/chat') ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'"
    >
      <div class="relative">
        <MessageSquare class="w-5 h-5" />
        <span
          v-if="chatStore.totalUnreadCount > 0"
          class="absolute -top-1.5 -right-2 px-1.5 py-0.2 text-[9px] font-bold bg-pink-500 text-white rounded-full leading-none"
        >
          {{ chatStore.totalUnreadCount }}
        </span>
      </div>
      <span>Messages</span>
    </router-link>

    <!-- Profile -->
    <router-link
      to="/profile"
      class="flex flex-col items-center gap-1 text-xs transition-colors py-1 px-3 rounded-xl"
      :class="$route.path === '/profile' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'"
    >
      <User class="w-5 h-5" />
      <span>Profile</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { Compass, Sparkles, MessageSquare, User } from 'lucide-vue-next';
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();
</script>
