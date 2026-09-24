<template>
  <div class="profile-page d-flex flex-column w-100 pb-5">
    <!-- Header -->
    <header class="profile-header d-flex justify-content-between align-items-center mb-3">
      <h1 class="page-title mb-0">Profile</h1>
      <router-link to="/settings" class="settings-btn" aria-label="Settings">
        <i class="ri-settings-3-line" aria-hidden="true"></i>
      </router-link>
    </header>

    <div class="profile-body enter-rise d-flex flex-column gap-3">
      <!-- Centered Avatar, Name, Location, Education -->
      <div class="profile-hero d-flex flex-column align-items-center text-center">
        <div class="avatar-wrapper position-relative mb-2">
          <div class="avatar-ring">
            <UAvatar :src="authStore.profile?.avatarUrl" :name="displayName" size="xl" />
          </div>
          <!-- Camera badge icon at bottom right -->
          <button type="button" class="avatar-camera-badge" @click="router.push('/profile/edit')" aria-label="Change photo">
            <i class="ri-camera-fill" aria-hidden="true"></i>
          </button>
        </div>

        <div class="d-flex align-items-center justify-content-center gap-1">
          <h2 class="hero-name mb-0">
            {{ displayName }}<span v-if="authStore.profile?.age">, {{ authStore.profile.age }}</span>
          </h2>
          <i v-if="authStore.profile?.isVerified" class="ri-verified-badge-fill verified-badge" title="Verified"></i>
        </div>

        <p v-if="authStore.profile?.approximateLocation" class="hero-sub mb-1 mt-1">
          <i class="ri-map-pin-2-fill text-muted me-1"></i>
          {{ authStore.profile.approximateLocation }}
        </p>
        <router-link v-else to="/profile/edit" class="hero-sub-action mb-1 mt-1 text-decoration-none">
          <i class="ri-map-pin-2-line me-1"></i>
          Add your location
        </router-link>

        <p v-if="educationText" class="hero-sub mb-0">
          <i class="ri-graduation-cap-fill text-muted me-1"></i>
          {{ educationText }}
        </p>
        <router-link v-else to="/profile/edit" class="hero-sub-action mb-0 text-decoration-none">
          <i class="ri-graduation-cap-line me-1"></i>
          Add your education
        </router-link>
      </div>

      <!-- Profile Strength Card -->
      <div class="profile-strength-card p-3 d-flex align-items-center gap-3">
        <div class="strength-icon-box flex-shrink-0 d-flex align-items-center justify-content-center">
          <i class="ri-heart-3-fill" aria-hidden="true"></i>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="strength-label">Profile strength</span>
            <span class="strength-percent">{{ strengthPercent }}%</span>
          </div>
          <div class="strength-bar-bg">
            <div class="strength-bar-fill" :style="{ width: `${strengthPercent}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Real Stats Card -->
      <div class="profile-stats-card p-3 d-flex align-items-center justify-content-around text-center">
        <div class="stat-col flex-1">
          <span class="stat-num">{{ chatStore.conversations.length }}</span>
          <span class="stat-txt">Conversations</span>
        </div>
        <div class="stat-separator"></div>
        <div class="stat-col flex-1">
          <span class="stat-num">{{ chatStore.matches.length }}</span>
          <span class="stat-txt">Matches</span>
        </div>
        <div class="stat-separator"></div>
        <div class="stat-col flex-1">
          <span class="stat-num">{{ chatStore.incomingLikes.length }}</span>
          <span class="stat-txt">Likes</span>
        </div>
      </div>

      <!-- Edit Profile Action Card -->
      <router-link to="/profile/edit" class="edit-profile-card p-3 d-flex align-items-center justify-content-between text-decoration-none">
        <div class="d-flex align-items-center gap-3">
          <div class="edit-icon-box flex-shrink-0 d-flex align-items-center justify-content-center">
            <i class="ri-article-line" aria-hidden="true"></i>
          </div>
          <div class="d-flex flex-column text-start">
            <span class="edit-title">Edit profile</span>
            <span class="edit-subtitle">Update your photos, bio and interests</span>
          </div>
        </div>
        <i class="ri-arrow-right-s-line chevron-icon" aria-hidden="true"></i>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UAvatar from '../components/ui/UAvatar.vue';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();

