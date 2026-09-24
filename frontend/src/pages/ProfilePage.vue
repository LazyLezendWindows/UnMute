<template>
  <div class="profile-page d-flex flex-column w-100">
    <PageHeader title="Profile" subtitle="How you appear to people you meet.">
      <template #actions>
        <UButton variant="glass" size="sm" @click="router.push('/settings')">
          <i class="ri-settings-3-line me-1" aria-hidden="true"></i>
          Settings
        </UButton>
        <UButton variant="ghost" size="sm" @click="handleLogout">Log out</UButton>
      </template>
    </PageHeader>

    <div class="profile-grid">
      <!-- Identity: how others see you, and what would make the profile stronger -->
      <aside class="identity glass-pane enter-rise" style="--i: 0">
        <div class="identity-avatar">
          <UAvatar :src="authStore.profile?.avatarUrl" :name="authStore.profile?.displayName || 'You'" size="xl" />
        </div>
        <h2 class="identity-name mb-0">
          {{ authStore.profile?.displayName || 'You' }}<span v-if="authStore.profile?.age">, {{ authStore.profile.age }}</span>
        </h2>
        <p v-if="authStore.profile?.approximateLocation" class="identity-line mb-0">
          <i class="ri-map-pin-2-line" aria-hidden="true"></i> {{ authStore.profile.approximateLocation }}
        </p>
        <p v-if="authStore.profile?.education" class="identity-line mb-0">
          <i class="ri-graduation-cap-line" aria-hidden="true"></i>
          {{ authStore.profile.education.institutionShortName || authStore.profile.education.institutionName }}
        </p>

        <div class="strength">
          <svg class="strength-ring" viewBox="0 0 120 120" role="img" :aria-label="`Profile ${strength.percent}% complete`">
            <defs>
              <linearGradient id="strength-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="var(--unmute-primary-light)" />
                <stop offset="100%" stop-color="var(--unmute-primary)" />
              </linearGradient>
            </defs>
            <circle class="ring-track" cx="60" cy="60" r="52" />
            <circle
              class="ring-value"
              cx="60"
              cy="60"
              r="52"
              :stroke-dasharray="`${(strength.percent / 100) * RING_LENGTH} ${RING_LENGTH}`"
            />
          </svg>
          <div class="strength-label">
            <strong>{{ strength.percent }}%</strong>
            <span>profile strength</span>
          </div>
        </div>

        <ul v-if="strength.missing.length" class="strength-todo list-unstyled mb-0">
          <li v-for="item in strength.missing" :key="item">
            <i class="ri-add-circle-line" aria-hidden="true"></i> {{ item }}
          </li>
        </ul>
        <p v-else class="identity-line mb-0 justify-content-center">
          <i class="ri-checkbox-circle-line" aria-hidden="true"></i> Your profile is complete
        </p>
      </aside>

      <div class="d-flex flex-column gap-4 min-w-0 enter-rise" style="--i: 1">
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
                  :src="authStore.profile?.avatarUrl"
                  :name="form.displayName || 'User'"
                  size="xl"
                  :border="true"
                />

                <div class="flex-grow-1 d-flex flex-column gap-2 min-w-0">
                  <span class="small fw-bold u-text-primary">Profile photo</span>
                  <div class="d-flex flex-wrap gap-2">
                    <template v-if="photoUploads">
                      <input
                        ref="photoInput"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                        class="visually-hidden"
                        tabindex="-1"
                        aria-hidden="true"
                        @change="onPhotoChosen"
                      />
                      <UButton variant="secondary" size="sm" :loading="photoBusy === 'upload'" :disabled="photoBusy !== null" @click="photoInput?.click()">
                        <i class="ri-upload-2-line me-1" aria-hidden="true"></i>
                        {{ authStore.profile?.avatarUrl ? 'Change photo' : 'Upload photo' }}
                      </UButton>
                    </template>
                    <UButton
                      v-if="authStore.profile?.avatarUrl"
                      variant="ghost"
                      size="sm"
                      :loading="photoBusy === 'remove'"
                      :disabled="photoBusy !== null"
                      @click="removePhoto"
                    >
                      <i class="ri-delete-bin-6-line me-1" aria-hidden="true"></i> Remove photo
                    </UButton>
                  </div>
                  <p class="extra-small mb-0 u-text-muted">
                    {{
                      photoUploads
                        ? 'JPEG, PNG, WebP or HEIC, up to 10 MB. Location and camera details are removed.'
                        : 'Your Google profile photo is used when you sign in with Google.'
                    }}
                  </p>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue';
