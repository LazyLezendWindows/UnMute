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
          <h2 class="fs-3 fw-bold text-white mb-0 text-shadow" style="font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.015em;">
            {{ candidate.displayName }}, {{ candidate.age }}
          </h2>
          <UBadge v-if="candidate.isVerified" variant="primary" size="sm">
            <i class="ri-checkbox-circle-fill icon-xs"></i>
            <span>Verified</span>
          </UBadge>
        </div>

        <div v-if="candidate.approximateLocation" class="d-flex align-items-center gap-1 small text-white-50 mt-1 fw-medium">
          <i class="ri-map-pin-2-fill icon-xs text-primary"></i>
          <span>{{ candidate.approximateLocation }}</span>
        </div>
      </div>
    </div>

    <!-- Details Body -->
    <div class="p-4 d-flex flex-column gap-3 card-details-body">
      <!-- Common Interests Banner (Conversation First!) -->
      <div
        v-if="candidate.commonInterestsCount > 0"
        class="common-interests-banner d-flex align-items-center gap-2 p-3 rounded-3"
      >
        <i class="ri-sparkling-fill icon-sm text-primary flex-shrink-0 animate-pulse-glow"></i>
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
            :variant="candidate.commonInterests.includes(interest.name) ? 'primary' : 'secondary'"
            size="sm"
          >
            {{ interest.name }}
          </UBadge>
        </div>
      </div>

      <!-- Action Buttons (Pass & Like) with physical depth -->
      <div class="d-flex align-items-center gap-3 pt-2">
        <!-- Pass Button -->
        <UButton
          variant="secondary"
          size="lg"
          class="flex-fill"
          @click="$emit('pass')"
        >
          <i class="ri-close-line icon-sm me-2"></i>
          <span>Pass</span>
        </UButton>

        <!-- Like Button -->
        <UButton
          variant="primary"
          size="lg"
          class="flex-fill"
          @click="$emit('like')"
        >
          <i class="ri-heart-3-fill icon-sm me-2"></i>
          <span>Connect</span>
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
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
</script>

<style scoped lang="scss">
.card-photo-hero {
  height: 22rem;
  background-color: var(--unmute-surface-raised, #f0f3fa);
}

.card-photo-img {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  .discover-card-3d:hover & {
    transform: scale(1.02);
  }
}

.card-photo-overlay {
  background: linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.3) 50%, transparent 100%);
}

.photo-placeholder-icon {
  font-size: 3.5rem;
  line-height: 1;
}

.btn-safety-trigger {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
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

.common-interests-banner {
  background: var(--unmute-primary-surface, rgba(139, 92, 246, 0.08));
  border: 1px solid var(--unmute-glass-border, rgba(15, 23, 42, 0.08));
  color: var(--unmute-primary, #7c3aed);
}

.candidate-bio-box {
  background-color: var(--unmute-surface-raised, #f8fafd);
  border: 1px solid var(--unmute-glass-border, rgba(15, 23, 42, 0.06));
}
</style>
