<template>
  <div
    :class="{ 'in-thread': activeConversationId || showingRequest }"
    class="chat-layout-container glass-pane flex-grow-1 d-flex flex-column flex-md-row overflow-hidden w-100 position-relative"
  >
    <!-- Conversations Sidebar (Desktop or Mobile when no active conversation) -->
    <div
      class="chat-sidebar border-end d-flex flex-column surface-glass flex-shrink-0 u-border-glass"
      :class="activeConversationId || showingRequest ? 'd-none d-md-flex' : 'd-flex'"
    >
      <div class="p-2 border-bottom u-border-glass">
        <h1 class="visually-hidden">Messages</h1>
        <div class="inbox-tabs" role="tablist" aria-label="Messages">
          <button
            id="tab-chats"
            type="button"
            role="tab"
            class="inbox-tab"
            :class="{ 'is-active': tab === 'chats' }"
            :aria-selected="tab === 'chats'"
            aria-controls="panel-chats"
            @click="setTab('chats')"
          >
            Chats
            <span v-if="chatStore.totalUnreadCount > 0" class="inbox-count u-fill-primary">{{ chatStore.totalUnreadCount }}</span>
          </button>
          <button
            id="tab-requests"
            type="button"
            role="tab"
            class="inbox-tab"
            :class="{ 'is-active': tab === 'requests' }"
            :aria-selected="tab === 'requests'"
            aria-controls="panel-requests"
            @click="setTab('requests')"
          >
            Requests
            <span v-if="chatStore.pendingRequestCount > 0" class="inbox-count u-fill-primary">{{ chatStore.pendingRequestCount }}</span>
          </button>
        </div>
      </div>

      <!-- Requests: incoming ones to decide on, and the ones you sent -->
      <div v-if="tab === 'requests'" id="panel-requests" role="tabpanel" aria-labelledby="tab-requests" class="flex-grow-1 overflow-y-auto">
        <div v-if="!chatStore.requestsLoaded" class="p-4 text-center small u-text-muted">Loading requests…</div>
        <div v-else-if="chatStore.requestsError" class="p-4 text-center small">
          <p class="mb-2 u-text-muted">{{ chatStore.requestsError }}</p>
          <UButton variant="secondary" size="sm" @click="chatStore.loadRequests()">Try again</UButton>
        </div>
        <template v-else>
          <div v-if="chatStore.incomingRequests.length === 0" class="p-4 text-center">
            <i class="ri-mail-open-line fs-3 d-block mb-2 u-text-dim" aria-hidden="true"></i>
            <p class="small fw-semibold mb-1 u-text-secondary">No message requests</p>
            <p class="extra-small mb-0 u-text-dim">When someone new messages you, you'll decide here whether to chat.</p>
          </div>
          <RequestCard
            v-for="req in chatStore.incomingRequests"
            :key="req.id"
            :request="req"
            :active="activeRequestId === req.id"
            :busy="requestBusy !== null"
            @open="openRequest(req.id)"
            @accept="acceptRequest(req.id)"
            @decline="declineRequest(req.id)"
            @block="blockFromRequest(req)"
          />

          <template v-if="chatStore.sentRequests.length">
            <h2 class="sent-heading">Sent</h2>
            <RequestCard
              v-for="req in chatStore.sentRequests"
              :key="req.id"
              :request="req"
              :active="activeRequestId === req.id"
              :busy="requestBusy !== null"
              @open="openRequest(req.id)"
              @cancel="cancelRequest(req.id)"
            />
          </template>
        </template>
      </div>

      <!-- Chats: approved conversations only -->
      <div v-else id="panel-chats" role="tabpanel" aria-labelledby="tab-chats" class="flex-grow-1 overflow-y-auto">
        <div v-if="chatStore.conversations.length === 0" class="p-4 text-center">
          <i class="ri-chat-smile-2-line fs-3 d-block mb-2 u-text-dim" aria-hidden="true"></i>
          <p class="small fw-semibold mb-1 u-text-secondary">No chats yet</p>
          <p class="extra-small mb-0 u-text-dim">Match with someone, or message someone from Discover to start talking.</p>
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
              <span v-if="conv.otherUser.presence?.online" class="online-dot" aria-hidden="true"></span>
            </div>

            <!-- Message Info -->
            <div class="min-w-0 flex-grow-1">
              <div class="d-flex align-items-center justify-content-between">
                <h3 class="fw-bold fs-6 mb-0 text-truncate u-text-primary">
                  {{ conv.otherUser.displayName }}
                </h3>
                <span v-if="conv.lastMessageAt" class="extra-small flex-shrink-0 ms-1 u-text-dim">
                  {{ formatTime(conv.lastMessageAt) }}
                </span>
                <span v-if="conv.unreadCount > 0" class="conv-unread">{{ conv.unreadCount }}<span class="visually-hidden"> unread</span></span>
              </div>

              <p class="small text-truncate mb-0 mt-1 u-text-muted">
                <span v-if="conv.lastMessage?.senderId === authStore.user?.id">You: </span>
                {{ conv.lastMessage ? conv.lastMessage.content || (conv.lastMessage.attachmentUrl ? '📷 Photo' : '') : 'Say hello...' }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Selected request -->
    <div v-if="showingRequest" class="flex-grow-1 d-flex flex-column chat-view-pane min-w-0">
      <RequestView
        :request="chatStore.activeRequest!"
        :busy="requestBusy"
        @back="closeRequest"
        @accept="acceptRequest(chatStore.activeRequest!.id)"
        @decline="declineRequest(chatStore.activeRequest!.id)"
        @cancel="cancelRequest(chatStore.activeRequest!.id)"
        @block="blockFromRequest(chatStore.activeRequest!)"
      />
    </div>

    <!-- Active Conversation View -->
    <div
      v-else
      class="flex-grow-1 d-flex flex-column chat-view-pane"
      :class="!activeConversationId ? 'd-none d-md-flex' : 'd-flex'"
    >
      <!-- Chat Header -->
      <div v-if="activeOtherUser" class="chat-header">
        <button type="button" class="d-md-none header-icon" aria-label="Back to messages" @click="backToList">
          <i class="ri-arrow-left-line" aria-hidden="true"></i>
        </button>
        <span class="header-avatar">
          <UAvatar :src="activeOtherUser.avatarUrl" :name="activeOtherUser.displayName" size="sm" />
          <span v-if="activeOtherUser.presence?.online" class="online-dot" aria-hidden="true"></span>
        </span>
        <div class="min-w-0 flex-grow-1">
          <h2 class="header-name text-truncate">{{ activeOtherUser.displayName }}</h2>
          <span v-if="headerStatus" class="header-status" :class="{ 'is-online': activeOtherUser.presence?.online }">
            <span class="status-dot" aria-hidden="true"></span>{{ headerStatus }}
          </span>
        </div>
        <button type="button" class="header-icon" aria-label="Block or report" title="Block or report" @click="isSafetyOpen = true">
          <i class="ri-more-2-fill" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Messages Stream -->
      <div
        ref="messagesContainer"
        class="flex-grow-1 overflow-y-auto p-3 p-sm-4 d-flex flex-column gap-3"
      >
        <div v-if="chatStore.loading" class="text-center small py-4 u-text-muted">
          Loading conversation...
        </div>

        <div v-else-if="activeConversationId && chatStore.activeMessages.length === 0" class="text-center py-5 px-3">
          <p class="small fw-medium mb-1 u-text-secondary">
            This is the beginning of your conversation with {{ activeOtherUser?.displayName }}.
          </p>
          <p class="extra-small mb-0 u-text-dim">
            Say something friendly, ask about their hobbies, or share a recommendation.
          </p>
        </div>

        <div v-if="!chatStore.loading && chatStore.hasMoreMessages" class="text-center">
          <UButton variant="ghost" size="sm" :loading="chatStore.loadingOlder" @click="loadOlder">
            Load earlier messages
          </UButton>
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
            :class="[msg.senderId === authStore.user?.id ? 'bubble-sent' : 'bubble-received', { 'has-photo': msg.attachmentUrl }]"
          >
            <button
              v-if="msg.attachmentUrl"
              type="button"
              class="bubble-photo"
              :aria-label="`Open photo from ${msg.senderId === authStore.user?.id ? 'you' : activeOtherUser?.displayName}`"
              @click="viewPhoto = msg.attachmentUrl"
            >
              <img :src="msg.attachmentUrl" alt="" loading="lazy" />
            </button>
            <p v-if="msg.content" class="mb-0 text-break u-pre-line">{{ msg.content }}</p>
          </div>

          <!-- Timestamp & status -->
          <div class="d-flex align-items-center gap-1 mt-1 extra-small px-1 u-text-dim">
            <span>{{ formatMessageTime(msg.createdAt) }}</span>
            <span v-if="msg.senderId === authStore.user?.id" class="read-state">
              <i v-if="msg.status === 'read'" class="ri-check-double-line is-read" aria-label="Read"></i>
              <i v-else class="ri-check-line" aria-label="Sent"></i>
            </span>
          </div>
        </div>
      </div>

      <!-- Message Input Box -->
      <div v-if="activeConversationId" class="chat-composer">
        <form class="composer-form" @submit.prevent="handleSend">
          <label for="chat-input" class="visually-hidden">Message</label>
          <div class="composer-field">
            <input
              id="chat-input"
              v-model="inputContent"
              type="text"
              placeholder="Type a message..."
              autocomplete="off"
              enterkeyhint="send"
              maxlength="2000"
            />
            <template v-if="photoUploads">
              <input ref="photoInput" type="file" accept="image/*" class="visually-hidden" tabindex="-1" aria-hidden="true" @change="onPhotoChosen" />
              <button type="button" class="composer-icon" aria-label="Send a photo" :disabled="chatStore.sending" @click="photoInput?.click()">
                <i class="ri-image-line" aria-hidden="true"></i>
              </button>
            </template>
          </div>
          <button type="submit" class="composer-send" aria-label="Send" :disabled="!inputContent.trim() || chatStore.sending">
            <i class="ri-send-plane-2-fill" aria-hidden="true"></i>
          </button>
        </form>
      </div>

      <!-- No active conversation placeholder on desktop -->
      <div v-else class="flex-grow-1 d-none d-md-flex flex-column align-items-center justify-content-center p-4 u-text-muted">
        <i class="ri-message-3-line display-5 mb-2 opacity-50"></i>
        <p class="small fw-semibold mb-0">
          {{ tab === 'requests' ? 'Select a request to see who wants to chat' : 'Select a conversation to start chatting' }}
        </p>
      </div>
    </div>

    <UModal :isOpen="Boolean(viewPhoto)" title="Photo" maxWidth="lg" @close="viewPhoto = null">
      <img v-if="viewPhoto" :src="viewPhoto" alt="Photo sent in this chat" class="photo-full" />
    </UModal>

    <!-- Safety Modal -->
    <SafetyModal
      v-if="safetyTarget"
      :is-open="isSafetyOpen"
      :target-user-id="safetyTarget.id"
      :target-name="safetyTarget.displayName"
      @close="isSafetyOpen = false"
      @action-completed="onSafetyCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SafetyModal from '../components/safety/SafetyModal.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UButton from '../components/ui/UButton.vue';
import RequestCard from '../components/chat/RequestCard.vue';
import UModal from '../components/ui/UModal.vue';
import { presenceLabel } from '../services/presence';
import { loadAuthConfig } from '../services/authConfig';
import RequestView from '../components/chat/RequestView.vue';
import type { ChatRequestDetail, ChatRequestSummary } from '../types';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';
import { useToastStore } from '../stores/toast';

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
const headerStatus = computed(() => presenceLabel(activeOtherUser.value?.presence));

// Photos in chat (when uploads are configured).
const photoUploads = ref(false);
const photoInput = ref<HTMLInputElement | null>(null);
const viewPhoto = ref<string | null>(null);
loadAuthConfig()
  .then((c) => (photoUploads.value = c.photoUploads))
  .catch(() => undefined);

async function onPhotoChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    await chatStore.sendPhoto(file);
    scrollToBottom();
  } catch (err: any) {
    useToastStore().error(`Photo not sent. ${err.message}`);
  }
}

