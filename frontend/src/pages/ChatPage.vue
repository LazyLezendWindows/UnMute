<template>
  <div
    class="flex-1 flex flex-col md:flex-row surface-raised rounded-3xl overflow-hidden h-[calc(100vh-8.5rem)] md:h-[calc(100vh-10rem)] max-w-4xl mx-auto w-full relative border border-white/10"
    style="box-shadow: var(--unmute-shadow-3d), var(--unmute-3d-card-rim);"
  >
    <!-- Conversations Sidebar (Desktop or Mobile when no active conversation) -->
    <div
      class="w-full md:w-80 border-r border-white/5 flex flex-col surface-glass shrink-0"
      :class="{ 'hidden md:flex': activeConversationId }"
    >
      <div class="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 class="font-display font-bold text-base tracking-tight" style="color: var(--unmute-text-primary);">Conversations</h2>
        <span
          v-if="chatStore.totalUnreadCount > 0"
          class="px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold shadow-sm"
          :style="{ background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' }"
        >
          {{ chatStore.totalUnreadCount }} new
        </span>
      </div>

      <!-- Conversations List -->
      <div class="flex-1 overflow-y-auto divide-y divide-slate-850">
        <div v-if="chatStore.conversations.length === 0" class="p-8 text-center text-slate-500 text-xs">
          No conversations yet. Match with someone to start talking!
        </div>

        <button
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          type="button"
          @click="selectConversation(conv.id)"
          class="w-full p-3.5 flex items-center gap-3 text-left transition-all hover:bg-slate-850 select-none relative"
          :class="{ 'bg-slate-850/90': activeConversationId === conv.id }"
        >
          <!-- Active accent indicator bar -->
          <span
            v-if="activeConversationId === conv.id"
            class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-500"
          ></span>

          <!-- Avatar with unread indicator -->
          <div class="relative">
            <UAvatar
              :src="conv.otherUser.avatarUrl"
              :name="conv.otherUser.displayName"
              size="md"
            />
            <span
              v-if="conv.unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-pink-500 rounded-full ring-2 ring-slate-900 animate-pulse"
            ></span>
          </div>

          <!-- Message Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-xs text-white truncate">
                {{ conv.otherUser.displayName }}
              </h4>
              <span v-if="conv.lastMessageAt" class="text-[10px] text-slate-500 shrink-0 ml-1">
                {{ formatTime(conv.lastMessageAt) }}
              </span>
            </div>

            <p class="text-xs text-slate-400 truncate mt-0.5">
              <span v-if="conv.lastMessage?.senderId === authStore.user?.id" class="text-slate-500">You: </span>
              {{ conv.lastMessage?.content || 'Say hello...' }}
            </p>
          </div>
        </button>
      </div>
    </div>

    <!-- Active Conversation View -->
    <div
      class="flex-1 flex flex-col bg-slate-950/60"
      :class="{ 'hidden md:flex': !activeConversationId }"
    >
      <!-- Chat Header -->
      <div v-if="activeOtherUser" class="px-4 py-3 border-b border-slate-800 flex items-center justify-between surface-glass">
        <div class="flex items-center gap-3">
          <!-- Back button on mobile -->
          <button
            type="button"
            @click="backToList"
            class="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>

          <UAvatar
            :src="activeOtherUser.avatarUrl"
            :name="activeOtherUser.displayName"
            size="sm"
            :online="true"
          />

          <div>
            <h3 class="font-bold text-xs sm:text-sm text-white">
              {{ activeOtherUser.displayName }}, {{ activeOtherUser.age }}
            </h3>
            <span class="text-[10px] text-emerald-400 font-medium block -mt-0.5">Connected</span>
          </div>
        </div>

        <!-- Safety Menu (Block / Report) -->
        <button
          type="button"
          @click="isSafetyOpen = true"
          class="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-850 transition-colors"
          title="Safety options"
        >
          <ShieldAlert class="w-4 h-4" />
        </button>
      </div>

      <!-- Messages Stream -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5"
      >
        <div v-if="chatStore.loading" class="text-center text-xs text-slate-500 py-8">
          Loading conversation...
        </div>

        <div v-else-if="chatStore.activeMessages.length === 0" class="text-center py-12 px-4 space-y-2">
          <p class="text-xs text-slate-400 font-medium">
            This is the beginning of your conversation with {{ activeOtherUser?.displayName }}.
          </p>
          <p class="text-[11px] text-slate-500">
            Say something friendly, ask about their hobbies, or share a recommendation.
          </p>
        </div>

        <!-- Messages -->
        <div
          v-for="msg in chatStore.activeMessages"
          :key="msg.id"
          class="flex flex-col"
          :class="msg.senderId === authStore.user?.id ? 'items-end' : 'items-start'"
        >
          <div
            class="max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-md transition-all relative overflow-hidden"
            :class="
              msg.senderId === authStore.user?.id
                ? 'text-white rounded-br-none'
                : 'surface-raised rounded-bl-none border border-white/5 shadow-sm'
            "
            :style="
              msg.senderId === authStore.user?.id
                ? {
                    background: 'var(--unmute-primary-gradient)',
                    boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-3d-specular)'
                  }
                : { color: 'var(--unmute-text-primary)' }
            "
          >
            <!-- Top highlight on sent bubble -->
            <div
              v-if="msg.senderId === authStore.user?.id"
              class="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            ></div>

            <p class="whitespace-pre-line break-words leading-relaxed">{{ msg.content }}</p>
          </div>

          <!-- Timestamp & status -->
          <div class="flex items-center gap-1 mt-1 text-[10px] text-slate-500 px-1">
            <span>{{ formatMessageTime(msg.createdAt) }}</span>
            <span v-if="msg.senderId === authStore.user?.id">
              <span v-if="msg.status === 'read'" class="font-semibold" style="color: var(--unmute-primary-light);">✓✓</span>
              <span v-else>✓</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Message Input Box -->
      <div v-if="activeConversationId" class="p-3 sm:p-4 border-t border-white/10 surface-glass">
        <form @submit.prevent="handleSend" class="flex items-center gap-2">
          <input
            v-model="inputContent"
            type="text"
            placeholder="Type a message without pressure..."
            class="flex-1 rounded-2xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm transition-all focus:outline-none"
            style="background-color: var(--unmute-input-bg); color: var(--unmute-text-primary); border: 1px solid var(--unmute-input-border); box-shadow: inset 0 2px 4px rgba(0,0,0,0.25);"
          />
          <UButton
            type="submit"
            variant="primary"
            size="md"
            :disabled="!inputContent.trim() || chatStore.sending"
            class="shrink-0"
          >
            <Send class="w-4 h-4" />
          </UButton>
        </form>
      </div>

      <!-- No active conversation placeholder on desktop -->
      <div v-else class="flex-1 hidden md:flex flex-col items-center justify-center text-slate-500 space-y-2 p-6">
        <MessageSquare class="w-12 h-12 stroke-[1.2]" />
        <p class="text-xs font-semibold">Select a conversation to start chatting</p>
      </div>
    </div>

    <!-- Safety Modal -->
    <SafetyModal
      v-if="activeOtherUser"
      :is-open="isSafetyOpen"
      :target-user-id="activeOtherUser.id"
      :target-name="activeOtherUser.displayName"
      @close="isSafetyOpen = false"
      @action-completed="onSafetyCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeft, Send, ShieldAlert, MessageSquare } from 'lucide-vue-next';
import SafetyModal from '../components/SafetyModal.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UButton from '../components/ui/UButton.vue';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();

const inputContent = ref('');
const isSafetyOpen = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const activeConversationId = computed(() => {
  return (route.params.id as string) || chatStore.activeConversationId;
});

const activeOtherUser = computed(() => chatStore.activeOtherUser);

onMounted(async () => {
  await chatStore.loadConversations();
  chatStore.initSocketHandlers();

  if (route.params.id) {
    await chatStore.openConversation(route.params.id as string);
    scrollToBottom();
  }
});

onUnmounted(() => {
  chatStore.leaveCurrentConversation();
});

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      await chatStore.openConversation(newId as string);
      scrollToBottom();
    } else {
      chatStore.leaveCurrentConversation();
    }
  }
);

watch(
  () => chatStore.activeMessages.length,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  }
);

function selectConversation(id: string) {
  router.push(`/chat/${id}`);
}

function backToList() {
  router.push('/chat');
}

async function handleSend() {
  const text = inputContent.value.trim();
  if (!text) return;
  inputContent.value = '';
  await chatStore.sendMessage(text);
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function onSafetyCompleted() {
  chatStore.leaveCurrentConversation();
  chatStore.loadConversations();
  router.push('/chat');
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
</script>
