<template>
  <div class="d-flex flex-column gap-4 max-w-xl mx-auto w-100">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between">
      <div>
        <h1 class="fs-4 fw-bolder tracking-tight mb-1 font-display" style="color: var(--unmute-text-primary);">Your Profile</h1>
        <p class="small mb-0" style="color: var(--unmute-text-muted);">Share your interests and intentions without the pressure</p>
      </div>
      <div class="d-flex align-items-center gap-2">
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
    <div v-if="successMsg" class="alert alert-success py-2 px-3 small rounded-3 d-flex align-items-center gap-2 mb-0">
      <span>✓</span>
      <span>{{ successMsg }}</span>
    </div>
    <div v-if="errorMsg" class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
      {{ errorMsg }}
    </div>

    <!-- Profile Form in UCard -->
    <form @submit.prevent="saveProfile">
      <UCard variant="elevated" padding="lg">
        <div class="d-flex flex-column gap-4">
          <!-- Avatar Section with UAvatar -->
          <div class="d-flex align-items-center gap-3 p-3 rounded-4 surface-raised border" style="border-color: var(--unmute-border) !important;">
            <UAvatar
              :src="form.avatarUrl"
              :name="form.displayName || 'User'"
              size="xl"
              :border="true"
            />

            <div class="flex-grow-1">
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
          <div>
            <div class="d-flex align-items-center justify-content-between mb-1">
              <label class="form-label small fw-semibold mb-0" style="color: var(--unmute-text-secondary);">
                About You & Conversation Prompts
              </label>
              <span class="extra-small" style="color: var(--unmute-text-dim);">{{ (form.bio || '').length }}/500</span>
            </div>
            <textarea
              v-model="form.bio"
              rows="3"
              maxlength="500"
              placeholder="What kind of topics spark your curiosity? Favorite books, coffee habits, creative projects..."
              class="form-control rounded-3 p-3 small"
              style="background-color: var(--unmute-input-bg); color: var(--unmute-text-primary); border: 1px solid var(--unmute-input-border);"
            ></textarea>
          </div>

          <!-- Preferred Interaction Types -->
          <div>
            <label class="form-label small fw-semibold mb-2" style="color: var(--unmute-text-secondary);">
              What kind of interactions are you open to?
            </label>
            <div class="d-flex flex-wrap gap-2">
              <button
                v-for="pref in availablePreferences"
                :key="pref"
                type="button"
                @click="togglePreference(pref)"
                class="pref-chip-btn btn btn-sm py-1 px-3 border-0 small fw-semibold rounded-pill user-select-none"
                :class="
                  form.interactionPreferences.includes(pref)
                    ? 'pref-selected'
                    : 'surface-raised text-white-50'
                "
                :style="form.interactionPreferences.includes(pref) ? { background: 'var(--unmute-primary-gradient)', boxShadow: 'var(--unmute-glow-primary)', color: '#ffffff' } : {}"
              >
                {{ pref }}
              </button>
            </div>
          </div>

          <!-- Interests Selector -->
          <div class="pt-3 border-top" style="border-color: var(--unmute-border) !important;">
            <label class="form-label small fw-semibold mb-2" style="color: var(--unmute-text-secondary);">Interests & Hobbies</label>
            <InterestSelector v-model="form.interestIds" />
          </div>

          <!-- Save Button -->
          <div class="pt-3 border-top d-flex justify-content-end" style="border-color: var(--unmute-border) !important;">
            <UButton
              type="submit"
              variant="primary"
              size="lg"
              :loading="saving"
            >
              Save Profile
            </UButton>
          </div>
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

<style scoped lang="scss">
.extra-small {
  font-size: 0.6875rem;
}

.pref-chip-btn {
  border: 1px solid var(--unmute-border, rgba(255, 255, 255, 0.08)) !important;
  transition: all 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    color: #ffffff;
  }

  &.pref-selected {
    border-color: rgba(255, 255, 255, 0.25) !important;
  }
}
</style>