// Tabs and the selected request live in the URL, so they survive reloads and notifications can link to them.
const tab = computed<'chats' | 'requests'>(() => (route.query.tab === 'requests' ? 'requests' : 'chats'));
const activeRequestId = computed(() => (typeof route.query.request === 'string' ? route.query.request : null));
const showingRequest = computed(() => tab.value === 'requests' && Boolean(chatStore.activeRequest) && !route.params.id);
const requestBusy = ref<'accept' | 'decline' | 'cancel' | null>(null);
const requestTarget = ref<{ id: string; displayName: string } | null>(null);
const safetyTarget = computed(() => requestTarget.value ?? activeOtherUser.value);

function setTab(next: 'chats' | 'requests') {
  router.push({ path: '/chat', query: next === 'requests' ? { tab: 'requests' } : {} });
}

function openRequest(id: string) {
  router.push({ path: '/chat', query: { tab: 'requests', request: id } });
}

function closeRequest() {
  router.push({ path: '/chat', query: { tab: 'requests' } });
}

async function showRequest(id: string | null) {
  if (!id) {
    chatStore.closeRequest();
    return;
  }
  try {
    await chatStore.openRequest(id);
  } catch {
    // Accepted, deleted, cancelled or blocked meanwhile: it is gone from the list too.
    useToastStore().info('This request is no longer available.');
    chatStore.closeRequest();
    chatStore.loadRequests();
    router.replace({ path: '/chat', query: { tab: 'requests' } });
  }
}

