<template>
  <UCard
    variant="depth3d"
    padding="none"
    class="w-100 max-w-md mx-auto position-relative user-select-none overflow-hidden discover-card-3d"
  >
    <!-- Top photo / image area with subtle layered depth -->
    <div class="position-relative w-100 overflow-hidden card-photo-hero">
      <img
        v-if="candidate.avatarUrl"
        :src="candidate.avatarUrl"
        :alt="candidate.displayName"
        class="w-100 h-100 object-fit-cover card-photo-img"
      />
      <div v-else class="w-100 h-100 d-flex flex-column align-items-center justify-content-center surface-raised text-muted">
        <i class="ri-user-3-line photo-placeholder-icon"></i>
        <span class="small mt-2 fw-medium">No photo uploaded</span>
      </div>

      <!-- Cinematic depth gradient overlay -->
      <div class="position-absolute top-0 start-0 end-0 bottom-0 card-photo-overlay pointer-events-none"></div>

      <!-- Quick action safety button (Report / Block) -->
      <button
        type="button"
        @click="$emit('openSafety')"
        class="btn-safety-trigger position-absolute top-0 end-0 m-3 p-2 rounded-circle border-0 d-flex align-items-center justify-content-center"
        title="Report or Block"
      >
        <i class="ri-more-2-fill safety-icon-sm"></i>
      </button>

      <!-- Candidate Basic Info Overlay -->
      <div class="position-absolute bottom-0 start-0 end-0 p-4">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <h2 class="fs-3 fw-bold text-white mb-0 text-shadow font-editorial" style="letter-spacing: -0.015em;">
            {{ candidate.displayName }}, {{ candidate.age }}
          </h2>
          <UBadge v-if="candidate.isVerified" variant="gold" size="sm">
            <i class="ri-shield-check-fill icon-xs me-1"></i>
            <span>Verified</span>
          </UBadge>
        </div>

        <div v-if="candidate.approximateLocation" class="d-flex align-items-center gap-1 small text-white-50 mt-1 fw-medium">
          <i class="ri-map-pin-2-fill icon-xs text-warning"></i>
          <span>{{ candidate.approximateLocation }}</span>
        </div>
      </div>
    </div>

    <!-- Details Body -->
    <div class="p-4 d-flex flex-column gap-3 card-details-body">
      <!-- Voice Intro Audio Prompt Card (Unmute Core Experience) -->
      <div class="voice-prompt-card p-3 rounded-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-3">
          <button
            type="button"
            @click="toggleAudioPreview"
            class="voice-play-btn rounded-circle d-flex align-items-center justify-content-center border-0 shadow-sm"
            :class="{ 'playing': isPlayingAudio }"
            title="Listen to voice intro"
          >
            <i :class="isPlayingAudio ? 'ri-pause-fill' : 'ri-play-fill'" class="fs-5"></i>
          </button>
          <div>
            <span class="extra-small text-uppercase fw-bold tracking-wider d-block voice-prompt-label">
              Voice Intro
            </span>
            <span class="small fw-semibold" style="color: var(--unmute-text-primary);">
              {{ isPlayingAudio ? 'Playing preview...' : 'Listen to my voice (0:18)' }}
            </span>
          </div>
        </div>

        <!-- Animated Soundwave visualizer -->
        <div class="soundwave-bars d-flex align-items-center gap-1" :class="{ 'animating': isPlayingAudio }">
          <span class="sw-bar" style="height: 12px;"></span>
          <span class="sw-bar" style="height: 20px;"></span>
          <span class="sw-bar" style="height: 16px;"></span>
          <span class="sw-bar" style="height: 24px;"></span>
          <span class="sw-bar" style="height: 14px;"></span>
          <span class="sw-bar" style="height: 18px;"></span>
        </div>
      </div>

      <!-- Common Interests Banner (Conversation First!) -->
      <div
        v-if="candidate.commonInterestsCount > 0"
        class="common-interests-banner d-flex align-items-center gap-2 p-3 rounded-3"
      >
        <i class="ri-sparkling-fill icon-sm text-warning flex-shrink-0 animate-pulse-glow"></i>
        <span class="small fw-medium">
          Common interests: <strong class="fw-bold" style="color: var(--unmute-text-primary);">{{ candidate.commonInterests.join(', ') }}</strong>
        </span>
      </div>

      <!-- Bio / Story -->
      <div v-if="candidate.bio" class="candidate-bio-box p-3 rounded-3 small">
        <p class="mb-0 lh-base" style="white-space: pre-line; color: var(--unmute-text-secondary);">{{ candidate.bio }}</p>
      </div>

      <!-- Connection Intentions / Interaction Preferences -->
      <div v-if="candidate.interactionPreferences && candidate.interactionPreferences.length > 0">
        <span class="extra-small fw-bold text-uppercase tracking-wider d-block mb-1" style="color: var(--unmute-text-muted);">
          Looking for
        </span>
        <div class="d-flex flex-wrap gap-1">
          <UBadge
            v-for="pref in candidate.interactionPreferences"
            :key="pref"
            variant="glass"
            size="sm"
          >
            {{ pref }}
          </UBadge>
        </div>
      </div>

      <!-- All Interests tags -->
      <div v-if="candidate.interests && candidate.interests.length > 0">
        <span class="extra-small fw-bold text-uppercase tracking-wider d-block mb-1" style="color: var(--unmute-text-muted);">
          Interests & Topics
        </span>
        <div class="d-flex flex-wrap gap-1">
          <UBadge
            v-for="interest in candidate.interests"
            :key="interest.id"
            :variant="candidate.commonInterests.includes(interest.name) ? 'gold' : 'secondary'"
            size="sm"
          >
            {{ interest.name }}
          </UBadge>
        </div>
      </div>

      <!-- Action Buttons (Pass & Like) with tactile luxury depth -->
      <div class="d-flex align-items-center gap-3 pt-2">
        <!-- Pass Button -->
        <UButton
          variant="secondary"
          size="lg"
          class="flex-fill luxury-btn-pass"
          @click="$emit('pass')"
        >
          <i class="ri-close-line icon-sm me-2"></i>
          <span>Pass</span>
        </UButton>

        <!-- Connect / Like Button -->
        <UButton
          variant="primary"
          size="lg"
          class="flex-fill luxury-btn-connect"
          @click="$emit('like')"
        >
          <i class="ri-heart-3-fill icon-sm me-2 text-warning"></i>
          <span>Connect</span>
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UCard from './ui/UCard.vue';
import UButton from './ui/UButton.vue';
import UBadge from './ui/UBadge.vue';
import { DiscoveryCandidate } from '../types';

