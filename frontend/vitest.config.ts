import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// Unit tests only; the PWA plugin and dev proxy from vite.config.ts are not needed here.
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
  },
});
