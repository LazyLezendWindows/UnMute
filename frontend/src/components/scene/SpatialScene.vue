<template>
  <!-- Decorative 3D backdrop. The gradient behind it is the fallback when WebGL is off or unavailable. -->
  <div class="spatial-scene position-fixed top-0 start-0 w-100 h-100 pe-none" aria-hidden="true">
    <div class="scene-fallback"></div>
    <canvas v-if="enabled" ref="canvas" class="scene-canvas" :class="{ 'is-ready': ready }"></canvas>
    <!-- Static film grain: a fine tactile texture, drawn once. -->
    <div class="scene-grain"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useThemeStore } from '../../stores/theme';
import type { SceneMode, SceneMotion, SpatialSceneHandle } from '../../scene/spatialScene';

const props = withDefaults(defineProps<{ mode?: SceneMode }>(), { mode: 'ambient' });

const themeStore = useThemeStore();
const canvas = ref<HTMLCanvasElement | null>(null);
const ready = ref(false);

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
// Headless/automated browsers render WebGL in software; it only slows them down.
const constrainedDevice =
  navigator.webdriver === true || (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2);

const lowBattery = ref(false);
const prefersReducedMotion = ref(reducedMotion.matches);

/** WebGL at all? `off`, and devices where even a still frame is not worth it, get the gradient. */
const enabled = computed(() => themeStore.motion !== 'off' && !constrainedDevice);

/** Animate while interacting, or hold one still frame. */
const motion = computed<SceneMotion>(() => {
  if (themeStore.motion === 'calm') return 'still';
  if (themeStore.motion === 'full') return prefersReducedMotion.value ? 'still' : 'animate';
  // auto
  return prefersReducedMotion.value || saveData || lowBattery.value ? 'still' : 'animate';
});

let handle: SpatialSceneHandle | null = null;
let disposed = false;
let battery: BatteryLike | null = null;

const updateBattery = () => {
  if (battery) lowBattery.value = !battery.charging && battery.level <= 0.2;
};
const onReducedMotion = (e: MediaQueryListEvent) => (prefersReducedMotion.value = e.matches);

async function mountScene() {
  if (handle || disposed || !canvas.value) return;
  // Three.js lives in its own chunk so first paint never waits for it.
  const { createSpatialScene, webglAvailable } = await import('../../scene/spatialScene');
  if (disposed || !canvas.value || handle) return;
  if (!webglAvailable()) return;
  try {
    handle = createSpatialScene(canvas.value, {
      mode: props.mode,
      dark: themeStore.isDarkMode,
      accent: themeStore.activePreset.primary,
      motion: motion.value,
    });
    requestAnimationFrame(() => (ready.value = true));
  } catch (err) {
    console.warn('[Scene] 3D backdrop unavailable:', (err as Error).message);
  }
}

function unmountScene() {
  handle?.dispose();
  handle = null;
  ready.value = false;
}

onMounted(async () => {
  reducedMotion.addEventListener('change', onReducedMotion);
  // Battery Status API (Chromium): hold still when the battery is low and not charging.
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryLike> }).getBattery;
  if (getBattery) {
    try {
      battery = await getBattery.call(navigator);
      updateBattery();
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
    } catch {
      battery = null;
    }
  }
  if (enabled.value) mountScene();
});

// The canvas appears/disappears with `enabled`; mount or tear down the scene to match.
watch(enabled, (on) => {
  if (on) requestAnimationFrame(() => mountScene());
  else unmountScene();
});
watch(motion, (value) => handle?.setMotion(value));
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
  reducedMotion.removeEventListener('change', onReducedMotion);
  battery?.removeEventListener('levelchange', updateBattery);
  battery?.removeEventListener('chargingchange', updateBattery);
  unmountScene();
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

.scene-grain {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
</style>
