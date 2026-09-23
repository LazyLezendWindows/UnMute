<template>
  <div class="d-flex flex-column gap-4 max-w-xl mx-auto w-100">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between">
      <div>
        <h1 class="fs-4 fw-bolder tracking-tight mb-1 font-display u-text-primary">Your Profile</h1>
        <p class="small mb-0 u-text-muted">Share your interests and intentions without the pressure</p>
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
    <div v-if="errorMsg" class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
      {{ errorMsg }}
    </div>

    <!-- Profile Form in UCard -->
    <form @submit.prevent="saveProfile">
      <UCard variant="elevated" padding="lg">
        <div class="d-flex flex-column gap-4">
          <!-- Avatar Section with UAvatar -->
          <div class="d-flex align-items-center gap-3 p-3 rounded-4 surface-raised border u-border-default">
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

          <!-- Bio / About You -->
          <div>
            <div class="d-flex align-items-center justify-content-between mb-1">
              <label class="form-label small fw-semibold mb-0 u-text-secondary">
                About You & Conversation Prompts
              </label>
              <span class="extra-small u-text-dim">{{ (form.bio || '').length }}/500</span>
            </div>
            <textarea
              v-model="form.bio"
              rows="3"
              maxlength="500"
              placeholder="What kind of topics spark your curiosity? Favorite books, coffee habits, creative projects..."
              class="form-control rounded-3 p-3 small u-input-surface"
            ></textarea>
          </div>

          <!-- Preferred Interaction Types -->
          <div>
            <label class="form-label small fw-semibold mb-2 u-text-secondary">
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
                    : 'surface-raised u-text-secondary'
                "
              >
                {{ pref }}
              </button>
            </div>
          </div>

          <!-- Interests Selector -->
          <div class="pt-3 border-top u-border-default">
            <label class="form-label small fw-semibold mb-2 u-text-secondary">Interests & Hobbies</label>
            <InterestSelector v-model="form.interestIds" />
          </div>

          <!-- Save Button -->
          <div class="pt-3 border-top d-flex justify-content-end u-border-default">
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

    <!-- Area and education save on their own, separately from the form above. -->
    <UCard variant="elevated" padding="lg">
      <h2 class="fs-6 fw-bold mb-1 u-text-primary">Your area</h2>
      <p class="small mb-3 u-text-muted">Used for "near me" and area filters in Discover.</p>
      <LocationPicker />
    </UCard>

    <UCard variant="elevated" padding="lg">
      <h2 class="fs-6 fw-bold mb-1 u-text-primary">Education</h2>
      <p class="small mb-3 u-text-muted">Optional. Helps classmates and alumni find you.</p>
      <EducationPicker />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UCard from '../components/ui/UCard.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UInput from '../components/ui/UInput.vue';
import UButton from '../components/ui/UButton.vue';
import InterestSelector from '../components/profile/InterestSelector.vue';
import LocationPicker from '../components/location/LocationPicker.vue';
import EducationPicker from '../components/education/EducationPicker.vue';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const authStore = useAuthStore();

const saving = ref(false);
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
  bio: '',
  interactionPreferences: [] as string[],
  interestIds: [] as string[],
});

onMounted(() => {
  const profile = authStore.profile;
  if (profile) {
    form.displayName = profile.displayName || '';
    form.avatarUrl = profile.avatarUrl || '';
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
  errorMsg.value = null;
  try {
    await authStore.updateProfile({
      displayName: form.displayName,
      avatarUrl: form.avatarUrl,
      bio: form.bio,
      interactionPreferences: form.interactionPreferences,
      interestIds: form.interestIds,
    });
    useToastStore().success('Profile updated.');
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to update profile';
  } finally {
    saving.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
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
    background: var(--unmute-primary-gradient);
    box-shadow: var(--unmute-glow-primary);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.25) !important;
  }
}
</style>