async function acceptRequest(id: string) {
  requestBusy.value = 'accept';
  try {
    const conversationId = await chatStore.acceptRequest(id);
    useToastStore().success('Request accepted. Say hello!');
    router.push(`/chat/${conversationId}`);
  } catch (err: any) {
    useToastStore().error(`Couldn't accept the request. ${err.message}`);
    chatStore.loadRequests();
  } finally {
    requestBusy.value = null;
  }
}

async function declineRequest(id: string) {
  requestBusy.value = 'decline';
  try {
    await chatStore.declineRequest(id);
    useToastStore().info('Request deleted.');
    if (activeRequestId.value === id) closeRequest();
  } catch (err: any) {
    useToastStore().error(`Couldn't delete the request. ${err.message}`);
  } finally {
    requestBusy.value = null;
  }
}

async function cancelRequest(id: string) {
  requestBusy.value = 'cancel';
  try {
    await chatStore.cancelRequest(id);
    useToastStore().info('Request cancelled.');
    if (activeRequestId.value === id) closeRequest();
  } catch (err: any) {
    useToastStore().error(`Couldn't cancel the request. ${err.message}`);
  } finally {
    requestBusy.value = null;
  }
}

function blockFromRequest(request: ChatRequestSummary | ChatRequestDetail) {
  requestTarget.value = { id: request.otherUser.id, displayName: request.otherUser.displayName };
  isSafetyOpen.value = true;
}

