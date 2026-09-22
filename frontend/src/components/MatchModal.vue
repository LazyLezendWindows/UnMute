<template>
  <UModal
    :is-open="Boolean(match)"
    max-width="sm"
    @close="dismiss"
  >
    <div v-if="match" class="text-center space-y-5 py-2">
      <!-- Badge -->
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold shadow-sm shadow-brand-500/20">
        <Sparkles class="w-3.5 h-3.5 text-brand-400 animate-spin-slow" />
        <span>Mutual Connection</span>
      </div>

      <!-- Connected Avatars with 3D overlap -->
      <div class="flex items-center justify-center -space-x-5 py-3">
        <div class="relative z-10 scale-100 hover:scale-105 transition-transform">
          <UAvatar
            :src="myAvatar"
            name="You"
            size="2xl"
            :border="true"
          />
        </div>
        <div class="relative z-20 scale-105 hover:scale-110 transition-transform">
          <UAvatar
            :src="match.matchedUser.avatarUrl"
            :name="match.matchedUser.displayName"
            size="2xl"
            :border="true"
          />
        </div>
      </div>

      <!-- Title & Philosophy -->
      <div class="space-y-1">
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          You and {{ match.matchedUser.displayName }} clicked!
        </h2>
        <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
          No awkward pickup lines needed. Connect on your shared interests without the pressure.
        </p>
      </div>

      <!-- Quick Conversation Starter -->
      <div class="space-y-2.5 pt-1">
        <input
          v-model="quickMessage"
          type="text"
          placeholder="Say hello or ask about their interests..."
          class="w-full bg-slate-850 border border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
          @keyup.enter="sendAndOpen"
        />

        <UButton
          variant="primary"
          size="lg"
          block
          @click="sendAndOpen"
        >
          Send & Open Chat
        </UButton>
      </div>

      <!-- Dismiss Button -->
      <button
        type="button"
        @click="dismiss"
        class="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors pt-1"
      >
        Keep discovering for now
      </button>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import UModal from './ui/UModal.vue';
import UAvatar from './ui/UAvatar.vue';
import UButton from './ui/UButton.vue';
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
