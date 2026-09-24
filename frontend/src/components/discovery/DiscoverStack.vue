<template>
  <div
    class="stack-stage"
    tabindex="0"
    role="group"
    :aria-label="`${top.displayName}, ${top.age}. Right arrow to connect, left arrow to pass, up and down arrows for photos.`"
    @keydown.right.prevent="fling('right')"
    @keydown.left.prevent="fling('left')"
    @keydown.up.prevent="photoIndex = Math.max(0, photoIndex - 1)"
    @keydown.down.prevent="photoIndex = Math.min(topPhotos.length - 1, photoIndex + 1)"
  >
    <!-- Cards waiting behind, receding in depth -->
    <div
      v-for="(person, depth) in behind"
      :key="person.id"
      class="stack-card stack-card-behind"
      :style="{ '--depth': depth + 1 }"
      aria-hidden="true"
    >
      <div class="card-photo" :style="photoStyle(photosOf(person)[0])">
        <span v-if="!photosOf(person).length" class="photo-initial">{{ person.displayName.charAt(0) }}</span>
      </div>
    </div>

    <!-- The live card -->
    <article
      :key="top.id"
      ref="card"
      class="stack-card stack-card-top discover-card-3d"
      :class="{ 'is-dragging': dragging, 'is-flying': flying }"
      :style="topStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="card-photo" :style="photoStyle(topPhotos[photoIndex])">
        <span v-if="!topPhotos.length" class="photo-initial">{{ top.displayName.charAt(0) }}</span>
      </div>
      <div class="card-shade" aria-hidden="true"></div>

      <!-- Which photo is showing (tap the left / right side of the card to page) -->
      <div v-if="topPhotos.length > 1" class="photo-bars" aria-hidden="true">
        <span v-for="(_, i) in topPhotos" :key="i" :class="{ 'is-current': i === photoIndex }"></span>
      </div>
      <div v-if="topPhotos.length > 1" class="visually-hidden" aria-live="polite">
        Photo {{ photoIndex + 1 }} of {{ topPhotos.length }}
      </div>

      <div class="card-chips">
        <span class="card-chip">
          <i class="ri-heart-3-fill chip-heart" aria-hidden="true"></i>
          {{ matchPercentage }}% match
        </span>
        <span v-if="top.distanceKm !== null" class="card-chip">
          <i class="ri-map-pin-2-fill text-muted" aria-hidden="true"></i>
          {{ top.distanceKm }} km
        </span>
      </div>

      <!-- Swipe verdict stamps -->
      <span class="verdict verdict-like" :style="{ opacity: likeOpacity }" aria-hidden="true">
        <i class="ri-heart-3-fill"></i> Connect
      </span>
      <span class="verdict verdict-pass" :style="{ opacity: passOpacity }" aria-hidden="true">
        <i class="ri-close-line"></i> Pass
      </span>

      <button
        type="button"
        class="card-more"
        aria-label="Report or block"
        title="Report or block"
        @pointerdown.stop
        @click="$emit('openSafety')"
      >
        <i class="ri-more-2-fill" aria-hidden="true"></i>
      </button>

      <div class="card-caption">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <h2 class="caption-name mb-0">{{ top.displayName }}, {{ top.age }}</h2>
          <span v-if="top.isVerified" class="caption-verified" title="Verified">
            <i class="ri-verified-badge-fill" aria-hidden="true"></i>
            <span class="visually-hidden">Verified</span>
          </span>
        </div>
        <p v-if="top.approximateLocation" class="caption-line mb-0">
          <i class="ri-map-pin-2-line" aria-hidden="true"></i>
          <span class="text-truncate">{{ top.approximateLocation }}</span>
        </p>
        <p v-if="top.profession" class="caption-line mb-0">
          <i class="ri-briefcase-4-line" aria-hidden="true"></i>
          <span class="text-truncate">{{ top.profession }}</span>
        </p>
        <p v-else-if="educationLine" class="caption-line mb-0">
          <i class="ri-graduation-cap-line" aria-hidden="true"></i>
          <span class="text-truncate">{{ educationLine }}</span>
        </p>
        <div v-if="top.interests.length" class="caption-interests">
          <span v-for="interest in top.interests.slice(0, 3)" :key="interest.id" class="caption-interest">{{ interest.name }}</span>
          <span v-if="top.interests.length > 3" class="caption-interest">+{{ top.interests.length - 3 }}</span>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DiscoveryCandidate } from '../../types';

