<template>
  <div v-if="match" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
    <div class="bg-gradient-to-b from-slate-900 to-slate-950 border border-brand-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-5">
      <!-- Badge -->
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold">
        <Sparkles class="w-3.5 h-3.5 text-brand-400 animate-spin-slow" />
        <span>Mutual Connection</span>
      </div>

      <!-- Avatars connection -->
      <div class="flex items-center justify-center -space-x-4 py-2">
        <div class="w-20 h-20 rounded-full border-4 border-slate-900 overflow-hidden shadow-xl bg-slate-800">
          <img
            v-if="myAvatar"
            :src="myAvatar"
            alt="You"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center font-bold text-lg text-brand-300">
            You
          </div>
        </div>
        <div class="w-20 h-20 rounded-full border-4 border-brand-500/60 overflow-hidden shadow-xl bg-slate-800 ring-2 ring-brand-500/40">
          <img
            v-if="match.matchedUser.avatarUrl"
            :src="match.matchedUser.avatarUrl"
            alt="Matched user"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center font-bold text-lg text-pink-300">
            {{ match.matchedUser.displayName.charAt(0) }}
          </div>
        </div>
      </div>

      <!-- Title & Philosophy -->
      <div>
        <h2 class="text-xl font-extrabold text-white tracking-tight">
          You and {{ match.matchedUser.displayName }} clicked!
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          No awkward pickup lines needed. Connect on your shared interests without the pressure.
        </p>
      </div>

      <!-- Quick Conversation Starter -->
      <div class="space-y-2">
        <input
          v-model="quickMessage"
          type="text"
          placeholder="Say hello or ask about their interests..."
          @keyup.enter="sendAndOpen"
          class="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div class="flex gap-2">
          <button
            type="button"
            @click="sendAndOpen"
            class="flex-1 py-2.5 px-4 bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 transition-all"
          >
            Send & Open Chat
          </button>
        </div>
      </div>

      <!-- Dismiss Button -->
      <button
        type="button"
        @click="dismiss"
        class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Keep discovering for now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';

const props = defineProps<{
  match: {
    conversationId: string;
    matchedUser: {
      id: string;
      displayName: string;
      age: number;
      avatarUrl?: string;
    };
  } | null;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();

const quickMessage = ref('');
const myAvatar = computed(() => authStore.profile?.avatarUrl);

function dismiss() {
  quickMessage.value = '';
  emit('dismiss');
}

async function sendAndOpen() {
  if (!props.match) return;
  const conversationId = props.match.conversationId;

  if (quickMessage.value.trim()) {
    try {
      await chatStore.openConversation(conversationId);
      await chatStore.sendMessage(quickMessage.value.trim());
    } catch (err) {
      console.error(err);
    }
  }

  dismiss();
  router.push(`/chat/${conversationId}`);
}
</script>
