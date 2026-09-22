import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'cyberpunk' | 'aurora' | 'ember' | 'matrix' | 'luxe' | 'sapphire';

export interface AccentPreset {
  id: AccentColor;
  name: string;
  subtitle: string;
  primary: string;
  light: string;
  dark: string;
  bevel: string; // 3D bottom bevel extrusion color
  gradient: string;
  glow: string;
  surface: string;
  preview: string;
}

export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    subtitle: 'Electric Violet & Hyper Pink',
    primary: '#8b5cf6',
    light: '#c084fc',
    dark: '#6d28d9',
    bevel: '#4c1d95',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #f43f5e 100%)',
    glow: '0 8px 30px -4px rgba(217, 70, 239, 0.55)',
    surface: 'rgba(139, 92, 246, 0.16)',
    preview: '#d946ef',
  },
  aurora: {
    id: 'aurora',
    name: 'Midnight Aurora',
    subtitle: 'Electric Cyan & Azure',
    primary: '#06b6d4',
    light: '#38bdf8',
    dark: '#0891b2',
    bevel: '#0e7490',
    gradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #6366f1 100%)',
    glow: '0 8px 30px -4px rgba(0, 242, 254, 0.55)',
    surface: 'rgba(6, 182, 212, 0.16)',
    preview: '#00f2fe',
  },
  ember: {
    id: 'ember',
    name: 'Solar Flare',
    subtitle: 'Hot Coral & Tangerine',
    primary: '#ff416c',
    light: '#ff6b8b',
    dark: '#e11d48',
    bevel: '#9f1239',
    gradient: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 55%, #f9d423 100%)',
    glow: '0 8px 30px -4px rgba(255, 65, 108, 0.55)',
    surface: 'rgba(255, 65, 108, 0.16)',
    preview: '#ff416c',
  },
  matrix: {
    id: 'matrix',
    name: 'Neon Matrix',
    subtitle: 'Acid Mint & Hyper Emerald',
    primary: '#00f5a0',
    light: '#5eead4',
    dark: '#059669',
    bevel: '#065f46',
    gradient: 'linear-gradient(135deg, #00f5a0 0%, #00d995 50%, #84cc16 100%)',
    glow: '0 8px 30px -4px rgba(0, 245, 160, 0.55)',
    surface: 'rgba(0, 245, 160, 0.16)',
    preview: '#00f5a0',
  },
  luxe: {
    id: 'luxe',
    name: 'Champagne Luxe',
    subtitle: 'Solar Gold & Royal Amber',
    primary: '#f59e0b',
    light: '#fde047',
    dark: '#d97706',
    bevel: '#92400e',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 45%, #ea580c 100%)',
    glow: '0 8px 30px -4px rgba(245, 158, 11, 0.55)',
    surface: 'rgba(245, 158, 11, 0.16)',
    preview: '#fbbf24',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Electric Sapphire',
    subtitle: 'Cobalt Glow & Crystalline Ice',
    primary: '#2563eb',
    light: '#60a5fa',
    dark: '#1d4ed8',
    bevel: '#1e3a8a',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 50%, #93c5fd 100%)',
    glow: '0 8px 30px -4px rgba(37, 99, 235, 0.55)',
    surface: 'rgba(37, 99, 235, 0.16)',
    preview: '#38bdf8',
  },
};

export const useThemeStore = defineStore('theme', () => {
  const savedMode = (localStorage.getItem('unmute_theme_mode') as ThemeMode) || 'light';
  const rawAccent = (localStorage.getItem('unmute_theme_accent') as AccentColor) || 'cyberpunk';
  const initialAccent: AccentColor = ACCENT_PRESETS[rawAccent] ? rawAccent : 'cyberpunk';

  const mode = ref<ThemeMode>(savedMode);
  const accent = ref<AccentColor>(initialAccent);

  const activePreset = computed(() => ACCENT_PRESETS[accent.value] || ACCENT_PRESETS.cyberpunk);

  const isDarkMode = computed(() => {
    if (mode.value === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return mode.value === 'dark';
  });

  function applyTheme() {
    const root = document.documentElement;

    // 1. Set data-theme attribute on <html>
    const effectiveTheme = isDarkMode.value ? 'dark' : 'light';
    root.setAttribute('data-theme', effectiveTheme);

    // 2. Set dynamic accent variables on <html>
    const preset = activePreset.value;
    root.style.setProperty('--unmute-primary', preset.primary);
    root.style.setProperty('--unmute-primary-light', preset.light);
    root.style.setProperty('--unmute-primary-dark', preset.dark);
    root.style.setProperty('--unmute-primary-bevel', preset.bevel);
    root.style.setProperty('--unmute-primary-gradient', preset.gradient);
    root.style.setProperty('--unmute-primary-surface', preset.surface);
    root.style.setProperty('--unmute-glow-primary', preset.glow);

    // 3. Persist
    localStorage.setItem('unmute_theme_mode', mode.value);
    localStorage.setItem('unmute_theme_accent', accent.value);
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    applyTheme();
  }

  function toggleMode() {
    const next = isDarkMode.value ? 'light' : 'dark';
    setMode(next);
  }

  function setAccent(newAccent: AccentColor) {
    accent.value = newAccent;
    applyTheme();
  }

  function initTheme() {
    applyTheme();

    // Listen to OS system preference changes if in system mode
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (mode.value === 'system') {
          applyTheme();
        }
      });
    }
  }

  return {
    mode,
    accent,
    isDarkMode,
    activePreset,
    presets: ACCENT_PRESETS,
    setMode,
    toggleMode,
    setAccent,
    initTheme,
  };
});
