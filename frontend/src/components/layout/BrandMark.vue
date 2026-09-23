<template>
  <!-- Chrome sphere logo mark: polished metal ball with the voiceprint glyph -->
  <span class="brand-mark" :style="{ '--mark-size': size }" aria-hidden="true">
    <i class="ri-voiceprint-fill"></i>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: string }>(), { size: '2.5rem' });
</script>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mark-size);
  height: var(--mark-size);
  border-radius: 50%;
  color: #1a2236;
  font-size: calc(var(--mark-size) * 0.46);
  background: radial-gradient(circle at 32% 26%, #ffffff 0%, rgba(255, 255, 255, 0) 30%),
    radial-gradient(circle at 70% 80%, rgba(123, 140, 255, 0.55) 0%, transparent 55%),
    linear-gradient(145deg, #f4f6fb 0%, #c7cfdf 40%, #8792ad 70%, #e8ecf5 100%);
  box-shadow: inset -3px -4px 8px rgba(20, 30, 60, 0.35), inset 2px 2px 5px rgba(255, 255, 255, 0.9),
    0 8px 18px -6px rgba(20, 30, 60, 0.45);
}
</style>
