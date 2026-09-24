import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, ApiError } from '../services/api';
import { getSocket } from '../services/socket';
import { useToastStore } from './toast';
import { Conversation, Match, Message } from '../types';

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([]);
  const matches = ref<Match[]>([]);
  const activeConversationId = ref<string | null>(null);
  const activeMessages = ref<Message[]>([]);
  const activeOtherUser = ref<any | null>(null);
  const loading = ref(false);
  const loadingOlder = ref(false);
  const hasMoreMessages = ref(false);
  const sending = ref(false);

  const totalUnreadCount = computed(() =>
    conversations.value.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0)
  );

  async function loadMatches() {
    try {
      const res = await api.get('/matches');
      matches.value = res.data.data;
    } catch (err: any) {
      useToastStore().error(`Couldn't load your matches. ${err.message}`);
    }
  }

  async function loadConversations() {
    try {
      const res = await api.get('/conversations');
      conversations.value = res.data.data;
    } catch (err: any) {
      useToastStore().error(`Couldn't load your conversations. ${err.message}`);
    }
  }

  /** Adds messages not already shown (REST, socket and retries can all deliver the same one). */
  function mergeMessages(incoming: Message[]) {
    const known = new Set(activeMessages.value.map((m) => m.id));
    const fresh = incoming.filter((m) => !known.has(m.id));
    if (fresh.length) activeMessages.value = [...activeMessages.value, ...fresh];
  }

  async function openConversation(conversationId: string) {
    activeConversationId.value = conversationId;
    loading.value = true;
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`);
      activeMessages.value = res.data.data.messages;
      activeOtherUser.value = res.data.data.otherUser;
      hasMoreMessages.value = Boolean(res.data.data.hasMore);

      // Live events only flow once the room is joined; anything sent in between is caught up.
      joinAndCatchUp(conversationId);

      // Decrement unread count locally
      const conv = conversations.value.find((c) => c.id === conversationId);
      if (conv) {
        conv.unreadCount = 0;
      }
    } catch (err: any) {
      activeConversationId.value = null;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /** Loads the page of history before the oldest message shown (cursor paging). */
  async function loadOlderMessages() {
    const conversationId = activeConversationId.value;
    const oldest = activeMessages.value[0];
    if (!conversationId || !oldest || loadingOlder.value || !hasMoreMessages.value) return;
    loadingOlder.value = true;
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`, { params: { before: oldest.id } });
      if (activeConversationId.value !== conversationId) return;
      const known = new Set(activeMessages.value.map((m) => m.id));
      activeMessages.value = [...res.data.data.messages.filter((m: Message) => !known.has(m.id)), ...activeMessages.value];
      hasMoreMessages.value = Boolean(res.data.data.hasMore);
    } catch (err: any) {
      useToastStore().error(`Couldn't load earlier messages. ${err.message}`);
    } finally {
      loadingOlder.value = false;
    }
  }

  /**
   * Joins the conversation's realtime room, then (once the server confirms the join) fetches the
   * latest messages. Fetching only after the join closes the gap in which a message could be
   * neither delivered live nor included in an earlier fetch.
   */
  function joinAndCatchUp(conversationId: string) {
    const socket = getSocket();
    if (!socket) return;
    socket.timeout(10_000).emit('join_conversation', conversationId, async (err: Error | null, reply?: { joined: boolean }) => {
      if (err || !reply?.joined || activeConversationId.value !== conversationId) return;
      try {
        const res = await api.get(`/conversations/${conversationId}/messages`);
        if (activeConversationId.value === conversationId) mergeMessages(res.data.data.messages);
      } catch {
        // The next reconnect or user action retries; nothing to surface here.
      }
    });
  }

  /** After a (re)connect: rooms were lost with the old connection, so rejoin and catch up. */
  function resync() {
    loadConversations();
    if (activeConversationId.value) joinAndCatchUp(activeConversationId.value);
  }

  function leaveCurrentConversation() {
    if (activeConversationId.value) {
      const socket = getSocket();
      if (socket) {
        socket.emit('leave_conversation', activeConversationId.value);
      }
      activeConversationId.value = null;
      activeMessages.value = [];
      activeOtherUser.value = null;
      hasMoreMessages.value = false;
    }
  }

  /**
   * Sends with a client-generated id. A send whose response was lost (network drop) is retried
   * once with the same id; the server stores it at most once either way.
   */
  async function sendMessage(content: string) {
    const conversationId = activeConversationId.value;
    if (!conversationId || !content.trim()) return;
    sending.value = true;
    const body = { content: content.trim(), clientMessageId: crypto.randomUUID() };
    const post = () => api.post(`/conversations/${conversationId}/messages`, body);
    try {
      let res;
      try {
        res = await post();
      } catch (err) {
        if (err instanceof ApiError && err.status === undefined) res = await post();
        else throw err;
      }
      const msg: Message = res.data.data;
      if (activeConversationId.value === conversationId) mergeMessages([msg]);
      const conv = conversations.value.find((c) => c.id === conversationId);
      if (conv) {
        conv.lastMessage = msg;
        conv.lastMessageAt = msg.createdAt;
      }
      return msg;
    } finally {
      sending.value = false;
    }
  }

  let handlersFor: ReturnType<typeof getSocket> = null;

  /**
   * Registers realtime handlers once per socket, app-wide (not only while the chat page is open),
   * so unread badges and notifications stay current everywhere.
   */
  function initSocketHandlers() {
    const socket = getSocket();
    if (!socket || handlersFor === socket) return;
    handlersFor = socket;

    socket.on('new_message', (message: Message) => {
      if (activeConversationId.value === message.conversationId) mergeMessages([message]);
    });

    // Delivered to the recipient's personal channel whether or not the chat is open.
    socket.on('message_notification', ({ conversationId, message }: { conversationId: string; message: Message }) => {
      const conv = conversations.value.find((c) => c.id === conversationId);
      const viewing = activeConversationId.value === conversationId && document.visibilityState === 'visible';
      if (conv) {
        conv.lastMessage = message;
        conv.lastMessageAt = message.createdAt;
        if (!viewing) conv.unreadCount = (conv.unreadCount || 0) + 1;
        conversations.value = [conv, ...conversations.value.filter((c) => c.id !== conversationId)];
      } else {
        loadConversations();
      }
      if (!viewing) {
        useToastStore().info(`New message from ${conv?.otherUser?.displayName || 'a match'}`);
      }
    });

    socket.on('messages_read', ({ conversationId, readerId }: { conversationId: string; readerId: string }) => {
      if (activeConversationId.value !== conversationId) return;
      activeMessages.value.forEach((m) => {
        if (m.senderId !== readerId) m.status = 'read';
      });
    });

    socket.on('new_match', () => {
      loadMatches();
      loadConversations();
    });

    // Fires on the first connect and after every reconnect (rooms are lost when a socket drops).
    socket.on('connect', () => {
      resync();
    });
  }

  return {
    conversations,
    matches,
    activeConversationId,
    activeMessages,
    activeOtherUser,
    loading,
    loadingOlder,
    hasMoreMessages,
    sending,
    totalUnreadCount,
    loadMatches,
    loadConversations,
    openConversation,
    loadOlderMessages,
    leaveCurrentConversation,
    sendMessage,
    initSocketHandlers,
  };
});
