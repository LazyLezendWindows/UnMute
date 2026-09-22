<template>
  <div class="max-w-xl mx-auto w-full space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-extrabold text-white tracking-tight">Your Profile</h1>
        <p class="text-xs text-slate-400">Share your interests and intentions without the pressure</p>
      </div>
      <button
        type="button"
        @click="handleLogout"
        class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs font-semibold transition-colors border border-slate-700/60"
      >
        Log out
      </button>
    </div>

    <!-- Feedback Message -->
    <div v-if="successMsg" class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
      {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
      {{ errorMsg }}
    </div>

    <!-- Profile Form -->
    <form @submit.prevent="saveProfile" class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      <!-- Avatar Section -->
      <div class="flex items-center gap-4">
        <div class="relative w-20 h-20 rounded-2xl bg-slate-800 border-2 border-brand-500/40 overflow-hidden shrink-0 shadow-md">
          <img
            v-if="form.avatarUrl"
            :src="form.avatarUrl"
            alt="Profile photo"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center font-bold text-2xl text-brand-400">
            {{ (form.displayName || 'U').charAt(0) }}
          </div>
        </div>

        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-300 mb-1">Profile Photo URL</label>
          <input
            v-model="form.avatarUrl"
            type="url"
            placeholder="https://images.unsplash.com/..."
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span class="text-[10px] text-slate-500 mt-1 block">
            Enter an image URL for your profile photo
          </span>
        </div>
      </div>

      <!-- Display Name & Age Info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
          <input
            v-model="form.displayName"
            type="text"
            required
            class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Age</label>
          <input
            :value="authStore.profile?.age ? `${authStore.profile.age} years old` : '18+'"
            disabled
            class="w-full bg-slate-800/50 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed"
          />
        </div>
      </div>

      <!-- Approximate Location -->
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Approximate City / Location</label>
        <input
          v-model="form.approximateLocation"
          type="text"
          placeholder="e.g. Hyderabad, Bengaluru, Mumbai, Secunderabad"
          class="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span class="text-[10px] text-slate-500 mt-1 block">
          To protect your privacy, only show your city or approximate area — never exact addresses.
        </span>
      </div>

      <!-- Bio / About You -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-xs font-semibold text-slate-300">About You & Conversation Prompts</label>
          <span class="text-[10px] text-slate-500">{{ (form.bio || '').length }}/500</span>
        </div>
        <textarea
          v-model="form.bio"
          rows="3"
          maxlength="500"
          placeholder="What kind of topics spark your curiosity? Favorite books, coffee habits, creative projects..."
          class="w-full bg-slate-800 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        ></textarea>
      </div>

      <!-- Preferred Interaction Types -->
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-2">
          What kind of interactions are you open to?
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="pref in availablePreferences"
            :key="pref"
            type="button"
            @click="togglePreference(pref)"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            :class="
              form.interactionPreferences.includes(pref)
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
            "
          >
            {{ pref }}
          </button>
        </div>
      </div>

      <!-- Interests Selector -->
      <div class="pt-2 border-t border-slate-800">
        <label class="block text-xs font-semibold text-slate-300 mb-2">Interests & Hobbies</label>
        <InterestSelector v-model="form.interestIds" />
      </div>

      <!-- Save Button -->
      <div class="pt-4 border-t border-slate-800 flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
        >
          <span v-if="saving">Saving Changes...</span>
          <span v-else>Save Profile</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import InterestSelector from '../components/InterestSelector.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const saving = ref(false);
const successMsg = ref<string | null>(null);
const errorMsg = ref<string | null>(null);

const availablePreferences = [
  'Deep conversations',
  'Casual chats',
  'Shared hobbies',
  'Creative collaboration',
  'Book/Movie discussions',
  'Coding & Tech talk',
  'Philosophy & Ideas',
  'Language exchange',
];

const form = reactive({
  displayName: '',
  avatarUrl: '',
  approximateLocation: '',
  bio: '',
  interactionPreferences: [] as string[],
  interestIds: [] as string[],
});

onMounted(() => {
  const profile = authStore.profile;
  if (profile) {
    form.displayName = profile.displayName || '';
    form.avatarUrl = profile.avatarUrl || '';
    form.approximateLocation = profile.approximateLocation || '';
    form.bio = profile.bio || '';
    form.interactionPreferences = [...(profile.interactionPreferences || [])];
    form.interestIds = (profile.interests || []).map((i) => i.id);
  }
});

function togglePreference(pref: string) {
  if (form.interactionPreferences.includes(pref)) {
    form.interactionPreferences = form.interactionPreferences.filter((p) => p !== pref);
  } else {
    form.interactionPreferences.push(pref);
  }
}

async function saveProfile() {
  saving.value = true;
  successMsg.value = null;
  errorMsg.value = null;
  try {
    await authStore.updateProfile({
      displayName: form.displayName,
      avatarUrl: form.avatarUrl,
      approximateLocation: form.approximateLocation,
      bio: form.bio,
      interactionPreferences: form.interactionPreferences,
      interestIds: form.interestIds,
    });
    successMsg.value = 'Profile updated successfully!';
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to update profile';
  } finally {
    saving.value = false;
  }
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
