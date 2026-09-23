import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';
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

  async function openConversation(conversationId: string) {
    activeConversationId.value = conversationId;
    loading.value = true;
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`);
      activeMessages.value = res.data.data.messages;
      activeOtherUser.value = res.data.data.otherUser;

      // Join socket conversation room
      const socket = getSocket();
      if (socket) {
        socket.emit('join_conversation', conversationId);
      }

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

  function leaveCurrentConversation() {
    if (activeConversationId.value) {
      const socket = getSocket();
      if (socket) {
        socket.emit('leave_conversation', activeConversationId.value);
      }
      activeConversationId.value = null;
      activeMessages.value = [];
      activeOtherUser.value = null;
    }
  }

  async function sendMessage(content: string) {
    if (!activeConversationId.value || !content.trim()) return;
    sending.value = true;
    try {
      const res = await api.post(`/conversations/${activeConversationId.value}/messages`, {
        content: content.trim(),
      });
      // Append sent message if not already added by socket
      const msg = res.data.data;
      if (!activeMessages.value.some((m) => m.id === msg.id)) {
        activeMessages.value.push(msg);
      }
      // Update conversations list preview
      const conv = conversations.value.find((c) => c.id === activeConversationId.value);
      if (conv) {
        conv.lastMessage = msg;
        conv.lastMessageAt = msg.createdAt;
      }
      return msg;
    } finally {
      sending.value = false;
    }
  }

  function initSocketHandlers() {
    const socket = getSocket();
    if (!socket) return;

    // Listen for new messages
    socket.off('new_message');
    socket.on('new_message', (message: Message) => {
      if (activeConversationId.value === message.conversationId) {
        if (!activeMessages.value.some((m) => m.id === message.id)) {
          activeMessages.value.push(message);
        }
      }
      // Refresh conversation preview
      loadConversations();
    });

    // Listen for messages read receipt
    socket.off('messages_read');
    socket.on('messages_read', ({ conversationId }: { conversationId: string }) => {
      if (activeConversationId.value === conversationId) {
        activeMessages.value.forEach((m) => {
          m.status = 'read';
        });
      }
    });

    // Listen for new matches
    socket.off('new_match');
    socket.on('new_match', () => {
      loadMatches();
      loadConversations();
    });
  }

  return {
    conversations,
    matches,
    activeConversationId,
    activeMessages,
    activeOtherUser,
    loading,
    sending,
    totalUnreadCount,
    loadMatches,
    loadConversations,
    openConversation,
    leaveCurrentConversation,
    sendMessage,
    initSocketHandlers,
  };
});