watch(activeRequestId, (id) => showRequest(id));
watch(isSafetyOpen, (open) => {
  if (!open) requestTarget.value = null;
});

onMounted(async () => {
  await Promise.all([chatStore.loadConversations(), chatStore.loadRequests()]);
  chatStore.initSocketHandlers();
  if (activeRequestId.value) await showRequest(activeRequestId.value);

  if (route.params.id) {
    await openFromRoute(route.params.id as string);
  }
});

/** Opens the routed conversation; an unavailable one (removed, blocked, not yours) returns to the list. */
async function openFromRoute(id: string) {
  try {
    await chatStore.openConversation(id);
    scrollToBottom();
  } catch (err: any) {
    useToastStore().error(`This conversation isn't available. ${err.message}`);
    router.replace('/chat');
  }
}

onUnmounted(() => {
  chatStore.leaveCurrentConversation();
  chatStore.closeRequest();
});

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      await openFromRoute(newId as string);
    } else {
      chatStore.leaveCurrentConversation();
    }
  }
);

// Follow new messages at the bottom; loading older history (prepended) keeps the reader's place.
watch(
  () => chatStore.activeMessages.at(-1)?.id,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  }
);

async function loadOlder() {
  const el = messagesContainer.value;
  const previousHeight = el?.scrollHeight ?? 0;
  await chatStore.loadOlderMessages();
  await nextTick();
  if (el) el.scrollTop += el.scrollHeight - previousHeight;
}

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
  try {
    await chatStore.sendMessage(text);
    scrollToBottom();
  } catch (err: any) {
    // Give the unsent text back rather than losing it.
    if (!inputContent.value) inputContent.value = text;
    useToastStore().error(`Message not sent. ${err.message}`);
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function onSafetyCompleted() {
  const fromRequest = Boolean(requestTarget.value);
  requestTarget.value = null;
  chatStore.leaveCurrentConversation();
  chatStore.closeRequest();
  chatStore.loadConversations();
  chatStore.loadRequests();
  router.push(fromRequest ? { path: '/chat', query: { tab: 'requests' } } : '/chat');
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
  border-radius: var(--unmute-radius-xl);
  // Phones, conversation list: the page minus the tab bar and the safe areas.
  height: calc(100svh - var(--unmute-tabbar-height) - var(--unmute-safe-bottom) - var(--unmute-safe-top) - 1.75rem);

  // Phones, open conversation (no tab bar): the composer sits at the bottom.
  &.in-thread {
    height: calc(100svh - var(--unmute-safe-top) - 2.25rem);
  }

  @media (min-width: 768px) {
    &,
    &.in-thread {
      height: calc(100vh - 4rem);
    }
  }
}

.chat-sidebar {
  width: 100%;
  @media (min-width: 768px) {
    width: 20rem;
  }
}

.chat-view-pane {
  background: var(--unmute-glass-surface);
}

.chat-conv-item {
  background-color: transparent;
  color: var(--unmute-text-primary);
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--unmute-surface-raised, #f8fafd);
  }

  &.conv-active {
    background-color: var(--unmute-surface-active, #e4ebf8);
  }
}

.active-conv-indicator {
  width: 4px;
  background-color: var(--unmute-primary, #8b5cf6);
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.chat-bubble {
  max-width: 78%;
  border-radius: 1.25rem;
  padding: 0.65rem 1rem;
  font-size: 0.9375rem;
  line-height: 1.4;

  &.bubble-sent {
    background: var(--unmute-primary-gradient);
    color: #ffffff;
    border-bottom-right-radius: 0.35rem;
  }

  &.bubble-received {
    background-color: var(--unmute-surface);
    color: var(--unmute-text-primary);
    border: 1px solid var(--unmute-glass-border);
    border-bottom-left-radius: 0.35rem;
  }

  &.has-photo {
    padding: 0.25rem;

    p {
      padding: 0.4rem 0.75rem 0.35rem;
    }
  }
}

.bubble-photo {
  display: block;
  padding: 0;
  border: 0;
  background: none;

  img {
    display: block;
    max-width: min(16rem, 60vw);
    max-height: 18rem;
    border-radius: 1rem;
    object-fit: cover;
  }
}

.photo-full {
  display: block;
  max-width: 100%;
  max-height: 75vh;
  margin: 0 auto;
  border-radius: var(--unmute-radius-md);
}

.read-state .is-read {
  color: var(--unmute-accent-text);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--unmute-glass-border);
  background: var(--unmute-surface);
}

.header-avatar {
  position: relative;
  flex-shrink: 0;
}

.header-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.header-status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--unmute-text-muted);

  .status-dot {
    display: none;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--unmute-success);
  }

  &.is-online .status-dot {
    display: inline-block;
  }
}

