<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
    <!-- Ambient 3D Depth Blobs -->
    <div class="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-brand-600/15 blur-[120px] pointer-events-none animate-pulse-glow"></div>
    <div class="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-pink-600/10 blur-[120px] pointer-events-none animate-pulse-glow" style="animation-delay: 2s;"></div>

    <div class="w-full max-w-md relative z-10">
      <UCard variant="glass" padding="lg" class="shadow-2xl space-y-6">
        <!-- Logo / Title -->
        <div class="text-center space-y-2">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-pink-500 shadow-xl shadow-brand-500/30 mb-1 animate-float">
            <svg class="w-7 h-7 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back
          </h1>
          <p class="text-xs text-slate-400 font-medium">
            Connect without the pressure
          </p>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-300 font-medium">
          {{ error }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
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
        <div class="text-center text-xs text-slate-400 font-medium pt-1">
          Don't have an account?
          <router-link to="/register" class="text-brand-300 hover:text-brand-200 font-bold ml-1 transition-colors">
            Create account
          </router-link>
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
