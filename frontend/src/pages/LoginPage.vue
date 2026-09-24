<template>
  <AuthStage title="Welcome back" subtitle="Sign in to continue your conversations">
    <div class="d-flex flex-column gap-3">
      <div v-if="error" class="auth-error" role="alert">
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span>{{ error }}</span>
      </div>

      <form class="d-flex flex-column gap-3" novalidate @submit.prevent="handleLogin">
        <UInput
          v-model="email"
          label="Email address"
          hide-label
          type="email"
          autocomplete="email"
          icon-class="ri-mail-line"
          placeholder="Email address"
          required
        />
        <div>
          <UInput
            v-model="password"
            label="Password"
            hide-label
            type="password"
            autocomplete="current-password"
            icon-class="ri-lock-2-line"
            placeholder="Password"
            required
          />
          <div class="forgot-row">
            <button type="button" class="forgot-link" @click="handleForgotPassword">Forgot password?</button>
          </div>
        </div>
        <UButton type="submit" variant="primary" size="lg" block :loading="loading" class="mt-1">Sign in</UButton>
      </form>

      <div class="auth-divider" aria-hidden="true"><span>or continue with</span></div>

      <GoogleSignIn text="continue_with" @authenticated="onGoogleAuthenticated" />

      <button type="button" class="social-btn" @click="handlePhoneLogin">
        <i class="ri-phone-line" aria-hidden="true"></i>
        Continue with Phone
      </button>

      <p class="auth-switch">
        Don't have an account?
        <router-link to="/register">Create account</router-link>
      </p>
    </div>
  </AuthStage>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UInput from '../components/ui/UInput.vue';
import AuthStage from '../components/auth/AuthStage.vue';
import UButton from '../components/ui/UButton.vue';
import GoogleSignIn from '../components/auth/GoogleSignIn.vue';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

/** Returns to the page that required sign-in; only same-app paths are honoured (no open redirects). */
function postLoginPath(): string {
  const target = route.query.redirect;
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/discover';
}

function onGoogleAuthenticated(isNewUser: boolean) {
  router.push(isNewUser ? '/profile' : postLoginPath());
}

async function handleLogin() {
  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email address and password.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    await authStore.login({ email: email.value, password: password.value });
    router.push(postLoginPath());
  } catch (err: any) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}

function handleForgotPassword() {
  useToastStore().info('Password reset is not yet available. Contact support for help.');
}

function handlePhoneLogin() {
  useToastStore().info('Phone login will be available soon.');
}
</script>

<style scoped lang="scss">
@use '../components/auth/auth-form';

.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.4rem;
}

.forgot-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--unmute-accent-text);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 1px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-pill);
  background: var(--unmute-surface);
  color: var(--unmute-text-primary);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--unmute-transition-fast), border-color var(--unmute-transition-fast);

  i {
    font-size: 1.15rem;
  }

  &:hover {
    background: var(--unmute-surface-raised);
    border-color: var(--unmute-glass-border-hover);
  }

  &:active {
    transform: scale(0.98);
  }
}
</style>
