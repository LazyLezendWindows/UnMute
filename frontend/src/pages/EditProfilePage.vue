<template>
  <div class="edit-profile-page d-flex flex-column w-100 pb-5">
    <!-- Header -->
    <header class="edit-header d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="back-btn" @click="router.back()" aria-label="Go back">
          <i class="ri-arrow-left-line" aria-hidden="true"></i>
        </button>
        <h1 class="page-title mb-0">Edit Profile</h1>
      </div>
      <button type="button" class="save-pill-btn" :disabled="saving" @click="saveProfile">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </header>

    <div class="edit-body enter-rise d-flex flex-column gap-4">
      <!-- Photos Section -->
      <section class="edit-section">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h2 class="section-title mb-0">Photos</h2>
          <span class="count-badge">{{ displayPhotos.length }}/6</span>
        </div>

        <!-- 3-Column Asymmetric Photo Grid: 1 tall on left, 2x2 on right -->
        <div class="photos-asymmetric-grid">
          <!-- Main slot (tall, spans 2 rows on left) -->
          <div class="photo-box photo-box-main">
            <template v-if="displayPhotos[0]">
              <img :src="displayPhotos[0].url" alt="Main profile photo" class="slot-img" />
              <span class="main-tag">Main</span>
              <button
                type="button"
                class="slot-remove-btn"
                :disabled="photoBusy !== null"
                aria-label="Remove photo"
                @click="handleRemovePhoto(displayPhotos[0])"
              >
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </template>
            <template v-else>
              <button type="button" class="slot-add-btn" :disabled="photoBusy !== null" @click="triggerPhotoUpload">
                <i class="ri-add-line" aria-hidden="true"></i>
                <span>Add photo</span>
              </button>
            </template>
          </div>

          <!-- Secondary slots (4 slots on right: 2 rows of 2) -->
          <div v-for="index in 4" :key="index" class="photo-box photo-box-sub">
            <template v-if="displayPhotos[index]">
              <img :src="displayPhotos[index].url" alt="Profile photo" class="slot-img" />
              <button
                type="button"
                class="slot-remove-btn"
                :disabled="photoBusy !== null"
                aria-label="Remove photo"
                @click="handleRemovePhoto(displayPhotos[index])"
              >
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </template>
            <template v-else>
              <button type="button" class="slot-add-btn" :disabled="photoBusy !== null" @click="triggerPhotoUpload">
                <i class="ri-add-line" aria-hidden="true"></i>
                <span class="add-txt">Add photo</span>
              </button>
            </template>
          </div>
        </div>

        <input
          ref="photoInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          class="visually-hidden"
          tabindex="-1"
          aria-hidden="true"
          @change="onPhotoChosen"
        />
      </section>

      <!-- Display Name Section -->
      <section class="edit-section">
        <label for="name-input" class="section-title mb-2 d-block">Display Name</label>
        <input
          id="name-input"
          v-model="form.displayName"
          type="text"
          placeholder="Your display name"
          class="custom-input w-100"
          maxlength="50"
        />
      </section>

      <!-- About You Section -->
      <section class="edit-section">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label for="bio-input" class="section-title mb-0">About You</label>
          <span class="count-badge">{{ (form.bio || '').length }}/500</span>
        </div>
        <textarea
          id="bio-input"
          v-model="form.bio"
          rows="4"
          maxlength="500"
          placeholder="Share what kind of conversations you enjoy, your hobbies, favorite books, music..."
          class="custom-textarea w-100"
        ></textarea>
      </section>

      <!-- Profession Section -->
      <section class="edit-section">
        <label for="profession-input" class="section-title mb-2 d-block">Profession / Work</label>
        <input
          id="profession-input"
          v-model="form.profession"
          type="text"
          placeholder="e.g. Software Engineer, Designer, Student"
          class="custom-input w-100"
          maxlength="80"
        />
      </section>

      <!-- Age Section (Calculated from verified DOB) -->
      <section class="edit-section">
        <label for="age-select" class="section-title mb-2 d-block">Age (Verified 18+)</label>
        <div class="custom-select-wrapper position-relative">
          <select id="age-select" class="custom-select w-100" disabled>
            <option selected>{{ authStore.profile?.age ? `${authStore.profile.age} years old` : 'Verified 18+' }}</option>
          </select>
          <i class="ri-arrow-down-s-line select-chevron" aria-hidden="true"></i>
        </div>
      </section>

      <!-- Location Section -->
      <section class="edit-section">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="section-title mb-0">Location</label>
          <button type="button" class="edit-inline-btn" @click="showLocationPicker = !showLocationPicker">
            {{ showLocationPicker ? 'Done' : 'Change' }}
          </button>
        </div>
        <input
          type="text"
          :value="authStore.profile?.approximateLocation || 'No location set'"
          readonly
          class="custom-input w-100 mb-2"
        />
        <div v-if="showLocationPicker" class="p-3 surface-raised rounded-4 border u-border-glass">
          <LocationPicker />
        </div>
      </section>

      <!-- Education Section -->
      <section class="edit-section">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="section-title mb-0">Education</label>
          <button type="button" class="edit-inline-btn" @click="showEducationPicker = !showEducationPicker">
            {{ showEducationPicker ? 'Done' : 'Change' }}
          </button>
        </div>
        <input
          type="text"
          :value="educationSummary"
          readonly
          class="custom-input w-100 mb-2"
        />
        <div v-if="showEducationPicker" class="p-3 surface-raised rounded-4 border u-border-glass">
          <EducationPicker />
        </div>
      </section>

      <!-- Interests Link / Preview Section -->
      <section class="edit-section">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="section-title mb-0">Interests ({{ (authStore.profile?.interests || []).length }}/10)</span>
          <router-link to="/profile/interests" class="edit-inline-btn text-decoration-none">
            Edit
          </router-link>
        </div>
        <div v-if="(authStore.profile?.interests || []).length > 0" class="d-flex flex-wrap gap-2">
          <span
            v-for="interest in authStore.profile?.interests"
            :key="interest.id"
            class="interest-pill"
          >
            {{ interest.name }}
          </span>
        </div>
        <p v-else class="text-muted small mb-0">
          No interests selected yet.
          <router-link to="/profile/interests" class="text-primary ms-1">Choose interests</router-link>
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import LocationPicker from '../components/location/LocationPicker.vue';
import EducationPicker from '../components/education/EducationPicker.vue';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import type { OwnPhoto } from '../types';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

