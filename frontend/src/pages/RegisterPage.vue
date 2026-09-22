<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-slate-950">
    <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
      <!-- Title -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-pink-500 shadow-lg shadow-brand-500/25 mb-1">
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <h1 class="text-2xl font-extrabold text-white tracking-tight">Join Unmute</h1>
        <p class="text-xs text-slate-400">Discover people based on shared interests & conversation</p>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
        {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">First name or Display name</label>
          <input
            v-model="displayName"
            type="text"
            required
            placeholder="e.g. Alex"
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Email address</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="alex@example.com"
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-slate-300">Date of Birth</label>
            <span class="text-[10px] text-brand-400 font-medium">18+ only</span>
          </div>
          <input
            v-model="dateOfBirth"
            type="date"
            required
            :max="maxDateFor18"
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
          <span class="text-[10px] text-slate-500 mt-1 block">
            Only your age is shown publicly, never your full birth date.
          </span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Password (min 8 characters)</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            placeholder="••••••••"
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Creating account...</span>
          <span v-else>Continue to Profile Setup</span>
        </button>
      </form>

      <!-- Terms / Safety note -->
      <p class="text-[11px] text-slate-500 text-center leading-normal">
        By joining Unmute, you confirm that you are at least 18 years old and agree to treat all members with respect.
      </p>

      <!-- Switch to Login -->
      <div class="text-center text-xs text-slate-400">
        Already have an account?
        <router-link to="/login" class="text-brand-400 hover:text-brand-300 font-semibold ml-1">
          Log in
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
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
    // Direct user to profile setup to pick their interests
    router.push('/profile');
  } catch (err: any) {
    error.value = err.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>