defineProps<{
  candidate: DiscoveryCandidate;
}>();

defineEmits<{
  (e: 'like'): void;
  (e: 'pass'): void;
  (e: 'openSafety'): void;
}>();

const isPlayingAudio = ref(false);

function toggleAudioPreview() {
  isPlayingAudio.value = !isPlayingAudio.value;
}
</script>

<style scoped lang="scss">
.card-photo-hero {
  height: 23rem;
  background-color: var(--unmute-surface-raised, #faf9f6);
}

.card-photo-img {
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  .discover-card-3d:hover & {
    transform: scale(1.03);
  }
}

.card-photo-overlay {
  background: linear-gradient(to top, rgba(10, 10, 10, 0.88) 0%, rgba(10, 10, 10, 0.35) 45%, transparent 100%);
}

.photo-placeholder-icon {
  font-size: 3.5rem;
  line-height: 1;
}

.btn-safety-trigger {
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #ffffff;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.4);
    color: #ffffff;
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.92);
  }
}

.safety-icon-sm {
  font-size: 1.125rem;
  line-height: 1;
}

.icon-xs {
  font-size: 0.875rem;
  line-height: 1;
}

.icon-sm {
  font-size: 1.125rem;
  line-height: 1;
}

.extra-small {
  font-size: 0.6875rem;
}

.text-shadow {
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
}

.card-details-body {
  background-color: var(--unmute-surface, #ffffff);
}

.voice-prompt-card {
  background: var(--unmute-gold-surface, rgba(197, 168, 128, 0.1));
  border: 1px solid var(--unmute-gold-border, rgba(197, 168, 128, 0.3));
  transition: all 0.25s ease;

  &:hover {
    border-color: var(--unmute-gold, #c5a880);
    box-shadow: var(--unmute-gold-glow);
  }
}

.voice-play-btn {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--unmute-obsidian-gradient, linear-gradient(135deg, #1a1817, #0a0a0a));
  color: var(--unmute-gold, #c5a880);
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

.voice-prompt-label {
  color: #8b6e43;
  letter-spacing: 0.08em;
}

.soundwave-bars {
  .sw-bar {
    width: 3px;
    background-color: var(--unmute-gold, #c5a880);
    border-radius: 9999px;
    opacity: 0.6;
    transition: height 0.2s ease;
  }

  &.animating .sw-bar {
    animation: soundwaveBounce 0.8s ease-in-out infinite alternate;
    opacity: 1;

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
    &:nth-child(4) { animation-delay: 0.45s; }
    &:nth-child(5) { animation-delay: 0.2s; }
    &:nth-child(6) { animation-delay: 0.35s; }
  }
}

@keyframes soundwaveBounce {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1.3); }
}

.common-interests-banner {
  background: var(--unmute-surface-raised, #faf9f6);
  border: 1px solid var(--unmute-gold-border, rgba(197, 168, 128, 0.25));
  color: #8b6e43;
}

.candidate-bio-box {
  background-color: var(--unmute-surface-raised, #faf9f6);
  border: 1px solid var(--unmute-glass-border, rgba(10, 10, 10, 0.06));
}

.luxury-btn-connect {
  box-shadow: 0 4px 14px rgba(26, 24, 23, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
</style>
