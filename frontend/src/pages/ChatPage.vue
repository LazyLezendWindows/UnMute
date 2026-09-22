<template>
  <div
    class="chat-layout-container flex-grow-1 d-flex flex-column flex-md-row surface-raised rounded-4 overflow-hidden max-w-4xl mx-auto w-100 position-relative border"
    style="box-shadow: var(--unmute-shadow-3d), var(--unmute-3d-card-rim); border-color: var(--unmute-border) !important;"
  >
    <!-- Conversations Sidebar (Desktop or Mobile when no active conversation) -->
    <div
      class="chat-sidebar border-end d-flex flex-column surface-glass flex-shrink-0"
      :class="activeConversationId ? 'd-none d-md-flex' : 'd-flex w-100'"
      style="border-color: var(--unmute-border) !important;"
    >
      <div class="p-3 border-bottom d-flex align-items-center justify-content-between" style="border-color: var(--unmute-border) !important;">
        <h2 class="font-display fw-bold fs-6 mb-0 tracking-tight" style="color: var(--unmute-text-primary);">Conversations</h2>
        <span
          v-if="chatStore.totalUnreadCount > 0"
          class="badge rounded-pill text-white shadow-sm"
          :style="{ background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' }"
        >
          {{ chatStore.totalUnreadCount }} new
        </span>
      </div>

      <!-- Conversations List -->
      <div class="flex-grow-1 overflow-y-auto">
        <div v-if="chatStore.conversations.length === 0" class="p-4 text-center text-muted small">
          No conversations yet. Match with someone to start talking!
        </div>

        <div class="list-group list-group-flush">
          <button
            v-for="conv in chatStore.conversations"
            :key="conv.id"
            type="button"
            @click="selectConversation(conv.id)"
            class="list-group-item list-group-item-action d-flex align-items-center gap-3 p-3 text-start border-0 position-relative user-select-none chat-conv-item"
            :class="{ 'conv-active': activeConversationId === conv.id }"
          >
            <!-- Active accent indicator bar -->
            <span
              v-if="activeConversationId === conv.id"
              class="active-conv-indicator position-absolute start-0 top-0 bottom-0"
            ></span>

            <!-- Avatar with unread indicator -->
            <div class="position-relative">
              <UAvatar
                :src="conv.otherUser.avatarUrl"
                :name="conv.otherUser.displayName"
                size="md"
              />
              <span
                v-if="conv.unreadCount > 0"
                class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
              ></span>
            </div>

            <!-- Message Info -->
            <div class="min-w-0 flex-grow-1">
              <div class="d-flex align-items-center justify-content-between">
                <h4 class="fw-bold fs-6 mb-0 text-white text-truncate">
                  {{ conv.otherUser.displayName }}
                </h4>
                <span v-if="conv.lastMessageAt" class="extra-small text-muted flex-shrink-0 ms-1">
                  {{ formatTime(conv.lastMessageAt) }}
                </span>
              </div>

              <p class="small text-white-50 text-truncate mb-0 mt-1">
                <span v-if="conv.lastMessage?.senderId === authStore.user?.id" class="text-muted">You: </span>
                {{ conv.lastMessage?.content || 'Say hello...' }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Conversation View -->
    <div
      class="flex-grow-1 d-flex flex-column chat-view-pane"
      :class="!activeConversationId ? 'd-none d-md-flex' : 'd-flex'"
    >
      <!-- Chat Header -->
      <div v-if="activeOtherUser" class="px-3 py-2 border-bottom d-flex align-items-center justify-content-between surface-glass" style="border-color: var(--unmute-border) !important;">
        <div class="d-flex align-items-center gap-2">
          <!-- Back button on mobile -->
          <button
            type="button"
            @click="backToList"
            class="d-md-none btn btn-sm btn-link text-white-50 p-1 me-1"
          >
            <ChevronLeft class="icon-sm" />
          </button>

          <UAvatar
            :src="activeOtherUser.avatarUrl"
            :name="activeOtherUser.displayName"
            size="sm"
            :online="true"
          />

          <div>
            <h3 class="fw-bold fs-6 text-white mb-0">
              {{ activeOtherUser.displayName }}, {{ activeOtherUser.age }}
            </h3>
            <span class="extra-small text-success fw-medium d-block">Connected</span>
          </div>
        </div>

        <!-- Safety Menu (Block / Report) -->
        <button
          type="button"
          @click="isSafetyOpen = true"
          class="btn btn-sm btn-outline-secondary border-0 text-white-50 p-2 rounded-circle"
          title="Safety options"
        >
          <ShieldAlert class="icon-sm" />
        </button>
      </div>

      <!-- Messages Stream -->
      <div
        ref="messagesContainer"
        class="flex-grow-1 overflow-y-auto p-3 p-sm-4 d-flex flex-column gap-3"
      >
        <div v-if="chatStore.loading" class="text-center small text-muted py-4">
          Loading conversation...
        </div>

        <div v-else-if="chatStore.activeMessages.length === 0" class="text-center py-5 px-3">
          <p class="small text-white-50 fw-medium mb-1">
            This is the beginning of your conversation with {{ activeOtherUser?.displayName }}.
          </p>
          <p class="extra-small text-muted mb-0">
            Say something friendly, ask about their hobbies, or share a recommendation.
          </p>
        </div>

        <!-- Messages -->
        <div
          v-for="msg in chatStore.activeMessages"
          :key="msg.id"
          class="d-flex flex-column"
          :class="msg.senderId === authStore.user?.id ? 'align-items-end' : 'align-items-start'"
        >
          <div
            class="chat-bubble position-relative overflow-hidden"
            :class="
              msg.senderId === authStore.user?.id
                ? 'bubble-sent'
                : 'bubble-received'
            "
            :style="
              msg.senderId === authStore.user?.id
                ? {
                    background: 'var(--unmute-primary-gradient)',
                    boxShadow: '0 2px 0 var(--unmute-primary-bevel), var(--unmute-3d-specular)'
                  }
                : {}
            "
          >
            <!-- Top highlight on sent bubble -->
            <div
              v-if="msg.senderId === authStore.user?.id"
              class="bubble-specular position-absolute top-0 start-0 end-0"
            ></div>

            <p class="mb-0 text-break" style="white-space: pre-line;">{{ msg.content }}</p>
          </div>

          <!-- Timestamp & status -->
          <div class="d-flex align-items-center gap-1 mt-1 extra-small text-muted px-1">
            <span>{{ formatMessageTime(msg.createdAt) }}</span>
            <span v-if="msg.senderId === authStore.user?.id">
              <span v-if="msg.status === 'read'" class="fw-bold" style="color: var(--unmute-primary-light);">✓✓</span>
              <span v-else>✓</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Message Input Box -->
      <div v-if="activeConversationId" class="p-3 border-top surface-glass" style="border-color: var(--unmute-border) !important;">
        <form @submit.prevent="handleSend" class="d-flex align-items-center gap-2">
          <input
            v-model="inputContent"
            type="text"
            placeholder="Type a message without pressure..."
            class="form-control rounded-pill px-3 py-2"
            style="background-color: var(--unmute-input-bg); color: var(--unmute-text-primary); border: 1px solid var(--unmute-input-border);"
          />
          <UButton
            type="submit"
            variant="primary"
            size="md"
            :disabled="!inputContent.trim() || chatStore.sending"
            class="flex-shrink-0 rounded-circle"
          >
            <Send class="icon-sm" />
          </UButton>
        </form>
      </div>

      <!-- No active conversation placeholder on desktop -->
      <div v-else class="flex-grow-1 d-none d-md-flex flex-column align-items-center justify-content-center text-muted p-4">
        <MessageSquare class="icon-xl mb-2 text-white-50" />
        <p class="small fw-semibold mb-0">Select a conversation to start chatting</p>
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

<style scoped lang="scss">
.chat-layout-container {
  height: calc(100vh - 8.5rem);
  @media (min-width: 768px) {
    height: calc(100vh - 10rem);
  }
}

.chat-sidebar {
  width: 100%;
  @media (min-width: 768px) {
    width: 20rem;
  }
}

.chat-view-pane {
  background-color: rgba(3, 7, 18, 0.4);
}

.chat-conv-item {
  background-color: transparent;
  color: var(--unmute-text-primary);
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--unmute-surface-raised, #161e31);
    color: #ffffff;
  }

  &.conv-active {
    background-color: var(--unmute-surface-active, rgba(99, 102, 241, 0.1));
  }
}

.active-conv-indicator {
  width: 4px;
  background-color: var(--theme-primary, #6366f1);
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.chat-bubble {
  max-width: 80%;
  border-radius: var(--radius-lg, 18px);
  padding: 0.65rem 1rem;
  font-size: 0.875rem;

  &.bubble-sent {
    color: #ffffff;
    border-bottom-right-radius: 4px;
  }

  &.bubble-received {
    background-color: var(--unmute-surface-raised, #161e31);
    color: var(--unmute-text-primary, #ffffff);
    border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.08));
    border-bottom-left-radius: 4px;
  }
}

.bubble-specular {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.extra-small {
  font-size: 0.6875rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-xl {
  width: 3rem;
  height: 3rem;
}
</style>