const props = defineProps<{
  top: DiscoveryCandidate;
  behind: DiscoveryCandidate[];
}>();

const emit = defineEmits<{
  (e: 'like'): void;
  (e: 'pass'): void;
  (e: 'openSafety'): void;
}>();

const matchPercentage = computed(() => {
  if (props.top.commonInterestsCount >= 3) return 92;
  if (props.top.commonInterestsCount === 2) return 90;
  if (props.top.commonInterestsCount === 1) return 86;
  return 82;
});

const SWIPE_THRESHOLD = 110;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const card = ref<HTMLElement | null>(null);
const dx = ref(0);
const dy = ref(0);
const dragging = ref(false);
const flying = ref(false);
let startX = 0;
let startY = 0;
let pointerId: number | null = null;

const topStyle = computed(() => ({
  transform: `translate3d(${dx.value}px, ${dy.value * 0.35}px, 0) rotate(${dx.value * 0.06}deg)`,
}));
const likeOpacity = computed(() => Math.max(0, Math.min(1, dx.value / SWIPE_THRESHOLD)));
const passOpacity = computed(() => Math.max(0, Math.min(1, -dx.value / SWIPE_THRESHOLD)));

/** Main photo first; members without an upload may still have a Google photo. */
function photosOf(person: DiscoveryCandidate): string[] {
  return person.photos?.length ? person.photos : person.avatarUrl ? [person.avatarUrl] : [];
}
const topPhotos = computed(() => photosOf(props.top));
const photoIndex = ref(0);
watch(
  () => props.top.id,
  () => {
    photoIndex.value = 0;
  }
);

/** A tap (not a drag) on the left / right third of the card shows the previous / next photo. */
function pagePhoto(clientX: number) {
  const rect = card.value?.getBoundingClientRect();
  if (!rect || topPhotos.value.length < 2) return;
  const x = (clientX - rect.left) / rect.width;
  if (x < 0.33) photoIndex.value = Math.max(0, photoIndex.value - 1);
  else if (x > 0.67) photoIndex.value = Math.min(topPhotos.value.length - 1, photoIndex.value + 1);
}

const educationLine = computed(() => {
  const edu = props.top.education;
  return edu ? [edu.institutionShortName || edu.institutionName, edu.course].filter(Boolean).join(' · ') : '';
});

function photoStyle(url: string | undefined) {
  return url ? { backgroundImage: `url("${url.replace(/"/g, '%22')}")` } : {};
}

function onPointerDown(e: PointerEvent) {
  if (flying.value || e.button !== 0) return;
  pointerId = e.pointerId;
  card.value?.setPointerCapture(e.pointerId);
  startX = e.clientX;
  startY = e.clientY;
  dragging.value = true;
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return;
  dx.value = e.clientX - startX;
  dy.value = e.clientY - startY;
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return;
  dragging.value = false;
  pointerId = null;
  if (dx.value > SWIPE_THRESHOLD) fling('right');
  else if (dx.value < -SWIPE_THRESHOLD) fling('left');
  else {
    if (Math.abs(dx.value) < 6 && Math.abs(dy.value) < 6) pagePhoto(e.clientX);
    dx.value = 0;
    dy.value = 0;
  }
}

/** Throws the card off-screen, then reports the decision. Also used by the action buttons. */
function fling(direction: 'left' | 'right') {
  if (flying.value) return;
  // Report first: the store advances synchronously, so the next card replaces this one before the
  // reset below could flash it back into the centre.
  if ('vibrate' in navigator) navigator.vibrate(direction === 'right' ? [8, 40, 12] : 8);
  const done = () => {
    if (direction === 'right') emit('like');
    else emit('pass');
    flying.value = false;
    dx.value = 0;
    dy.value = 0;
  };
  if (reduceMotion) return done();
  flying.value = true;
  dx.value = (direction === 'right' ? 1 : -1) * (window.innerWidth * 0.9 + 200);
  dy.value = dy.value || -40;
  setTimeout(done, 320);
}

defineExpose({ fling });
</script>

