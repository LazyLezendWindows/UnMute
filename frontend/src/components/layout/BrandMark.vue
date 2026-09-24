<template>
  <!-- Unmute mark: a heart carrying a voice (sound bars); optionally with the wordmark. -->
  <span class="brand" :class="{ 'has-wordmark': wordmark, 'is-stacked': stacked }" :style="{ '--mark-size': size }">
    <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient :id="gradientId" x1="6" y1="8" x2="58" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ff5c93" />
          <stop offset="0.5" stop-color="#e3175c" />
          <stop offset="1" stop-color="#7d1b8a" />
        </linearGradient>
      </defs>
      <path
        :fill="`url(#${gradientId})`"
        d="M32 57.5C29.6 57.5 6 43 4.4 26.6 3.2 14.6 10.3 6.5 19.4 6.5c5.4 0 9.8 2.9 12.6 7.3 2.8-4.4 7.2-7.3 12.6-7.3 9.1 0 16.2 8.1 15 20.1C58 43 34.4 57.5 32 57.5Z"
      />
      <g fill="#fff">
        <rect x="30.2" y="23" width="4.6" height="13" rx="2.3" />
        <rect x="38.2" y="17.5" width="4.6" height="24" rx="2.3" />
        <rect x="46.2" y="22" width="4.6" height="15" rx="2.3" />
      </g>
    </svg>
    <span v-if="wordmark" class="brand-wordmark"><span class="brand-un">Un</span><span class="brand-mute">mute</span></span>
    <span v-else-if="label" class="visually-hidden">Unmute</span>
  </span>
</template>

<script setup lang="ts">
import { useId } from 'vue';

withDefaults(defineProps<{ size?: string; wordmark?: boolean; label?: boolean; stacked?: boolean }>(), {
  size: '2.5rem',
  wordmark: false,
  label: false,
  stacked: false,
});

// Each instance needs its own gradient id (several logos can be on screen at once).
const gradientId = `brand-${useId()}`;
</script>

<style scoped lang="scss">
.brand {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--mark-size) * 0.18);
  line-height: 1;
}

.brand.is-stacked {
  flex-direction: column;
  gap: calc(var(--mark-size) * 0.04);

  .brand-wordmark {
    font-size: calc(var(--mark-size) * 0.62);
  }
}

.brand-mark {
  width: var(--mark-size);
  height: var(--mark-size);
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(227, 23, 92, 0.25));
}

.brand-wordmark {
  font-family: var(--unmute-font-display);
  font-weight: 800;
  font-size: calc(var(--mark-size) * 0.72);
  letter-spacing: -0.04em;
}

.brand-un {
  color: var(--unmute-brand-ink);
}

.brand-mute {
  background: var(--unmute-brand-accent);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
