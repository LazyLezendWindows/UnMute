import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

class FakeApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}
const api = { get: vi.fn(), post: vi.fn() };
vi.mock('../../src/services/api', () => ({ api, ApiError: FakeApiError, onUnauthorized: vi.fn() }));

/** A minimal socket: records emits and lets tests fire server events. */
function fakeSocket() {
  const handlers = new Map<string, (...args: any[]) => void>();
  return {
    emitted: [] as unknown[][],
    on(event: string, fn: (...args: any[]) => void) {
      handlers.set(event, fn);
    },
    emit(...args: unknown[]) {
      this.emitted.push(args);
      const ack = args.at(-1);
      if (typeof ack === 'function') ack(null, { joined: true });
    },
    timeout() {
      return this;
    },
    fire(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
    },
  };
}
let socket = fakeSocket();
vi.mock('../../src/services/socket', () => ({ getSocket: () => socket }));

const { useChatStore } = await import('../../src/stores/chat');

const msg = (id: string, conversationId = 'c1', senderId = 'them') => ({
  id,
  conversationId,
  senderId,
  content: id,
  status: 'sent',
  createdAt: '2026-01-01T00:00:00.000Z',
});
const page = (messages: unknown[], hasMore = false) => ({ data: { data: { messages, otherUser: { id: 'them' }, hasMore } } });

describe('chat store reliability', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    socket = fakeSocket();
    api.get.mockReset();
    api.post.mockReset();
  });

  it('retries a send whose response was lost with the same client message id, and shows it once', async () => {
    const store = useChatStore();
    api.get.mockResolvedValueOnce(page([]));
    await store.openConversation('c1');

    api.post.mockRejectedValueOnce(new FakeApiError('offline')).mockResolvedValueOnce({ data: { data: msg('m1', 'c1', 'me') } });
    await store.sendMessage('hello');

    expect(api.post).toHaveBeenCalledTimes(2);
    const [first, second] = api.post.mock.calls.map((call) => call[1]);
    expect(first.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.clientMessageId).toBe(first.clientMessageId);

    socket.fire('new_message', msg('m1', 'c1', 'me')); // the realtime echo of the same message
    expect(store.activeMessages.map((m) => m.id)).toEqual(['m1']);
  });

  it('does not retry a send the server rejected', async () => {
    const store = useChatStore();
    api.get.mockResolvedValueOnce(page([]));
    await store.openConversation('c1');
    api.post.mockRejectedValueOnce(new FakeApiError('blocked', 403));
    await expect(store.sendMessage('hi')).rejects.toThrow('blocked');
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('rejoins the room and catches up without duplicates after a reconnect', async () => {
    const store = useChatStore();
    store.initSocketHandlers();
    api.get.mockResolvedValueOnce(page([msg('m1'), msg('m2')]));
    await store.openConversation('c1');

    api.get.mockImplementation(async (url: string) =>
      url === '/conversations' ? { data: { data: [] } } : page([msg('m2'), msg('m3')])
    );
    socket.fire('connect');
    await vi.waitFor(() => expect(store.activeMessages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']));
    expect(socket.emitted.filter(([event]) => event === 'join_conversation')).toHaveLength(2);
  });

  it('counts unread messages for chats that are not open and moves them to the top', async () => {
    const store = useChatStore();
    store.initSocketHandlers();
    store.conversations = [
      { id: 'c0', unreadCount: 0, otherUser: { displayName: 'Zed' } },
      { id: 'c1', unreadCount: 0, otherUser: { displayName: 'Asha' } },
    ] as any;
    socket.fire('message_notification', { conversationId: 'c1', message: msg('n1') });
    socket.fire('message_notification', { conversationId: 'c1', message: msg('n2') });
    expect(store.conversations[0].id).toBe('c1');
    expect(store.conversations[0].unreadCount).toBe(2);
    expect(store.totalUnreadCount).toBe(2);
  });

  it('prepends older history in order, using the oldest shown message as the cursor', async () => {
    const store = useChatStore();
    api.get.mockResolvedValueOnce(page([msg('m3'), msg('m4')], true));
    await store.openConversation('c1');
    api.get.mockResolvedValueOnce(page([msg('m1'), msg('m2')], false));
    await store.loadOlderMessages();
    expect(api.get).toHaveBeenLastCalledWith('/conversations/c1/messages', { params: { before: 'm3' } });
    expect(store.activeMessages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(store.hasMoreMessages).toBe(false);
  });
});
