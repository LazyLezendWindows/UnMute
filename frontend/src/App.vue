<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from './layouts/AppLayout.vue';

const route = useRoute();

const layout = computed(() => {
  return route.meta.requiresAuth ? AppLayout : 'div';
});
</script>

