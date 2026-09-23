<template>
  <!-- Decorative 3D emblem: a lit sphere inside two orbiting rings (pure CSS 3D). -->
  <div class="holo-orb" :style="{ '--orb-size': size }" aria-hidden="true">
    <div class="orb-stage">
      <span class="orb-ring ring-a"></span>
      <span class="orb-ring ring-b"></span>
      <span class="orb-core">
        <i class="ri-voiceprint-fill"></i>
      </span>
    </div>
    <span class="orb-shadow"></span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: string }>(), { size: '6rem' });
</script>

<style scoped lang="scss">
.holo-orb {
  position: relative;
  width: var(--orb-size);
  height: calc(var(--orb-size) * 1.2);
  margin: 0 auto;
}

.orb-stage {
  position: absolute;
  inset: 0 0 auto 0;
  height: var(--orb-size);
  animation: orb-bob 7s ease-in-out infinite;
}

.orb-core {
  position: absolute;
  inset: 16%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: calc(var(--orb-size) * 0.3);
  background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 22%),
    radial-gradient(circle at 70% 75%, #ff3dc8 0%, transparent 55%),
    radial-gradient(circle at 30% 70%, #00e5ff 0%, transparent 55%), #5b3dff;
  box-shadow: inset -8px -10px 24px rgba(10, 0, 60, 0.65), inset 6px 6px 18px rgba(255, 255, 255, 0.25),
    0 0 40px rgba(124, 92, 255, 0.65), 0 0 90px rgba(0, 229, 255, 0.25);

  i {
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  }
}

.orb-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  // Plain coloured border arcs: reliable everywhere, unlike masked gradients on 3D-transformed layers.
  border: 2px solid transparent;
  border-top-color: #00e5ff;
  border-right-color: #7c5cff;
  border-bottom-color: #ff3dc8;
  filter: drop-shadow(0 0 6px rgba(124, 92, 255, 0.8));
  opacity: 0.9;
}

/* Flat ellipses (2D) read as tilted orbits; true 3D layers inside a blurred glass panel
   leave a visible compositing rectangle in Chromium. */
.ring-a {
  inset: 4% -14%;
  transform: rotate(-18deg) scaleY(0.3);
  animation: ring-spin-a 9s linear infinite;
}

.ring-b {
  inset: -6% 2%;
  transform: rotate(62deg) scaleY(0.26);
  animation: ring-spin-b 13s linear infinite;
  opacity: 0.6;
}

.orb-shadow {
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 0;
  height: 10%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(124, 92, 255, 0.55), transparent 70%);
  filter: blur(4px);
}

@keyframes ring-spin-a {
  from { transform: rotate(-18deg) scaleY(0.3) rotate(0deg); }
  to { transform: rotate(-18deg) scaleY(0.3) rotate(360deg); }
}

@keyframes ring-spin-b {
  from { transform: rotate(62deg) scaleY(0.26) rotate(0deg); }
  to { transform: rotate(62deg) scaleY(0.26) rotate(-360deg); }
}

@keyframes orb-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
