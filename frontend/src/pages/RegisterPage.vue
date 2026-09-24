<template>
  <AuthStage title="Create your account" subtitle="Unmute is for adults 18 and over">
    <div class="d-flex flex-column gap-3">
      <div v-if="error" class="auth-error" role="alert">
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span>{{ error }}</span>
      </div>

      <GoogleSignIn text="signup_with" @authenticated="onGoogleAuthenticated" />

      <!-- Production: accounts are created with Google, whose email addresses are verified. -->
      <p v-if="passwordSignup === false" class="auth-note">
        Unmute accounts are created with Google, so your email is already verified. You'll confirm your date of birth next.
      </p>

      <template v-if="passwordSignup">
        <div class="auth-divider" aria-hidden="true"><span>or sign up with email</span></div>

        <form class="d-flex flex-column gap-3" @submit.prevent="handleRegister">
          <UInput v-model="displayName" label="Preferred Name" hide-label icon-class="ri-user-3-line" placeholder="Preferred name" autocomplete="nickname" required />
          <UInput v-model="email" label="Email address" hide-label type="email" icon-class="ri-mail-line" placeholder="Email address" autocomplete="email" required />
          <UInput
            v-model="dateOfBirth"
            label="Date of Birth"
            type="date"
            required
            :max="maxDateFor18"
            hint="Only your age is shown to others"
          />
          <UInput
            v-model="password"
            label="Password (min 8 characters)"
            hide-label
            type="password"
            icon-class="ri-lock-2-line"
            placeholder="Password (min 8 characters)"
            autocomplete="new-password"
            required
            :minlength="8"
          />
          <UButton type="submit" variant="primary" size="lg" block :loading="loading" class="mt-1">Create Account</UButton>
        </form>
      </template>

      <p class="auth-note">By joining, you confirm you are 18+ and agree to the Unmute Community Respect Guidelines.</p>

      <p class="auth-switch">
        Already a member?
        <router-link to="/login">Sign in</router-link>
      </p>
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
@use '../components/auth/auth-form';
</style>
