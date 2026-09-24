import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, ApiError } from '../services/api';
import { getSocket } from '../services/socket';
import { useToastStore } from './toast';
import { ChatRequestDetail, ChatRequestOutcome, ChatRequestSummary, Conversation, IncomingLike, Match, Message, Presence } from '../types';

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

  // People who liked you and are waiting for your answer (shown on Matches).
  const incomingLikes = ref<IncomingLike[]>([]);

  async function loadIncomingLikes() {
    try {
      incomingLikes.value = (await api.get('/interactions/incoming')).data.data;
    } catch (err: any) {
      useToastStore().error(`Couldn't load who liked you. ${err.message}`);
    }
  }

  /** Answers a like: liking back makes a match (returns its conversation), passing hides them. */
  async function answerLike(userId: string, answer: 'like' | 'pass'): Promise<string | null> {
    const res = await api.post(`/interactions/${answer}`, { targetUserId: userId });
    incomingLikes.value = incomingLikes.value.filter((l) => l.user.id !== userId);
    if (answer === 'like' && res.data.data.matched) {
      await Promise.all([loadMatches(), loadConversations()]);
      return res.data.data.conversationId as string;
    }
    return null;
  }

  /** Live online / offline updates for people you chat with. */
  function applyPresence(userId: string, presence: Presence) {
    for (const m of matches.value) if (m.user.id === userId) m.user.presence = presence;
    for (const c of conversations.value) if (c.otherUser.id === userId) c.otherUser.presence = presence;
    if (activeOtherUser.value?.id === userId) activeOtherUser.value = { ...activeOtherUser.value, presence };
  }

  // Chat requests (source of truth: the API; realtime events only prompt a re-fetch).
  const incomingRequests = ref<ChatRequestSummary[]>([]);
  const sentRequests = ref<ChatRequestSummary[]>([]);
  const requestsLoaded = ref(false);
  const requestsError = ref<string | null>(null);
  const activeRequest = ref<ChatRequestDetail | null>(null);
  const pendingRequestCount = computed(() => incomingRequests.value.length);

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

  let requestsLoad: Promise<void> | null = null;

  /** Loads incoming and sent requests; overlapping calls (bursts of events) share one fetch. */
  function loadRequests(): Promise<void> {
    if (!requestsLoad) {
      requestsLoad = Promise.all([api.get('/chat-requests/incoming'), api.get('/chat-requests/sent')])
        .then(([inbox, outbox]) => {
          incomingRequests.value = inbox.data.data;
          sentRequests.value = outbox.data.data;
          requestsError.value = null;
        })
        .catch((err: any) => {
          requestsError.value = err.message || "Couldn't load requests";
        })
        .finally(() => {
          requestsLoaded.value = true;
          requestsLoad = null;
        });
    }
    return requestsLoad;
  }

  async function openRequest(id: string): Promise<ChatRequestDetail> {
    const res = await api.get(`/chat-requests/${id}`);
    activeRequest.value = res.data.data;
    return res.data.data;
  }

  function closeRequest() {
    activeRequest.value = null;
  }

  /**
   * Messages someone from Discover: a request awaiting their approval, or (with an existing chat)
   * straight into it. A retried send reuses its id so it is stored once.
   */
  async function sendRequest(recipientId: string, content: string): Promise<ChatRequestOutcome> {
    const body = { recipientId, content: content.trim(), clientMessageId: crypto.randomUUID() };
    const res = await api.post('/chat-requests', body);
    const outcome: ChatRequestOutcome = res.data.data;
    if (outcome.status === 'accepted' && !outcome.delivered) {
      // An approved chat already exists: the message belongs there.
      await api.post(`/conversations/${outcome.conversationId}/messages`, { content: body.content, clientMessageId: body.clientMessageId });
    }
    await Promise.all([loadRequests(), outcome.status === 'accepted' ? loadConversations() : Promise.resolve()]);
    return outcome;
  }

  /** Removes a request from a list at once; puts it back if the server refuses. */
  async function optimistic(list: typeof incomingRequests, id: string, action: () => Promise<unknown>) {
    const previous = list.value;
    list.value = previous.filter((r) => r.id !== id);
    if (activeRequest.value?.id === id) activeRequest.value = null;
    try {
      await action();
    } catch (err) {
      list.value = previous;
      throw err;
    }
  }

  async function acceptRequest(id: string): Promise<string> {
    let conversationId = id;
    await optimistic(incomingRequests, id, async () => {
      const res = await api.post(`/chat-requests/${id}/accept`);
      conversationId = res.data.data.conversationId;
    });
    await loadConversations();
    return conversationId;
  }

  function declineRequest(id: string) {
    return optimistic(incomingRequests, id, () => api.post(`/chat-requests/${id}/decline`));
  }

  function cancelRequest(id: string) {
    return optimistic(sentRequests, id, () => api.post(`/chat-requests/${id}/cancel`));
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
    loadRequests();
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

  /**
   * Sends a photo in the open chat: shrunk and cleaned in the browser, uploaded straight to
   * Cloudinary with a permission for this conversation, then sent as a message.
   */
  async function sendPhoto(file: File) {
    const conversationId = activeConversationId.value;
    if (!conversationId) return;
    sending.value = true;
    try {
      const { preparePhoto, uploadToCloudinary } = await import('../platform/photoUpload');
      const photo = await preparePhoto(file);
      const signed = await api.post(`/conversations/${conversationId}/attachments`);
      const attachment = await uploadToCloudinary(signed.data.data, photo);
      const res = await api.post(`/conversations/${conversationId}/messages`, {
        content: '',
        attachment,
        clientMessageId: crypto.randomUUID(),
      });
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

    socket.on('chat_request_received', () => {
      loadRequests();
      useToastStore().info('You have a new message request');
    });

    socket.on('chat_request_accepted', async ({ requestId }: { requestId: string }) => {
      // Only the sender is told; the recipient's own acceptance also arrives here (other devices).
      const mine = sentRequests.value.find((r) => r.id === requestId);
      await Promise.all([loadRequests(), loadConversations()]);
      if (mine) useToastStore().success(`${mine.otherUser.displayName} accepted your message request`);
    });

    // Sent from another device, withdrawn by its sender, declined or blocked elsewhere.
    socket.on('chat_request_sent', () => loadRequests());
    socket.on('chat_request_removed', ({ requestId }: { requestId: string }) => {
      if (activeRequest.value?.id === requestId) activeRequest.value = null;
      loadRequests();
    });

    socket.on('presence_changed', ({ userId, online, lastSeenAt }: { userId: string; online: boolean; lastSeenAt: string }) => {
      applyPresence(userId, { online, lastSeenAt });
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
    incomingLikes,
    loadIncomingLikes,
    answerLike,
    incomingRequests,
    sentRequests,
    requestsLoaded,
    requestsError,
    activeRequest,
    pendingRequestCount,
    loadRequests,
    openRequest,
    closeRequest,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    loadMatches,
    loadConversations,
    openConversation,
    loadOlderMessages,
    leaveCurrentConversation,
    sendMessage,
    sendPhoto,
    initSocketHandlers,
  };
});
