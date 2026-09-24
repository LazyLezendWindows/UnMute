import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shells for Android and iOS around the same Vue build (`dist`); one codebase for web,
 * PWA and both apps. Build the web bundle with an absolute VITE_API_URL (the apps run from a local
 * origin), and configure the backend with NATIVE_APP_ORIGINS=https://localhost,capacitor://localhost
 * so the apps receive a session token (kept in Keychain/Keystore) instead of relying on the
 * cross-site cookie that iOS WebViews block. See README → "PWA & Native Apps".
 */
const config: CapacitorConfig = {
  appId: 'app.unmute.social',
  appName: 'Unmute',
  webDir: 'dist',
  server: {
    // Android serves the app from https://localhost so it is a secure context (geolocation, crypto).
    androidScheme: 'https',
  },
  plugins: {
    SocialLogin: {
      // Only Google is used; disabled providers are not bundled into the apps.
      providers: { google: true, facebook: false, apple: false, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;
