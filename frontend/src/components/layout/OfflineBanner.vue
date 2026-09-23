<template>
  <div v-if="!online" class="offline-banner position-fixed start-0 end-0 top-0 text-center small fw-semibold py-2 px-3" role="status">
    <i class="ri-wifi-off-line me-1" aria-hidden="true"></i>
    You're offline. Messages and new people will load when you reconnect.
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const update = () => (online.value = navigator.onLine);

onMounted(() => {
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', update);
  window.removeEventListener('offline', update);
});
</script>

<style scoped>
.offline-banner {
  z-index: 1090;
  background-color: var(--unmute-surface-overlay);
  color: var(--unmute-text-primary);
  border-bottom: 1px solid var(--unmute-glass-border);
}
</style>