const saving = ref(false);
const photoBusy = ref<string | null>(null);
const photoInput = ref<HTMLInputElement | null>(null);
const showLocationPicker = ref(false);
const showEducationPicker = ref(false);

const form = reactive({
  displayName: '',
  bio: '',
  profession: '',
});

onMounted(() => {
  const p = authStore.profile;
  if (p) {
    form.displayName = p.displayName || '';
    form.bio = p.bio || '';
    form.profession = p.profession || '';
  }
});

const educationSummary = computed(() => {
  const edu = authStore.profile?.education;
  if (!edu) return 'No education details added';
  const name = edu.institutionShortName || edu.institutionName;
  return edu.course ? `${name} · ${edu.course}` : name;
});

const displayPhotos = computed<OwnPhoto[]>(() => {
  const p = authStore.profile;
  if (p?.photos && p.photos.length > 0) {
    return p.photos;
  }
  if (p?.avatarUrl) {
    return [{ id: 'main', url: p.avatarUrl, isMain: true }];
  }
  return [];
});

function triggerPhotoUpload() {
  photoInput.value?.click();
}

async function onPhotoChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  photoBusy.value = 'upload';
  try {
    if (displayPhotos.value.length === 0) {
      await authStore.uploadPhoto(file);
    } else {
      await authStore.addPhoto(file);
    }
    toast.success('Photo uploaded successfully.');
  } catch (err: any) {
    toast.error(err.message || 'Photo upload failed. Please try again.');
  } finally {
    photoBusy.value = null;
  }
}

