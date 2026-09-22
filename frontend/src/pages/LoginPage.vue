<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-slate-950">
    <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
      <!-- Logo / Title -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-pink-500 shadow-lg shadow-brand-500/25 mb-1">
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Welcome back to Unmute</h1>
        <p class="text-xs text-slate-400">Connect without the pressure</p>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Email address</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Signing in...</span>
          <span v-else>Log in</span>
        </button>
      </form>

      <!-- Switch to Register -->
      <div class="text-center text-xs text-slate-400">
        Don't have an account?
        <router-link to="/register" class="text-brand-400 hover:text-brand-300 font-semibold ml-1">
          Create account
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
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
