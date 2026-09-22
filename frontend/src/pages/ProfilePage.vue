<template>
  <div class="max-w-xl mx-auto w-full space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight" style="color: var(--unmute-text-primary);">Your Profile</h1>
        <p class="text-xs" style="color: var(--unmute-text-muted);">Share your interests and intentions without the pressure</p>
      </div>
      <div class="flex items-center gap-2">
        <router-link to="/settings">
          <UButton variant="secondary" size="sm">
            <template #default>Settings</template>
          </UButton>
        </router-link>
        <UButton
          variant="ghost"
          size="sm"
          @click="handleLogout"
        >
          Log out
        </UButton>
      </div>
    </div>

    <!-- Feedback Message -->
    <div v-if="successMsg" class="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
      <span>✓</span>
      <span>{{ successMsg }}</span>
    </div>
    <div v-if="errorMsg" class="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-300">
      {{ errorMsg }}
    </div>

    <!-- Profile Form in UCard -->
    <form @submit.prevent="saveProfile">
      <UCard variant="elevated" padding="lg" class="space-y-6">
        <!-- Avatar Section with UAvatar -->
        <div class="flex items-center gap-4 p-4 rounded-2xl surface-raised border border-white/5">
          <UAvatar
            :src="form.avatarUrl"
            :name="form.displayName || 'User'"
            size="xl"
            :border="true"
          />

          <div class="flex-1">
            <UInput
              v-model="form.avatarUrl"
              label="Profile Photo URL"
              type="url"
              placeholder="https://images.unsplash.com/..."
              hint="Enter an image URL for your public profile photo"
            />
          </div>
        </div>

        <!-- Display Name & Age Info -->
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <UInput
              v-model="form.displayName"
              label="Display Name"
              required
              placeholder="Your name"
            />
          </div>

          <div class="col-12 col-sm-6">
            <UInput
              :model-value="authStore.profile?.age ? `${authStore.profile.age} years old` : '18+'"
              label="Age (Verified 18+)"
              disabled
              hint="Calculated from date of birth"
            />
          </div>
        </div>

        <!-- Approximate Location -->
        <div>
          <UInput
            v-model="form.approximateLocation"
            label="Approximate City / Location"
            placeholder="e.g. Hyderabad, Bengaluru, Mumbai, Secunderabad"
            hint="To protect your privacy, only your city or region is shown to others"
          />
        </div>

        <!-- Bio / About You -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold" style="color: var(--unmute-text-secondary);">
              About You & Conversation Prompts
            </label>
            <span class="text-[10px]" style="color: var(--unmute-text-dim);">{{ (form.bio || '').length }}/500</span>
          </div>
          <textarea
            v-model="form.bio"
            rows="3"
            maxlength="500"
            placeholder="What kind of topics spark your curiosity? Favorite books, coffee habits, creative projects..."
            class="w-full rounded-2xl p-3.5 text-xs sm:text-sm transition-all focus:outline-none"
            style="background-color: var(--unmute-input-bg); color: var(--unmute-text-primary); border: 1px solid var(--unmute-input-border);"
          ></textarea>
        </div>

        <!-- Preferred Interaction Types -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold" style="color: var(--unmute-text-secondary);">
            What kind of interactions are you open to?
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="pref in availablePreferences"
              :key="pref"
              type="button"
              @click="togglePreference(pref)"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all select-none active:scale-95"
              :class="
                form.interactionPreferences.includes(pref)
                  ? 'text-white shadow-sm border border-white/20'
                  : 'surface-raised hover:brightness-105 border border-white/5'
              "
              :style="form.interactionPreferences.includes(pref) ? { background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)' } : { color: 'var(--unmute-text-secondary)' }"
            >
              {{ pref }}
            </button>
          </div>
        </div>

        <!-- Interests Selector -->
        <div class="pt-4 border-t border-white/10">
          <label class="block text-xs font-semibold mb-2" style="color: var(--unmute-text-secondary);">Interests & Hobbies</label>
          <InterestSelector v-model="form.interestIds" />
        </div>

        <!-- Save Button -->
        <div class="pt-4 border-t border-white/10 flex justify-end">
          <UButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="saving"
          >
            Save Profile
          </UButton>
        </div>
      </UCard>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UInput from '../components/ui/UInput.vue';
import UButton from '../components/ui/UButton.vue';
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
