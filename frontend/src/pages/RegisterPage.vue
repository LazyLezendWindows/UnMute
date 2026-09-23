<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden transition-colors u-page">
    <!-- Subtle Architectural Ambient Halos -->
    <div class="position-absolute ambient-halo-top rounded-circle pointer-events-none u-ambient-halo"></div>
    <div class="position-absolute ambient-halo-bottom rounded-circle pointer-events-none u-ambient-halo"></div>

    <div class="w-100 max-w-md position-relative z-10">
      <UCard variant="elevated" padding="lg" class="shadow-2xl elyse-auth-card">
        <div class="d-flex flex-column gap-4">
          <!-- Header -->
          <div class="text-center pt-2">
            <div
              class="auth-logo-badge d-inline-flex align-items-center justify-content-center mb-3 u-fill-primary-3d"
            >
              <i class="ri-voiceprint-fill text-white fs-2"></i>
            </div>
            <h1 class="brand-heading fs-2 fw-bold tracking-tight mb-1 u-text-primary">
              Join Unmute
            </h1>
            <p class="small mb-0 u-text-muted font-sans">
              Meet meaningful people through shared passions
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0 d-flex align-items-center gap-2">
            <i class="ri-error-warning-line fs-5 flex-shrink-0"></i>
            <span>{{ error }}</span>
          </div>

          <GoogleSignIn text="signup_with" @authenticated="onGoogleAuthenticated" />

          <!-- Divider -->
          <div class="d-flex align-items-center gap-3">
            <hr class="flex-grow-1 my-0 opacity-25" />
            <span class="extra-small text-uppercase tracking-widest fw-semibold u-text-dim">
              or register with email
            </span>
            <hr class="flex-grow-1 my-0 opacity-25" />
          </div>

          <!-- Registration Form -->
          <form @submit.prevent="handleRegister" class="d-flex flex-column gap-3">
            <UInput
              v-model="displayName"
              label="Preferred Name"
              type="text"
              required
              placeholder="e.g. Julian"
            />

            <UInput
              v-model="email"
              label="Email address"
              type="email"
              required
              placeholder="julian@residence.com"
            />

            <UInput
              v-model="dateOfBirth"
              label="Date of Birth"
              type="date"
              required
              :max="maxDateFor18"
              hint="Only your age is visible to peers (Strict 18+ policy)"
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
                Create Account
              </UButton>
            </div>
          </form>

          <!-- Safe Community Pledge -->
          <p class="extra-small text-center lh-base mb-0 u-text-muted">
            By joining, you confirm you are 18+ and adhere to the Unmute Community Respect Guidelines.
          </p>

          <!-- Switch to Login -->
          <div class="text-center small pt-1 u-text-muted">
            Already a member?
            <router-link to="/login" class="fw-bold ms-1 text-decoration-none u-link-strong">
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
import GoogleSignIn from '../components/auth/GoogleSignIn.vue';
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

function onGoogleAuthenticated(isNewUser: boolean) {
  router.push(isNewUser ? '/profile' : '/discover');
}

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
.ambient-halo-top {
  top: -10rem;
  right: -10rem;
  width: 32rem;
  height: 32rem;
  filter: blur(80px);
  opacity: 0.8;
}

.ambient-halo-bottom {
  bottom: -10rem;
  left: -10rem;
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
