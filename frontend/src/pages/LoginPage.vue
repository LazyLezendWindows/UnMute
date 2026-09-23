<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden transition-colors" style="background-color: var(--unmute-bg); color: var(--unmute-text-primary);">
    <!-- Subtle Architectural Ambient Halos -->
    <div class="position-absolute ambient-halo-top rounded-circle pointer-events-none" style="background: radial-gradient(circle, var(--unmute-primary-surface) 0%, transparent 70%);"></div>
    <div class="position-absolute ambient-halo-bottom rounded-circle pointer-events-none" style="background: radial-gradient(circle, var(--unmute-primary-surface) 0%, transparent 70%);"></div>

    <div class="w-100 max-w-md position-relative" style="z-index: 10;">
      <UCard variant="elevated" padding="lg" class="shadow-2xl elyse-auth-card">
        <div class="d-flex flex-column gap-4">
          <!-- Editorial Brand Header -->
          <div class="text-center pt-2">
            <div
              class="auth-logo-badge d-inline-flex align-items-center justify-content-center mb-3"
              style="background: var(--unmute-primary-gradient); box-shadow: var(--unmute-btn-3d-shadow), var(--unmute-3d-specular);"
            >
              <i class="ri-voiceprint-fill text-white fs-2"></i>
            </div>
            <h1 class="brand-heading fs-2 fw-bold tracking-tight mb-1" style="color: var(--unmute-text-primary);">
              Welcome to Unmute
            </h1>
            <p class="small mb-0" style="color: var(--unmute-text-muted); font-family: 'Outfit', sans-serif;">
              A refined, conversation-first sanctuary
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0 d-flex align-items-center gap-2">
            <i class="ri-error-warning-line fs-5 flex-shrink-0"></i>
            <span>{{ error }}</span>
          </div>

          <GoogleSignIn text="continue_with" @authenticated="onGoogleAuthenticated" />

          <!-- Divider -->
          <div class="d-flex align-items-center gap-3">
            <hr class="flex-grow-1 my-0 opacity-25" />
            <span class="extra-small text-uppercase tracking-widest fw-semibold" style="color: var(--unmute-text-dim);">
              or with email
            </span>
            <hr class="flex-grow-1 my-0 opacity-25" />
          </div>

          <!-- Email / Password Form -->
          <form @submit.prevent="handleLogin" class="d-flex flex-column gap-3">
            <UInput
              v-model="email"
              label="Email address"
              type="email"
              required
              placeholder="you@domain.com"
            />

            <UInput
              v-model="password"
              label="Password"
              type="password"
              required
              placeholder="••••••••"
            />

            <div class="pt-2">
              <UButton
                type="submit"
                variant="primary"
                size="lg"
                block
                :loading="loading"
              >
                Sign in
              </UButton>
            </div>
          </form>

          <!-- Switch to Register -->
          <div class="text-center small pt-1" style="color: var(--unmute-text-muted);">
            Don't have an account?
            <router-link to="/register" class="fw-bold ms-1 text-decoration-none" style="color: var(--unmute-text-primary); text-decoration: underline !important;">
              Create account
            </router-link>
          </div>
        </div>
      </UCard>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UInput from '../components/ui/UInput.vue';
import UButton from '../components/ui/UButton.vue';
import GoogleSignIn from '../components/auth/GoogleSignIn.vue';
import { useAuthStore } from '../stores/auth';

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
</script>

<style scoped lang="scss">
.ambient-halo-top {
  top: -10rem;
  left: -10rem;
  width: 32rem;
  height: 32rem;
  filter: blur(80px);
  opacity: 0.8;
}

.ambient-halo-bottom {
  bottom: -10rem;
  right: -10rem;
  width: 32rem;
  height: 32rem;
  filter: blur(80px);
  opacity: 0.8;
}

.elyse-auth-card {
  border: 1px solid var(--unmute-glass-border, rgba(10, 10, 10, 0.08)) !important;
  background-color: var(--unmute-surface, #ffffff) !important;
  border-radius: var(--unmute-radius-xl, 32px);
}

.auth-logo-badge {
  width: 4rem;
  height: 4rem;
  border-radius: 20px;
}

.brand-heading {
  font-family: 'Playfair Display', Georgia, serif;
}

.extra-small {
  font-size: 0.6875rem;
}
</style>
