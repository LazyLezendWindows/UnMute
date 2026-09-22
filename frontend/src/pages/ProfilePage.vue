<template>
  <div class="d-flex flex-column gap-4 max-w-xl mx-auto w-100 py-2">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between pb-2 border-bottom" style="border-color: var(--unmute-glass-border) !important;">
      <div>
        <h1 class="fs-3 fw-bolder tracking-tight mb-1 font-editorial" style="color: var(--unmute-text-primary);">
          Your Profile
        </h1>
        <p class="small mb-0" style="color: var(--unmute-text-muted);">
          Present your authentic self in a private, high-standard space
        </p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <router-link to="/settings">
          <UButton variant="secondary" size="sm">
            <i class="ri-settings-4-line me-1"></i>
            <span>Settings</span>
          </UButton>
        </router-link>
        <UButton
          variant="ghost"
          size="sm"
          @click="handleLogout"
        >
          <i class="ri-logout-box-r-line me-1"></i>
          <span>Log out</span>
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

    <!-- Luxury Ambient Profile Hero Banner -->
    <div class="profile-hero-banner rounded-4 position-relative overflow-hidden p-4 d-flex align-items-end">
      <div class="profile-hero-backdrop position-absolute top-0 start-0 end-0 bottom-0"></div>
      <div class="position-relative z-1 d-flex align-items-center gap-3 w-100 flex-wrap justify-content-between">
        <div class="d-flex align-items-center gap-3">
          <div class="profile-avatar-frame rounded-circle p-1" style="background: var(--unmute-gold-gradient); box-shadow: var(--unmute-gold-glow);">
            <UAvatar
              :src="form.avatarUrl"
              :name="form.displayName || 'User'"
              size="xl"
            />
          </div>
          <div>
            <div class="d-flex align-items-center gap-2">
              <h2 class="fs-4 fw-bold text-white mb-0 font-editorial">
                {{ form.displayName || 'Anonymous Member' }}
              </h2>
              <UBadge variant="gold" size="sm">
                <i class="ri-shield-check-fill icon-xs me-1"></i>
                <span>18+ Verified</span>
              </UBadge>
            </div>
            <span class="small text-white-50 mt-1 d-block">
              {{ form.approximateLocation || 'Private Location' }} • Member of Unmute
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Voice Introduction Audio Module (Unmute Signature) -->
    <UCard variant="elevated" padding="md">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <div class="p-2 rounded-3" style="background: var(--unmute-gold-surface); color: var(--unmute-gold-dark);">
              <i class="ri-mic-line fs-5"></i>
            </div>
            <div>
              <h3 class="fs-6 fw-bold mb-0 font-editorial" style="color: var(--unmute-text-primary);">
                Signature Voice Prompt
              </h3>
              <p class="extra-small mb-0" style="color: var(--unmute-text-muted);">
                Your voice reveals warmth and authenticity before physical appearances
              </p>
            </div>
          </div>
          <UBadge variant="gold" size="sm">Active</UBadge>
        </div>

        <div class="p-3 rounded-3 surface-raised d-flex align-items-center justify-content-between border" style="border-color: var(--unmute-glass-border) !important;">
          <div class="d-flex align-items-center gap-3">
            <button
              type="button"
              @click="toggleProfileAudio"
              class="profile-audio-btn rounded-circle border-0 d-flex align-items-center justify-content-center"
              :class="{ 'playing': isPlayingAudio }"
            >
              <i :class="isPlayingAudio ? 'ri-pause-fill' : 'ri-play-fill'" class="fs-5"></i>
            </button>
            <div>
              <span class="small fw-semibold d-block" style="color: var(--unmute-text-primary);">
                {{ isPlayingAudio ? 'Playing intro preview...' : 'My 30-second Voice Greeting' }}
              </span>
              <span class="extra-small" style="color: var(--unmute-text-dim);">Duration: 0:24 • Recorded in Sanctuary</span>
            </div>
          </div>

          <div class="d-flex align-items-center gap-1">
            <span class="p-sw-bar" :class="{ 'anim': isPlayingAudio }" style="height: 10px;"></span>
            <span class="p-sw-bar" :class="{ 'anim': isPlayingAudio }" style="height: 18px;"></span>
            <span class="p-sw-bar" :class="{ 'anim': isPlayingAudio }" style="height: 14px;"></span>
            <span class="p-sw-bar" :class="{ 'anim': isPlayingAudio }" style="height: 22px;"></span>
            <span class="p-sw-bar" :class="{ 'anim': isPlayingAudio }" style="height: 12px;"></span>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Profile Form in UCard -->
    <form @submit.prevent="saveProfile">
      <UCard variant="elevated" padding="lg">
        <div class="d-flex flex-column gap-4">
          <!-- Profile Photo URL -->
          <div>
            <UInput
              v-model="form.avatarUrl"
              label="Profile Photo URL"
              type="url"
              placeholder="https://images.unsplash.com/..."
              hint="Enter an image URL for your public profile photo"
            />
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
                    : 'surface-raised'
                "
                :style="form.interactionPreferences.includes(pref) ? { background: 'var(--unmute-obsidian-gradient)', color: '#ffffff', boxShadow: '0 2px 8px rgba(10,10,10,0.2)' } : { color: 'var(--unmute-text-secondary)' }"
              >
                {{ pref }}
              </button>
            </div>
          </div>

          <!-- Interests Selector -->
          <div class="pt-3 border-top" style="border-color: var(--unmute-glass-border) !important;">
            <label class="form-label small fw-semibold mb-2" style="color: var(--unmute-text-secondary);">Interests & Hobbies</label>
            <InterestSelector v-model="form.interestIds" />
          </div>

          <!-- Save Button -->
          <div class="pt-3 border-top d-flex justify-content-end" style="border-color: var(--unmute-glass-border) !important;">
            <UButton
              type="submit"
              variant="primary"
              size="lg"
              :loading="saving"
            >
              Save Profile Changes
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
import UBadge from '../components/ui/UBadge.vue';
import UInput from '../components/ui/UInput.vue';
import UButton from '../components/ui/UButton.vue';
import InterestSelector from '../components/InterestSelector.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const saving = ref(false);
const successMsg = ref<string | null>(null);
const errorMsg = ref<string | null>(null);
const isPlayingAudio = ref(false);