<style scoped lang="scss">
.stack-stage {
  position: relative;
  // Sized from the viewport height so the action buttons always stay on screen.
  height: clamp(20rem, calc(100svh - 17rem - var(--unmute-safe-top) - var(--unmute-safe-bottom)), 40rem);
  // As wide as the screen allows, up to a 3:4 portrait card.
  width: min(100%, 30rem);
  margin: 0 auto;
  outline: none;
  touch-action: pan-y;

  @media (min-width: 768px) {
    height: clamp(22rem, calc(100svh - 14rem), 38rem);
  }

  &:focus-visible .stack-card-top {
    box-shadow: 0 0 0 3px var(--unmute-accent-text), var(--unmute-shadow-lg);
  }
}

.stack-card {
  position: absolute;
  inset: 0;
  border-radius: var(--unmute-radius-xl);
  overflow: hidden;
  background: var(--unmute-surface-overlay);
  box-shadow: var(--unmute-shadow-lg);
  user-select: none;
}

// Waiting cards peek out below the current one.
.stack-card-behind {
  transform: translateY(calc(var(--depth) * 10px)) scale(calc(1 - var(--depth) * 0.04));
  opacity: calc(1 - var(--depth) * 0.3);
  z-index: calc(10 - var(--depth));
  transition: transform var(--unmute-transition-normal);
}

.stack-card-top {
  z-index: 20;
  cursor: grab;
  transition: transform 380ms cubic-bezier(0.2, 0.9, 0.25, 1.05);

  &.is-dragging {
    cursor: grabbing;
    transition: none;
  }

  &.is-flying {
    transition: transform 300ms cubic-bezier(0.5, 0, 0.75, 0);
  }
}

.card-photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-color: var(--unmute-surface-active);
  background-image: linear-gradient(150deg, #ff8fb5 0%, #e3175c 55%, #8e1d8c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-initial {
  font-family: var(--unmute-font-display);
  font-weight: 800;
  font-size: 7rem;
  color: rgba(255, 255, 255, 0.9);
}

.card-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(20, 8, 20, 0.85) 0%, rgba(20, 8, 20, 0.35) 38%, transparent 62%),
    linear-gradient(to bottom, rgba(20, 8, 20, 0.28) 0%, transparent 22%);
  pointer-events: none;
}

.photo-bars {
  position: absolute;
  top: 0.6rem;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 3;
  display: flex;
  gap: 0.3rem;
  pointer-events: none;

  span {
    flex: 1;
    height: 3px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.4);

    &.is-current {
      background: #fff;
    }
  }
}

.card-chips {
  position: absolute;
  top: 1.25rem;
  left: 0.9rem;
  right: 3.75rem;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  pointer-events: none;
}

.card-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.7rem;
  border-radius: var(--unmute-radius-pill);
  background: rgba(255, 255, 255, 0.95);
  color: #1d1b3a;
  font-size: 0.8125rem;
  font-weight: 700;
  box-shadow: 0 4px 12px -6px rgba(0, 0, 0, 0.35);

  &:last-child:not(:first-child) {
    margin-left: auto;
  }
}

.chip-heart {
  color: #e3175c;
}

.verdict {
  position: absolute;
  top: 4rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 1rem;
  border-radius: var(--unmute-radius-pill);
  font-weight: 800;
  font-size: 1rem;
  color: #fff;
  pointer-events: none;
}

.verdict-like {
  left: 1.25rem;
  background: #e3175c;
  transform: rotate(-8deg);
}

.verdict-pass {
  right: 1.25rem;
  background: #46445f;
  transform: rotate(8deg);
}

.card-more {
  position: absolute;
  top: 1.1rem;
  right: 0.8rem;
  z-index: 4;
  width: 2.4rem;
  height: 2.4rem;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgba(20, 8, 20, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
}

.card-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: 1.25rem 1.25rem 2.75rem;
  color: #fff;
  pointer-events: none;
}

.caption-name {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.caption-verified {
  color: #4c8dff;
  background: #fff;
  border-radius: 50%;
  width: 1.35rem;
  height: 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.caption-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  min-width: 0;
}

.caption-interests {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.caption-interest {
  padding: 0.3rem 0.75rem;
  border-radius: var(--unmute-radius-pill);
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.8125rem;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .stack-card-top,
  .stack-card-behind {
    transition: none;
  }
}
</style>
