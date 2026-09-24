import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import './styles/unmute.scss';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize theme from user preference
import { useThemeStore } from './stores/theme';
const themeStore = useThemeStore();
themeStore.initTheme();

app.mount('#app');


// Offline app shell for the web/PWA only; Capacitor apps load their bundled files directly.
import { Capacitor } from '@capacitor/core';
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
