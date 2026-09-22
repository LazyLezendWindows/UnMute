<template>
  <div class="space-y-6 max-w-2xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-extrabold text-white tracking-tight">Your Matches</h1>
        <p class="text-xs text-slate-400">People you connected with mutually</p>
      </div>
      <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-brand-300 border border-slate-700">
        {{ chatStore.matches.length }} Matches
      </span>
    </div>

    <!-- Empty State -->
    <div
      v-if="chatStore.matches.length === 0"
      class="text-center py-16 px-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3"
    >
      <div class="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
        <Sparkles class="w-6 h-6" />
      </div>
      <h3 class="text-base font-bold text-white">No matches yet</h3>
      <p class="text-xs text-slate-400 max-w-xs mx-auto">
        When someone you like also likes you back, they will appear here and you can chat freely.
      </p>
      <router-link
        to="/discover"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-pink-600 text-white text-xs font-bold rounded-xl shadow-md transition-all"
      >
        <span>Discover People</span>
      </router-link>
    </div>

    <!-- Matches Grid / List -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="match in chatStore.matches"
        :key="match.matchId"
        class="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-lg"
      >
        <div class="flex items-start gap-3">
          <div class="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
            <img
              v-if="match.user.avatarUrl"
              :src="match.user.avatarUrl"
              :alt="match.user.displayName"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div v-else class="w-full h-full flex items-center justify-center font-bold text-brand-400">
              {{ match.user.displayName.charAt(0) }}
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <h3 class="font-bold text-sm text-white truncate">
                {{ match.user.displayName }}, {{ match.user.age }}
              </h3>
            </div>
            <p v-if="match.user.approximateLocation" class="text-[11px] text-slate-400 truncate">
              {{ match.user.approximateLocation }}
            </p>
            <!-- Interests -->
            <div v-if="match.user.interests && match.user.interests.length > 0" class="flex flex-wrap gap-1 mt-1.5">
              <span
                v-for="int in match.user.interests.slice(0, 2)"
                :key="int"
                class="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-brand-300 border border-slate-750"
              >
                {{ int }}
              </span>
            </div>
          </div>
        </div>

        <!-- Chat button -->
        <router-link
          :to="`/chat/${match.conversationId}`"
          class="mt-4 w-full py-2 bg-slate-800 hover:bg-brand-600/90 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60 hover:border-brand-500"
        >
          <MessageSquare class="w-3.5 h-3.5" />
          <span v-if="match.lastMessage">Continue Conversation</span>
          <span v-else>Say Hello</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { Sparkles, MessageSquare } from 'lucide-vue-next';
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();

onMounted(() => {
  chatStore.loadMatches();
});
</script>
