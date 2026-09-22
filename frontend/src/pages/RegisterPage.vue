<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden transition-colors" style="background-color: var(--unmute-bg); color: var(--unmute-text-primary);">
    <!-- Ambient 3D Depth Blobs -->
    <div class="position-absolute ambient-blob-top rounded-circle pointer-events-none animate-pulse-glow" style="background: var(--unmute-primary); opacity: 0.15;"></div>
    <div class="position-absolute ambient-blob-bottom rounded-circle pointer-events-none animate-pulse-glow" style="background: var(--unmute-primary-light); opacity: 0.12; animation-delay: 1.5s;"></div>

    <div class="w-100 max-w-md position-relative" style="z-index: 10;">
      <UCard variant="glass" padding="lg" class="shadow-2xl">
        <div class="d-flex flex-column gap-4">
          <!-- Title -->
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
              Join Unmute
            </h1>
            <p class="small fw-medium mb-0" style="color: var(--unmute-text-muted);">
              Discover people based on shared interests & conversation
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
            {{ error }}
          </div>

          <!-- Form -->
          <form @submit.prevent="handleRegister" class="d-flex flex-column gap-3">
            <UInput
              v-model="displayName"
              label="Display Name"
              type="text"
              required
              placeholder="e.g. Alex"
            />

            <UInput
              v-model="email"
              label="Email address"
              type="email"
              required
              placeholder="alex@example.com"
            />

            <UInput
              v-model="dateOfBirth"
              label="Date of Birth"
              type="date"
              required
              :max="maxDateFor18"
              hint="Only your age is shown publicly, never your full date of birth (18+ only)"
            />

            <UInput
              v-model="password"
              label="Password (min 8 characters)"
              type="password"
              required
              :minlength="8"
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
                Continue to Profile Setup
              </UButton>
            </div>
          </form>

          <!-- Terms / Safety note -->
          <p class="extra-small text-muted text-center lh-base mb-0">
            By joining Unmute, you confirm that you are at least 18 years old and agree to treat all members with respect.
          </p>

          <!-- Switch to Login -->
          <div class="text-center small text-muted pt-1">
            Already have an account?
            <router-link to="/login" class="fw-bold ms-1 text-decoration-none" style="color: var(--unmute-primary-light);">
              Log in
            </router-link>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UInput from '../components/ui/UInput.vue';
import UButton from '../components/ui/UButton.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const displayName = ref('');
const email = ref('');
const dateOfBirth = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

// Calculate max date eligible for 18 years old
const maxDateFor18 = computed(() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
});

async function handleRegister() {
  loading.value = true;
  error.value = null;
  try {
    await authStore.register({
      displayName: displayName.value,
      email: email.value,
      dateOfBirth: dateOfBirth.value,
      password: password.value,
    });
    router.push('/profile');
  } catch (err: any) {
    error.value = err.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.ambient-blob-top {
  top: -5rem;
  right: -5rem;
  width: 24rem;
  height: 24rem;
  filter: blur(120px);
}

.ambient-blob-bottom {
  bottom: -5rem;
  left: -5rem;
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

.extra-small {
  font-size: 0.6875rem;
}
</style>
