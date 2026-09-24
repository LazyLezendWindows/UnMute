import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const loadAuthConfig = vi.fn();
vi.mock('../../src/services/authConfig', () => ({ loadAuthConfig }));
vi.mock('../../src/services/api', () => ({ api: { get: vi.fn(), post: vi.fn() }, onUnauthorized: vi.fn(), ApiError: Error }));
vi.mock('../../src/services/socket', () => ({ connectSocket: vi.fn(), disconnectSocket: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const RegisterPage = (await import('../../src/pages/RegisterPage.vue')).default;

async function mountPage() {
  const wrapper = mount(RegisterPage, {
    global: {
      stubs: {
        AuthStage: { template: '<div><slot /></div>' },
        GoogleSignIn: { template: '<button class="google">Sign up with Google</button>' },
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('Register page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    loadAuthConfig.mockReset();
  });

  it('offers only Google sign-up when password sign-up is disabled', async () => {
    loadAuthConfig.mockResolvedValue({ passwordSignup: false });
    const wrapper = await mountPage();
    expect(wrapper.find('.google').exists()).toBe(true);
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('created with Google');
  });

  it('shows the email form as well when password sign-up is enabled', async () => {
    loadAuthConfig.mockResolvedValue({ passwordSignup: true });
    const wrapper = await mountPage();
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('created with Google');
  });

  it('falls back to Google-only when the settings cannot be loaded', async () => {
    loadAuthConfig.mockRejectedValue(new Error('offline'));
    const wrapper = await mountPage();
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
