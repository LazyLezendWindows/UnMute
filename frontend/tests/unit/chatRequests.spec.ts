import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';

class FakeApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
  }
}
const api = { get: vi.fn(), post: vi.fn() };
vi.mock('../../src/services/api', () => ({ api, ApiError: FakeApiError, onUnauthorized: vi.fn() }));

function fakeSocket() {
  const handlers = new Map<string, (...args: any[]) => void>();
  return {
    on(event: string, fn: (...args: any[]) => void) {
      handlers.set(event, fn);
    },
    emit() {},
    timeout() {
      return this;
    },
    fire(event: string, ...args: unknown[]) {
      return handlers.get(event)?.(...args);
    },
  };
}
let socket = fakeSocket();
vi.mock('../../src/services/socket', () => ({ getSocket: () => socket }));

const { useChatStore } = await import('../../src/stores/chat');
const RequestCard = (await import('../../src/components/chat/RequestCard.vue')).default;
const { relativeTime } = await import('../../src/components/chat/requestFormat');

const request = (id: string, direction: 'incoming' | 'sent' = 'incoming') => ({
  id,
  direction,
  status: 'pending' as const,
  requestedAt: '2026-09-24T10:00:00.000Z',
  preview: `hello from ${id}`,
  otherUser: { id: `u-${id}`, displayName: `Person ${id}`, age: 27, avatarUrl: '', approximateLocation: 'Pune', isVerified: false, distanceKm: 5 },
});

/** Answers the two list endpoints with the given requests. */
function serveLists(incoming: unknown[], sent: unknown[] = []) {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/chat-requests/incoming') return { data: { data: incoming } };
    if (url === '/chat-requests/sent') return { data: { data: sent } };
    if (url === '/conversations') return { data: { data: [] } };
    throw new Error(`unexpected GET ${url}`);
  });
}

describe('chat requests in the store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    socket = fakeSocket();
    api.get.mockReset();
    api.post.mockReset();
  });

  it('loads incoming and sent requests and counts the ones awaiting an answer', async () => {
    serveLists([request('r1'), request('r2')], [request('s1', 'sent')]);
    const store = useChatStore();
    await store.loadRequests();
    expect(store.incomingRequests.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(store.sentRequests.map((r) => r.id)).toEqual(['s1']);
    expect(store.pendingRequestCount).toBe(2);
  });

  it('accepting removes the request at once and refreshes the chats', async () => {
    serveLists([request('r1'), request('r2')]);
    const store = useChatStore();
    await store.loadRequests();
    api.post.mockResolvedValueOnce({ data: { data: { conversationId: 'r1' } } });
    const accepting = store.acceptRequest('r1');
    expect(store.incomingRequests.map((r) => r.id)).toEqual(['r2']); // optimistic
    expect(await accepting).toBe('r1');
    expect(api.post).toHaveBeenCalledWith('/chat-requests/r1/accept');
    expect(api.get).toHaveBeenCalledWith('/conversations');
  });

  it('puts a request back if the server refuses the action', async () => {
    serveLists([request('r1'), request('r2')]);
    const store = useChatStore();
    await store.loadRequests();
    api.post.mockRejectedValueOnce(new FakeApiError('Request not found', 404));
    await expect(store.declineRequest('r1')).rejects.toThrow('Request not found');
    expect(store.incomingRequests.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('cancelling a sent request removes it from Sent', async () => {
    serveLists([], [request('s1', 'sent'), request('s2', 'sent')]);
    const store = useChatStore();
    await store.loadRequests();
    api.post.mockResolvedValueOnce({ data: { data: { cancelled: true } } });
    await store.cancelRequest('s1');
    expect(store.sentRequests.map((r) => r.id)).toEqual(['s2']);
    expect(api.post).toHaveBeenCalledWith('/chat-requests/s1/cancel');
  });

  it('sending into an existing chat posts the message there instead of creating a request', async () => {
    serveLists([]);
    const store = useChatStore();
    api.post
      .mockResolvedValueOnce({ data: { data: { status: 'accepted', conversationId: 'c9', delivered: false } } })
      .mockResolvedValueOnce({ data: { data: { id: 'm1' } } });
    const outcome = await store.sendRequest('u2', '  hi there  ');
    expect(outcome).toMatchObject({ status: 'accepted', conversationId: 'c9' });
    const [[, first], [url, second]] = api.post.mock.calls;
    expect(first).toMatchObject({ recipientId: 'u2', content: 'hi there' });
    expect(url).toBe('/conversations/c9/messages');
    expect(second).toMatchObject({ content: 'hi there', clientMessageId: (first as any).clientMessageId });
  });

  it('realtime events re-fetch from the API (the database is the source of truth), coalescing bursts', async () => {
    serveLists([]);
    const store = useChatStore();
    store.initSocketHandlers();
    serveLists([request('r1')]);
    socket.fire('chat_request_received', { requestId: 'r1' });
    socket.fire('chat_request_received', { requestId: 'r1' }); // duplicate event
    await store.loadRequests();
    expect(store.incomingRequests.map((r) => r.id)).toEqual(['r1']);
    const listCalls = api.get.mock.calls.filter(([url]) => url === '/chat-requests/incoming');
    expect(listCalls).toHaveLength(1);
  });

  it('closes an open request when it is withdrawn or removed elsewhere', async () => {
    serveLists([request('r1')]);
    const store = useChatStore();
    store.initSocketHandlers();
    store.activeRequest = { id: 'r1' } as any;
    serveLists([]);
    socket.fire('chat_request_removed', { requestId: 'r1' });
    await store.loadRequests();
    expect(store.activeRequest).toBeNull();
    expect(store.incomingRequests).toHaveLength(0);
  });

  it('re-fetches requests after a reconnect', async () => {
    serveLists([]);
    const store = useChatStore();
    store.initSocketHandlers();
    serveLists([request('missed')]);
    socket.fire('connect');
    await store.loadRequests();
    expect(store.incomingRequests.map((r) => r.id)).toEqual(['missed']);
  });
});

describe('request card', () => {
  it('offers Accept, Delete and Block for incoming requests, and opening is separate from accepting', async () => {
    const wrapper = mount(RequestCard, { props: { request: request('r1') } });
    expect(wrapper.text()).toContain('Person r1, 27');
    expect(wrapper.text()).toContain('Pune · within 5 km');
    expect(wrapper.text()).toContain('hello from r1');
    const labels = wrapper.findAll('.request-actions button').map((b) => b.text());
    expect(labels).toEqual(['Accept', 'Delete', 'Block']);
    await wrapper.find('.request-open').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
    expect(wrapper.emitted('accept')).toBeUndefined();
  });

  it('shows a sent request as pending with a Cancel action', () => {
    const wrapper = mount(RequestCard, { props: { request: request('s1', 'sent') } });
    expect(wrapper.text()).toContain('Request sent');
    expect(wrapper.text()).toContain('You: hello from s1');
    expect(wrapper.findAll('.request-actions button').map((b) => b.text())).toEqual(['Cancel request']);
  });

  it('formats request times compactly', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    expect(relativeTime('2026-09-24T11:59:30.000Z', now)).toBe('just now');
    expect(relativeTime('2026-09-24T11:15:00.000Z', now)).toBe('45m');
    expect(relativeTime('2026-09-24T02:00:00.000Z', now)).toBe('10h');
    expect(relativeTime('2026-09-21T12:00:00.000Z', now)).toBe('3d');
  });
});