.header-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--unmute-text-secondary);
  font-size: 1.3rem;

  &:hover {
    background: var(--unmute-surface-overlay);
    color: var(--unmute-text-primary);
  }
}

.online-dot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: var(--unmute-success);
  box-shadow: 0 0 0 2px var(--unmute-surface);
}

.conv-unread {
  flex-shrink: 0;
  min-width: 1.25rem;
  margin-left: 0.4rem;
  padding: 0 0.35rem;
  border-radius: 9999px;
  background: var(--unmute-primary);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1.25rem;
  text-align: center;
}

.chat-composer {
  padding: 0.75rem;
  padding-bottom: calc(0.75rem + var(--unmute-safe-bottom));
  border-top: 1px solid var(--unmute-glass-border);
  background: var(--unmute-surface);

  @media (min-width: 768px) {
    padding-bottom: 0.75rem;
  }
}

.composer-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.composer-field {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 2.9rem;
  padding: 0 0.35rem 0 1rem;
  border-radius: var(--unmute-radius-pill);
  border: 1px solid var(--unmute-input-border);
  background: var(--unmute-input-bg);

  &:focus-within {
    border-color: var(--unmute-primary);
    box-shadow: 0 0 0 3px var(--unmute-primary-surface);
  }

  input[type='text'] {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--unmute-text-primary);
    font-size: 0.9375rem;

    &::placeholder {
      color: var(--unmute-text-dim);
    }
  }
}

.composer-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--unmute-text-muted);
  font-size: 1.2rem;

  &:hover:not(:disabled) {
    color: var(--unmute-accent-text);
  }
}

.composer-send {
  flex-shrink: 0;
  width: 2.9rem;
  height: 2.9rem;
  border: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.15rem;
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary);

  &:disabled {
    opacity: 0.5;
  }
}

.extra-small {
  font-size: 0.6875rem;
}

.inbox-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: var(--unmute-radius-md, 14px);
  background: var(--unmute-surface-raised, #f8fafd);
}

.inbox-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: calc(var(--unmute-radius-md, 14px) - 4px);
  background: transparent;
  color: var(--unmute-text-secondary);
  font-weight: 700;
  font-size: 0.875rem;
  transition: background-color 0.15s ease, color 0.15s ease;

  &.is-active {
    background: var(--unmute-surface, #fff);
    color: var(--unmute-text-primary);
    box-shadow: var(--unmute-shadow-sm);
  }

  &:focus-visible {
    outline: 2px solid var(--unmute-primary);
    outline-offset: 2px;
  }
}

.inbox-count {
  min-width: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 999px;
  color: #fff;
  font-size: 0.6875rem;
  line-height: 1.25rem;
  text-align: center;
}

.sent-heading {
  margin: 0;
  padding: 1rem 0.875rem 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--unmute-text-dim);
}
</style>
