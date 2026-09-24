import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

class FakeApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
  }
}
const api = { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() };
vi.mock('../../src/services/api', () => ({ api, onUnauthorized: vi.fn(), ApiError: FakeApiError }));
vi.mock('../../src/services/socket', () => ({ connectSocket: vi.fn(), disconnectSocket: vi.fn() }));
vi.mock('../../src/composables/useGoogleIdentity', () => ({ useGoogleIdentity: () => ({ disableAutoSelect: vi.fn() }) }));
const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

const { useAuthStore } = await import('../../src/stores/auth');
const SettingsPage = (await import('../../src/pages/SettingsPage.vue')).default;

function mountSettings() {
  const auth = useAuthStore();
  auth.user = { id: 'me', email: 'me@example.com', profile: null } as any;
  auth.status = 'AUTHENTICATED';
  return {
    auth,
    wrapper: mount(SettingsPage, {
      global: { stubs: { 'router-link': { template: '<a><slot /></a>' }, PageHeader: true, Teleport: true } },
    }),
  };
}

function button(wrapper: ReturnType<typeof mount>, text: string) {
  const found = wrapper.findAll('button').find((b) => b.text().includes(text));
  if (!found) throw new Error(`No button "${text}"`);
  return found;
}

describe('Settings: account actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.values(api).forEach((fn) => fn.mockReset());
    push.mockReset();
  });

  it('only enables deletion after typing DELETE, then signs out', async () => {
    api.delete.mockResolvedValue({ data: { success: true } });
    const { auth, wrapper } = mountSettings();
    await button(wrapper, 'Delete account').trigger('click');

    // The modal's submit button (the list row's text also contains a description).
    const submit = () => wrapper.findAll('button').filter((b) => b.text() === 'Delete account').at(-1)!;
    expect(submit().attributes('disabled')).toBeDefined();
    await wrapper.find('#delete-account-form input').setValue('delete');
    expect(submit().attributes('disabled')).toBeDefined();

    await wrapper.find('#delete-account-form input').setValue('DELETE');
    expect(submit().attributes('disabled')).toBeUndefined();
    await wrapper.find('#delete-account-form').trigger('submit');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/users/me', { data: { confirm: 'DELETE' } });
    expect(auth.isAuthenticated).toBe(false);
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('sends the member to sign in again when the server requires a recent sign-in', async () => {
    api.delete.mockRejectedValue(new FakeApiError('Please sign in again', 403, 'REAUTH_REQUIRED'));
    api.post.mockResolvedValue({ data: { success: true } });
    const { auth, wrapper } = mountSettings();
    await button(wrapper, 'Delete account').trigger('click');
    await wrapper.find('#delete-account-form input').setValue('DELETE');
    await wrapper.find('#delete-account-form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(auth.isAuthenticated).toBe(false);
    expect(push).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/settings' } });
  });

  it('deactivates after confirmation and signs out', async () => {
    api.post.mockResolvedValue({ data: { success: true } });
    const { auth, wrapper } = mountSettings();
    await button(wrapper, 'Deactivate account').trigger('click');
    await wrapper.findAll('button').filter((b) => b.text() === 'Deactivate').at(-1)!.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/users/me/deactivate');
    expect(auth.isAuthenticated).toBe(false);
    expect(push).toHaveBeenCalledWith('/login');
  });
});
