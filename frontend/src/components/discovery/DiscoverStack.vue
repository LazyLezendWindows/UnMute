<template>
  <div
    class="stack-stage"
    tabindex="0"
    role="group"
    :aria-label="`${top.displayName}, ${top.age}. Press right arrow to connect, left arrow to pass.`"
    @keydown.right.prevent="fling('right')"
    @keydown.left.prevent="fling('left')"
  >
    <!-- Cards waiting behind, receding in depth -->
    <div
      v-for="(person, depth) in behind"
      :key="person.id"
      class="stack-card stack-card-behind"
      :style="{ '--depth': depth + 1 }"
      aria-hidden="true"
    >
      <div class="card-photo" :style="photoStyle(person)">
        <span v-if="!person.avatarUrl" class="photo-initial">{{ person.displayName.charAt(0) }}</span>
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
      <div class="card-photo" :style="photoStyle(top)">
        <span v-if="!top.avatarUrl" class="photo-initial">{{ top.displayName.charAt(0) }}</span>
      </div>
      <div class="card-shade" aria-hidden="true"></div>

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
        <p v-if="areaLine" class="caption-line mb-0">
          <i class="ri-map-pin-2-fill" aria-hidden="true"></i>
          <span>{{ areaLine }}</span>
        </p>
        <p v-if="educationLine" class="caption-line mb-0">
          <i class="ri-graduation-cap-fill" aria-hidden="true"></i>
          <span class="text-truncate">{{ educationLine }}</span>
        </p>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { DiscoveryCandidate } from '../../types';
import { formatDistance } from '../../services/directory';

const props = defineProps<{
  top: DiscoveryCandidate;
  behind: DiscoveryCandidate[];
}>();

const emit = defineEmits<{
  (e: 'like'): void;
  (e: 'pass'): void;
  (e: 'openSafety'): void;
}>();

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

const areaLine = computed(() =>
  [props.top.approximateLocation, formatDistance(props.top.distanceKm)].filter(Boolean).join(' · ')
);
const educationLine = computed(() => {
  const edu = props.top.education;
  return edu ? [edu.institutionShortName || edu.institutionName, edu.course].filter(Boolean).join(' · ') : '';
});

function photoStyle(person: DiscoveryCandidate) {
  return person.avatarUrl ? { backgroundImage: `url("${person.avatarUrl.replace(/"/g, '%22')}")` } : {};
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
  height: clamp(18rem, calc(100svh - 28rem), 36rem);

  @media (min-width: 768px) {
    height: clamp(20rem, calc(100svh - 22rem), 36rem);
  }
  aspect-ratio: 3 / 4;
  max-width: 100%;
  margin: 0 auto;
  perspective: 1400px;
  outline: none;
  touch-action: pan-y;

  &:focus-visible .stack-card-top {
    box-shadow: 0 0 0 3px var(--unmute-accent-text), var(--unmute-shadow-3d);
  }
}

.stack-card {
  position: absolute;
  inset: 0;
  border-radius: var(--unmute-radius-xl);
  overflow: hidden;
  background: var(--unmute-surface-overlay);
  box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-3d);
  user-select: none;
}

// Waiting cards sit further back and lower, like a deck seen in perspective.
.stack-card-behind {
  transform: translate3d(0, calc(var(--depth) * 18px), calc(var(--depth) * -70px)) scale(calc(1 - var(--depth) * 0.05));
  filter: saturate(0.8) brightness(calc(1 - var(--depth) * 0.08));
  z-index: calc(10 - var(--depth));
  transition: transform var(--unmute-transition-bounce), filter var(--unmute-transition-normal);
}

.stack-card-top {
  z-index: 20;
  cursor: grab;
  transition: transform 420ms cubic-bezier(0.2, 0.9, 0.25, 1.1);

  &.is-dragging {
    cursor: grabbing;
    transition: none;
  }

  &.is-flying {
    transition: transform 320ms cubic-bezier(0.5, 0, 0.75, 0);
  }
}

.card-photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-color: var(--unmute-surface-active);
  background-image: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.7), transparent 45%),
    linear-gradient(150deg, #c9d3ea 0%, #8f9bbb 60%, #6c7797 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-initial {
  font-family: var(--unmute-font-display);
  font-weight: 800;
  font-size: 7rem;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 6px 30px rgba(20, 30, 60, 0.35);
}

.card-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(8, 11, 20, 0.82) 0%, rgba(8, 11, 20, 0.2) 45%, transparent 70%);
  pointer-events: none;
}

.verdict {
  position: absolute;
  top: 1.5rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 1rem;
  border-radius: var(--unmute-radius-pill);
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.02em;
  color: #fff;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: none;
}

.verdict-like {
  left: 1.25rem;
  background: rgba(16, 185, 129, 0.75);
  transform: rotate(-8deg);
}

.verdict-pass {
  right: 1.25rem;
  background: rgba(224, 36, 94, 0.75);
  transform: rotate(8deg);
}

.card-more {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 4;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.25);
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
  padding: 1.5rem 1.5rem 1.4rem;
  color: #fff;
  pointer-events: none;
}

.caption-name {
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.45);
}

.caption-verified {
  color: #8fb3ff;
  font-size: 1.3rem;
  filter: drop-shadow(0 0 6px rgba(143, 179, 255, 0.7));
}

.caption-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.3rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  min-width: 0;
}
</style>