onMounted(async () => {
  await Promise.allSettled([
    authStore.fetchMe(),
    chatStore.loadMatches(),
    chatStore.loadIncomingLikes(),
    chatStore.loadConversations(),
  ]);
});

const displayName = computed(() => {
  return authStore.profile?.displayName || authStore.user?.email?.split('@')[0] || 'Member';
});

const educationText = computed(() => {
  const edu = authStore.profile?.education;
  if (!edu) return null;
  const name = edu.institutionShortName || edu.institutionName;
  return edu.course ? `${name} · ${edu.course}` : name;
});

const strengthPercent = computed(() => {
  const p = authStore.profile;
  if (!p) return 0;
  const checks: boolean[] = [
    Boolean(p.avatarUrl),
    (p.bio || '').trim().length >= 20,
    (p.interests?.length ?? 0) >= 3,
    (p.interactionPreferences?.length ?? 0) > 0,
    Boolean(p.location),
    Boolean(p.education),
  ];
  const done = checks.filter((ok) => ok).length;
  return Math.round((done / checks.length) * 100);
});
</script>

<style scoped lang="scss">
.profile-page {
  max-width: 28rem;
  margin: 0 auto;
}

.profile-header {
  padding: 0.5rem 0.25rem;
}

.page-title {
  font-family: var(--unmute-font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
  letter-spacing: -0.02em;
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: var(--unmute-text-secondary);
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: var(--unmute-shadow-sm);
  font-size: 1.25rem;
  text-decoration: none;
  transition: all var(--unmute-transition-fast);

  &:hover {
    color: var(--unmute-text-primary);
    border-color: var(--unmute-glass-border-hover);
  }
}

.profile-hero {
  padding: 0.5rem 0 1rem;
}

.avatar-wrapper {
  display: inline-block;
}

.avatar-ring {
  padding: 3px;
  border-radius: 50%;
  background: var(--unmute-primary-gradient);

  :deep(.u-avatar),
  :deep(img),
  :deep(div) {
    border-radius: 50% !important;
    border: 3px solid var(--unmute-surface);
  }
}

.avatar-camera-badge {
  position: absolute;
  bottom: 0.25rem;
  right: 0.25rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--unmute-text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform var(--unmute-transition-fast);

  &:hover {
    transform: scale(1.08);
  }
}

.hero-name {
  font-family: var(--unmute-font-display);
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
}

.verified-badge {
  color: #3b82f6;
  font-size: 1.15rem;
}

.hero-sub {
  font-size: 0.875rem;
  color: var(--unmute-text-muted);
}

.hero-sub-action {
  font-size: 0.8125rem;
  color: var(--unmute-primary);
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
}

/* Cards */
.profile-strength-card,
.profile-stats-card,
.edit-profile-card {
  background: var(--unmute-surface);
  border: 1px solid var(--unmute-glass-border);
  border-radius: var(--unmute-radius-lg);
  box-shadow: 0 4px 14px -4px rgba(70, 25, 55, 0.06);
}

/* Profile Strength */
.strength-icon-box {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--unmute-radius-sm);
  background: #fdf2f8;
  color: var(--unmute-primary);
  font-size: 1.25rem;
}

.strength-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--unmute-text-secondary);
}

.strength-percent {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.strength-bar-bg {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #f3e8ee;
  overflow: hidden;
}

.strength-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--unmute-primary-gradient);
  transition: width 0.4s ease;
}

/* Stats Card */
.stat-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.stat-num {
  font-family: var(--unmute-font-display);
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
  line-height: 1.1;
}

.stat-txt {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--unmute-text-muted);
}

.stat-separator {
  width: 1px;
  height: 2rem;
  background: var(--unmute-glass-border);
}

/* Edit Profile Card */
.edit-profile-card {
  transition: background var(--unmute-transition-fast), border-color var(--unmute-transition-fast);
  cursor: pointer;

  &:hover {
    background: var(--unmute-surface-raised);
    border-color: var(--unmute-glass-border-hover);
  }
}

.edit-icon-box {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--unmute-radius-sm);
  background: #fdf2f8;
  color: var(--unmute-primary);
  font-size: 1.25rem;
}

.edit-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.edit-subtitle {
  font-size: 0.8125rem;
  color: var(--unmute-text-muted);
}

.chevron-icon {
  font-size: 1.25rem;
  color: var(--unmute-text-muted);
}
</style>
