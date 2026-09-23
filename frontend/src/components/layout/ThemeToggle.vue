<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="themeStore.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="themeStore.isDarkMode ? 'Light mode' : 'Dark mode'"
    @click="themeStore.toggleMode()"
  >
    <i :class="themeStore.isDarkMode ? 'ri-sun-line' : 'ri-moon-clear-line'" aria-hidden="true"></i>
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '../../stores/theme';

const themeStore = useThemeStore();
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 50%;
  color: var(--unmute-text-secondary);
  font-size: 1.1rem;
  background: var(--unmute-glass-surface);
  box-shadow: var(--unmute-glass-edge);
  transition: transform var(--unmute-transition-fast), color var(--unmute-transition-fast);
}

.theme-toggle:hover {
  color: var(--unmute-text-primary);
  transform: rotate(-15deg);
}
</style>
