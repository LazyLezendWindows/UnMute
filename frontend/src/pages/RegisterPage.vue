<template>
  <AuthStage title="Create your account" subtitle="Unmute is for adults 18 and over.">
    <div class="d-flex flex-column gap-4">
      <!-- Error Alert -->
      <div v-if="error" class="alert alert-danger py-2 px-3 small rounded-3 mb-0 d-flex align-items-center gap-2">
        <i class="ri-error-warning-line fs-5 flex-shrink-0"></i>
        <span>{{ error }}</span>
      </div>

      <GoogleSignIn text="signup_with" @authenticated="onGoogleAuthenticated" />

      <!-- Production: accounts are created with Google, whose email addresses are verified. -->
      <p v-if="passwordSignup === false" class="small text-center lh-base mb-0 u-text-secondary">
        Unmute accounts are created with Google, so your email is already verified. You'll confirm your date of birth next.
      </p>

      <template v-if="passwordSignup">
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
            placeholder="you@domain.com"
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
      </template>

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
  </AuthStage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UInput from '../components/ui/UInput.vue';
import AuthStage from '../components/auth/AuthStage.vue';
import UButton from '../components/ui/UButton.vue';
import GoogleSignIn from '../components/auth/GoogleSignIn.vue';
import { useAuthStore } from '../stores/auth';
import { loadAuthConfig } from '../services/authConfig';

const router = useRouter();
const authStore = useAuthStore();

const displayName = ref('');
const email = ref('');
const dateOfBirth = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
/** null until known: neither variant is shown before the server says which applies. */
const passwordSignup = ref<boolean | null>(null);

onMounted(async () => {
  try {
    passwordSignup.value = (await loadAuthConfig()).passwordSignup;
  } catch {
    passwordSignup.value = false; // server unreachable: Google sign-up shows its own error
  }
});

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
.extra-small {
  font-size: 0.6875rem;
}
</style>
