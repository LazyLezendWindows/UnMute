<template>
  <!-- Decorative 3D backdrop. The gradient behind it is the fallback when WebGL is unavailable. -->
  <div class="spatial-scene position-fixed top-0 start-0 w-100 h-100 pe-none" aria-hidden="true">
    <div class="scene-fallback"></div>
    <canvas v-if="enabled" ref="canvas" class="scene-canvas" :class="{ 'is-ready': ready }"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useThemeStore } from '../../stores/theme';
import type { SceneMode, SpatialSceneHandle } from '../../scene/spatialScene';

const props = withDefaults(defineProps<{ mode?: SceneMode }>(), { mode: 'ambient' });

const themeStore = useThemeStore();
const canvas = ref<HTMLCanvasElement | null>(null);
const ready = ref(false);

// Skip WebGL on devices that ask to save data or have very few cores, and under browser automation
// (headless browsers render WebGL in software, which only slows tests down); the gradient remains.
const lowPower =
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true ||
  (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2) ||
  navigator.webdriver === true;
const enabled = ref(!lowPower);

let handle: SpatialSceneHandle | null = null;
let disposed = false;

onMounted(async () => {
  if (!enabled.value) return;
  // Three.js lives in its own chunk so first paint never waits for it.
  const { createSpatialScene, webglAvailable } = await import('../../scene/spatialScene');
  if (disposed || !canvas.value) return;
  if (!webglAvailable()) {
    enabled.value = false;
    return;
  }
  try {
    handle = createSpatialScene(canvas.value, {
      mode: props.mode,
      dark: themeStore.isDarkMode,
      accent: themeStore.activePreset.primary,
      still: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    requestAnimationFrame(() => (ready.value = true));
  } catch (err) {
    console.warn('[Scene] 3D backdrop unavailable:', (err as Error).message);
    enabled.value = false;
  }
});

watch(
  () => themeStore.isDarkMode,
  (dark) => handle?.setDark(dark)
);

watch(
  () => themeStore.activePreset.primary,
  (accent) => handle?.setAccent(accent)
);

onBeforeUnmount(() => {
  disposed = true;
  handle?.dispose();
  handle = null;
});
</script>

<style scoped>
.spatial-scene {
  z-index: 0;
}

.scene-fallback {
  position: absolute;
  inset: 0;
  background: var(--unmute-scene-fallback);
}

.scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 900ms ease;
}

.scene-canvas.is-ready {
  opacity: 1;
}
</style>
