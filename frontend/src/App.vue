<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from './layouts/AppLayout.vue';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// If the backend ends the session mid-use (expiry, revocation), leave protected screens immediately.
watch(
  () => authStore.status,
  (status) => {
    if (status === 'UNAUTHENTICATED' && route.meta.requiresAuth) {
      router.replace('/login');
    }
  }
);

const layout = computed(() => {
  return route.meta.requiresAuth ? AppLayout : 'div';
});
</script>

