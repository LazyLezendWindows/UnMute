<template>
  <!-- Decorative only: aurora light, star field, and a receding perspective grid floor. -->
  <div class="space-backdrop position-fixed top-0 start-0 w-100 h-100 pe-none" aria-hidden="true">
    <div class="aurora aurora-a"></div>
    <div class="aurora aurora-b"></div>
    <div class="aurora aurora-c"></div>
    <div class="stars"></div>
    <div class="grid-horizon">
      <div class="grid-floor"></div>
    </div>
    <div class="vignette"></div>
  </div>
</template>

<style scoped lang="scss">
.space-backdrop {
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(120% 80% at 50% -10%, var(--unmute-surface-overlay) 0%, var(--unmute-bg) 55%);
}

.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  animation: aurora-drift 26s ease-in-out infinite;
}

.aurora-a {
  width: 55vmax;
  height: 55vmax;
  top: -22vmax;
  left: -12vmax;
  background: radial-gradient(circle, var(--unmute-aurora-a), transparent 65%);
}

.aurora-b {
  width: 50vmax;
  height: 50vmax;
  top: -10vmax;
  right: -18vmax;
  background: radial-gradient(circle, var(--unmute-aurora-b), transparent 65%);
  animation-delay: -9s;
}

.aurora-c {
  width: 45vmax;
  height: 45vmax;
  bottom: -20vmax;
  left: 20vmax;
  background: radial-gradient(circle, var(--unmute-aurora-c), transparent 65%);
  animation-delay: -17s;
}

// Two offset layers of tiny dots read as a star field without any images.
.stars {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(1px 1px at 20px 30px, var(--unmute-star), transparent),
    radial-gradient(1px 1px at 140px 90px, var(--unmute-star), transparent),
    radial-gradient(1.5px 1.5px at 260px 180px, var(--unmute-star), transparent),
    radial-gradient(1px 1px at 330px 40px, var(--unmute-star), transparent),
    radial-gradient(1px 1px at 90px 240px, var(--unmute-star), transparent);
  background-size: 360px 280px;
  opacity: 0.55;
  mask-image: linear-gradient(to bottom, #000 0%, #000 45%, transparent 75%);
}

.grid-horizon {
  position: absolute;
  left: -50%;
  right: -50%;
  bottom: 0;
  height: 48vh;
  perspective: 420px;
  perspective-origin: 50% 0%;
  mask-image: linear-gradient(to top, #000 0%, rgba(0, 0, 0, 0.6) 40%, transparent 100%);
}

.grid-floor {
  position: absolute;
  inset: 0;
  transform-origin: 50% 0%;
  transform: rotateX(62deg);
  background-image: linear-gradient(to bottom, var(--unmute-grid-line) 1px, transparent 1px),
    linear-gradient(to right, var(--unmute-grid-line) 1px, transparent 1px);
  background-size: 64px 64px;
  animation: grid-flow 3.5s linear infinite;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(140% 100% at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.35) 100%);
}

:global([data-theme='light']) .vignette {
  background: none;
}
</style>