async function handleRemovePhoto(photo: OwnPhoto) {
  photoBusy.value = 'remove';
  try {
    if (photo.id === 'main' || displayPhotos.value.length === 1) {
      await authStore.removePhoto();
    } else {
      await authStore.removePhotoById(photo.id);
    }
    toast.success('Photo removed.');
  } catch (err: any) {
    toast.error(err.message || 'Could not remove photo.');
  } finally {
    photoBusy.value = null;
  }
}

async function saveProfile() {
  if (!form.displayName.trim()) {
    toast.error('Display name cannot be empty.');
    return;
  }
  saving.value = true;
  try {
    await authStore.updateProfile({
      displayName: form.displayName.trim(),
      bio: form.bio,
      profession: form.profession.trim(),
    });
    toast.success('Profile saved successfully.');
    router.back();
  } catch (err: any) {
    toast.error(err.message || 'Failed to save profile');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="scss">
.edit-profile-page {
  max-width: 28rem;
  margin: 0 auto;
}

.edit-header {
  padding: 0.5rem 0.25rem;
}

.page-title {
  font-family: var(--unmute-font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
  letter-spacing: -0.02em;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--unmute-text-primary);
  font-size: 1.35rem;
  cursor: pointer;
  transition: background var(--unmute-transition-fast);

  &:hover {
    background: var(--unmute-surface-raised);
  }
}

.save-pill-btn {
  padding: 0.45rem 1.25rem;
  border-radius: var(--unmute-radius-pill);
  border: none;
  background: var(--unmute-primary-gradient);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9375rem;
  box-shadow: 0 4px 14px -2px rgba(225, 29, 72, 0.4);
  cursor: pointer;
  transition: transform var(--unmute-transition-fast), filter var(--unmute-transition-fast);

  &:hover {
    filter: brightness(1.05);
  }

  &:active {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.count-badge {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--unmute-text-muted);
}

/* Asymmetric Photo Grid: Left is tall (spans 2 rows), right is 2x2 smaller */
.photos-asymmetric-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  grid-template-rows: 5.75rem 5.75rem;
  gap: 0.5rem;
}

.photo-box {
  position: relative;
  border-radius: var(--unmute-radius-md);
  overflow: hidden;
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
}

.photo-box-main {
  grid-column: 1 / 2;
  grid-row: 1 / 3;
}

.slot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.main-tag {
  position: absolute;
  bottom: 0.45rem;
  left: 0.45rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--unmute-radius-pill);
  background: rgba(20, 10, 25, 0.75);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 700;
}

.slot-remove-btn {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  border: none;
  background: rgba(20, 10, 25, 0.6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    background: rgba(225, 29, 72, 0.9);
  }
}

.slot-add-btn {
  width: 100%;
  height: 100%;
  border: 1.5px dashed var(--unmute-glass-border-hover);
  background: var(--unmute-surface);
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--unmute-text-muted);
  gap: 0.2rem;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all var(--unmute-transition-fast);

  .add-txt {
    font-size: 0.6875rem;
    font-weight: 600;
  }

  &:hover {
    border-color: var(--unmute-primary);
    color: var(--unmute-primary);
  }
}

/* Custom Input / Textarea / Select styles */
.custom-textarea,
.custom-input,
.custom-select {
  border: 1px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-md);
  background: var(--unmute-surface);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--unmute-text-primary);
  font-family: var(--unmute-font-body);
  line-height: 1.4;
  outline: none;
  transition: border-color var(--unmute-transition-fast);

  &:focus {
    border-color: var(--unmute-primary);
  }
}

.custom-textarea {
  resize: vertical;
  min-height: 5.5rem;
}

.custom-select-wrapper {
  .select-chevron {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--unmute-text-muted);
    font-size: 1.15rem;
  }
}

.custom-select {
  appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
}

.edit-inline-btn {
  border: none;
  background: none;
  color: var(--unmute-primary);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.interest-pill {
  padding: 0.35rem 0.75rem;
  border-radius: var(--unmute-radius-pill);
  background: #fdf2f8;
  color: #be185d;
  font-size: 0.78125rem;
  font-weight: 600;
  border: 1px solid rgba(225, 29, 72, 0.15);
}
</style>
