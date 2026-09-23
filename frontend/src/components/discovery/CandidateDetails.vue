<template>
  <section class="details glass-pane" :aria-label="`About ${candidate.displayName}`">
    <div v-if="candidate.commonInterestsCount > 0" class="common">
      <span class="common-orb" aria-hidden="true"><i class="ri-sparkling-2-fill"></i></span>
      <div>
        <div class="section-label mb-1">You both like</div>
        <div class="common-names">{{ candidate.commonInterests.join(' · ') }}</div>
      </div>
    </div>

    <div v-if="candidate.bio" class="details-block">
      <div class="section-label">About</div>
      <p class="bio mb-0">{{ candidate.bio }}</p>
    </div>

    <div v-if="candidate.interactionPreferences?.length" class="details-block">
      <div class="section-label">Looking for</div>
      <div class="d-flex flex-wrap gap-2">
        <span v-for="pref in candidate.interactionPreferences" :key="pref" class="pill">{{ pref }}</span>
      </div>
    </div>

    <div v-if="candidate.interests?.length" class="details-block">
      <div class="section-label">Interests</div>
      <div class="d-flex flex-wrap gap-2">
        <span
          v-for="interest in candidate.interests"
          :key="interest.id"
          class="pill"
          :class="{ 'pill-shared': candidate.commonInterests.includes(interest.name) }"
        >
          {{ interest.name }}
        </span>
      </div>
    </div>

    <div v-if="candidate.education" class="details-block">
      <div class="section-label">Education</div>
      <div class="edu">
        <i class="ri-graduation-cap-line" aria-hidden="true"></i>
        <div>
          <div class="fw-semibold">{{ candidate.education.institutionName }}</div>
          <div v-if="candidate.education.course" class="edu-course">{{ candidate.education.course }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DiscoveryCandidate } from '../../types';

defineProps<{ candidate: DiscoveryCandidate }>();
</script>

<style scoped lang="scss">
.details {
  border-radius: var(--unmute-radius-xl);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--unmute-text-muted);
  margin-bottom: 0.5rem;
}

.common {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.9rem 1rem;
  border-radius: var(--unmute-radius-lg);
  background: var(--unmute-primary-surface);
  box-shadow: var(--unmute-glass-edge);
}

.common-orb {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: #fff;
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.common-names {
  font-weight: 700;
  color: var(--unmute-text-primary);
}

.bio {
  color: var(--unmute-text-secondary);
  line-height: 1.6;
  white-space: pre-line;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.8rem;
  border-radius: var(--unmute-radius-pill);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--unmute-text-secondary);
  background: var(--unmute-glass-surface);
  box-shadow: var(--unmute-glass-edge);
}

.pill-shared {
  color: var(--unmute-accent-text);
  background: var(--unmute-primary-surface);
  box-shadow: inset 0 0 0 1px var(--unmute-primary-surface), var(--unmute-glass-edge);
}

.edu {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  color: var(--unmute-text-primary);

  i {
    font-size: 1.2rem;
    color: var(--unmute-accent-text);
  }
}

.edu-course {
  font-size: 0.85rem;
  color: var(--unmute-text-muted);
}
</style>
