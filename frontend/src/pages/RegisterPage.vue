<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors" style="background-color: var(--unmute-bg); color: var(--unmute-text-primary);">
    <!-- Ambient 3D Depth Blobs -->
    <div class="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-[130px] pointer-events-none animate-pulse-glow" style="background: var(--unmute-primary); opacity: 0.15;"></div>
    <div class="absolute -bottom-20 -left-20 w-96 h-96 rounded-full blur-[130px] pointer-events-none animate-pulse-glow" style="background: var(--unmute-primary-light); opacity: 0.12; animation-delay: 1.5s;"></div>

    <div class="w-full max-w-md relative z-10">
      <UCard variant="glass" padding="lg" class="shadow-2xl space-y-6">
        <!-- Title -->
        <div class="text-center space-y-1.5">
          <div
            class="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-1 animate-float"
            style="background: var(--unmute-primary-gradient); box-shadow: 0 4px 0 var(--unmute-primary-bevel), var(--unmute-glow-primary), var(--unmute-3d-specular);"
          >
            <svg class="w-7 h-7 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <h1 class="font-display text-2xl sm:text-3xl font-extrabold tracking-tight" style="color: var(--unmute-text-primary);">
            Join Unmute
          </h1>
          <p class="text-xs font-medium" style="color: var(--unmute-text-muted);">
            Discover people based on shared interests & conversation
          </p>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-300 font-medium">
          {{ error }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleRegister" class="space-y-4">
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
        <p class="text-[11px] text-slate-500 text-center leading-relaxed">
          By joining Unmute, you confirm that you are at least 18 years old and agree to treat all members with respect.
        </p>

        <!-- Switch to Login -->
        <div class="text-center text-xs text-slate-400 font-medium pt-1">
          Already have an account?
          <router-link to="/login" class="text-brand-300 hover:text-brand-200 font-bold ml-1 transition-colors">
            Log in
          </router-link>
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