function toggleProfileAudio() {
  isPlayingAudio.value = !isPlayingAudio.value;
}

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

.profile-hero-banner {
  background: var(--unmute-obsidian-gradient, linear-gradient(135deg, #1a1817 0%, #0a0a0a 100%));
  min-height: 130px;
  border: 1px solid var(--unmute-gold-border);
  box-shadow: var(--unmute-shadow-3d);
}

.profile-hero-backdrop {
  background: radial-gradient(circle at 85% 20%, rgba(197, 168, 128, 0.22) 0%, transparent 60%);
}

.profile-avatar-frame {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.profile-audio-btn {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--unmute-obsidian-gradient);
  color: var(--unmute-gold);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: scale(1.08);
    color: #ffffff;
  }

  &.playing {
    background: var(--unmute-gold-gradient);
    color: #1a1817;
  }
}

.p-sw-bar {
  width: 3px;
  background-color: var(--unmute-gold, #c5a880);
  border-radius: 9999px;
  opacity: 0.45;
  transition: height 0.2s ease;

  &.anim {
    animation: profileSoundwave 0.8s ease-in-out infinite alternate;
    opacity: 1;

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
    &:nth-child(4) { animation-delay: 0.45s; }
    &:nth-child(5) { animation-delay: 0.2s; }
  }
}

@keyframes profileSoundwave {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1.3); }
}

.pref-chip-btn {
  border: 1px solid var(--unmute-glass-border, rgba(10, 10, 10, 0.08)) !important;
  transition: all 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--unmute-gold-border) !important;
  }

  &.pref-selected {
    border-color: rgba(255, 255, 255, 0.25) !important;
  }
}
</style>
