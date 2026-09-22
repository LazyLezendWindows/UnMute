<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden transition-colors" style="background-color: var(--unmute-bg); color: var(--unmute-text-primary);">
    <!-- Ambient 3D Depth Blobs -->
    <div class="position-absolute ambient-blob-top rounded-circle pointer-events-none animate-pulse-glow" style="background: var(--unmute-primary); opacity: 0.15;"></div>
    <div class="position-absolute ambient-blob-bottom rounded-circle pointer-events-none animate-pulse-glow" style="background: var(--unmute-primary-light); opacity: 0.12; animation-delay: 2s;"></div>

    <div class="w-100 max-w-md position-relative" style="z-index: 10;">
      <UCard variant="glass" padding="lg" class="shadow-2xl">
        <div class="d-flex flex-column gap-4">
          <!-- Logo / Title -->
          <div class="text-center">
            <div
              class="auth-logo-badge d-inline-flex align-items-center justify-content-center mb-2 animate-float"
              style="background: var(--unmute-primary-gradient); box-shadow: 0 4px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);"
            >
              <svg class="auth-logo-icon text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
              </svg>
            </div>
            <h1 class="font-display fs-3 fw-bolder tracking-tight mb-1" style="color: var(--unmute-text-primary);">
              Welcome back
            </h1>
            <p class="small fw-medium mb-0" style="color: var(--unmute-text-muted);">
              Connect without the pressure
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
            {{ error }}
          </div>

          <!-- Form -->
          <form @submit.prevent="handleLogin" class="d-flex flex-column gap-3">
            <UInput
              v-model="email"
              label="Email address"
              type="email"
              required
              placeholder="you@example.com"
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
          <div class="text-center small text-muted pt-1">
            Don't have an account?
            <router-link to="/register" class="fw-bold ms-1 text-decoration-none" style="color: var(--unmute-primary-light);">
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
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UInput from '../components/ui/UInput.vue';
import UButton from '../components/ui/UButton.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function handleLogin() {
  loading.value = true;
  error.value = null;
  try {
    await authStore.login({ email: email.value, password: password.value });
    router.push('/discover');
  } catch (err: any) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.ambient-blob-top {
  top: -5rem;
  left: -5rem;
  width: 24rem;
  height: 24rem;
  filter: blur(120px);
}

.ambient-blob-bottom {
  bottom: -5rem;
  right: -5rem;
  width: 24rem;
  height: 24rem;
  filter: blur(120px);
}

.auth-logo-badge {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: var(--radius-lg, 18px);
}

.auth-logo-icon {
  width: 1.75rem;
  height: 1.75rem;
}
</style>