import PageHeader from '../components/layout/PageHeader.vue';
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
import { loadAuthConfig } from '../services/authConfig';

const router = useRouter();
const authStore = useAuthStore();

const RING_LENGTH = 2 * Math.PI * 52;

/** What a complete profile has; drives the strength ring and the "add this" list. */
const strength = computed(() => {
  const p = authStore.profile;
  const checks: [boolean, string][] = [
    [Boolean(p?.avatarUrl), 'Add a profile photo'],
    [(p?.bio || '').trim().length >= 20, 'Write a short bio'],
    [(p?.interests?.length ?? 0) >= 3, 'Pick at least 3 interests'],
    [(p?.interactionPreferences?.length ?? 0) > 0, 'Say what you are open to'],
    [Boolean(p?.location), 'Set your area'],
    [Boolean(p?.education), 'Add your college (optional)'],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, label]) => label) };
});

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
  bio: '',
  interactionPreferences: [] as string[],
  interestIds: [] as string[],
});

onMounted(() => {
  const profile = authStore.profile;
  if (profile) {
    form.displayName = profile.displayName || '';
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

// Photo changes apply immediately (they are not part of the Save button's form).
const photoUploads = ref(false);
const photoBusy = ref<'upload' | 'remove' | null>(null);
const photoInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  try {
    photoUploads.value = (await loadAuthConfig()).photoUploads;
  } catch {
    photoUploads.value = false;
  }
});

async function onPhotoChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // choosing the same file again still triggers a change
  if (!file) return;
  photoBusy.value = 'upload';
  try {
    await authStore.uploadPhoto(file);
    useToastStore().success('Photo updated.');
  } catch (err) {
    useToastStore().error(err instanceof Error && err.message ? err.message : 'The upload failed. Please try again.');
  } finally {
    photoBusy.value = null;
  }
}

async function removePhoto() {
  photoBusy.value = 'remove';
  try {
    await authStore.removePhoto();
    useToastStore().success('Photo removed.');
  } catch (err) {
    useToastStore().error(err instanceof Error && err.message ? err.message : 'Could not remove the photo.');
  } finally {
    photoBusy.value = null;
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<style scoped lang="scss">
.profile-grid {
  display: grid;
  gap: 1.5rem;
  align-items: start;

  @media (min-width: 992px) {
    grid-template-columns: 19rem minmax(0, 1fr);
    gap: 2rem;
  }
}

.identity {
  border-radius: var(--unmute-radius-xl);
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35rem;

  @media (min-width: 992px) {
    position: sticky;
    top: 2rem;
  }
}

.identity-avatar {
  padding: 5px;
  border-radius: 50%;
  background: var(--unmute-chrome);
  box-shadow: var(--unmute-shadow-lg);
  margin-bottom: 0.75rem;

  :deep(.u-avatar),
  :deep(img),
  :deep(div) {
    border-radius: 50% !important;
  }
}

.identity-name {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--unmute-text-primary);
}

.identity-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--unmute-text-muted);
}

.strength {
  position: relative;
  width: 8.5rem;
  height: 8.5rem;
  margin: 1.25rem 0 0.75rem;
}

.strength-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: var(--unmute-glass-border);
  stroke-width: 10;
}

.ring-value {
  fill: none;
  stroke: url(#strength-gradient);
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dasharray 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.strength-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  strong {
    font-family: var(--unmute-font-display);
    font-size: 1.7rem;
    font-weight: 800;
    color: var(--unmute-text-primary);
    line-height: 1;
  }

  span {
    font-size: 0.68rem;
    color: var(--unmute-text-muted);
    margin-top: 0.2rem;
  }
}

.strength-todo {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: left;

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--unmute-radius-sm);
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--unmute-text-secondary);
    background: var(--unmute-glass-surface);
    box-shadow: var(--unmute-glass-edge);

    i {
      color: var(--unmute-accent-text);
    }
  }
}

.min-w-0 {
  min-width: 0;
}

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
