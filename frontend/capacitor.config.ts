import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shells for Android and iOS around the same Vue build (`dist`).
 * Build with an absolute VITE_API_URL, and configure the backend with
 * SESSION_COOKIE_SAMESITE=none and CORS_ORIGIN including https://localhost,capacitor://localhost.
 */
const config: CapacitorConfig = {
  appId: 'app.unmute.social',
  appName: 'Unmute',
  webDir: 'dist',
  server: {
    // Android serves the app from https://localhost so Secure cookies and geolocation work.
    androidScheme: 'https',
  },
};

export default config;
