import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'violet' | 'rose' | 'cyan' | 'emerald' | 'amber';

export interface AccentPreset {
  id: AccentColor;
  name: string;
  primary: string;
  light: string;
  dark: string;
  gradient: string;
  glow: string;
  surface: string;
  preview: string;
}

export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  violet: {
    id: 'violet',
    name: 'Electric Violet',
    primary: '#7c3aed',
    light: '#9d68f6',
    dark: '#5b21b6',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #ec4899 100%)',
    glow: '0 0 30px -4px rgba(124, 58, 237, 0.45)',
    surface: 'rgba(124, 58, 237, 0.15)',
    preview: '#7c3aed',
  },
  rose: {
    id: 'rose',
    name: 'Sunset Rose',
    primary: '#ec4899',
    light: '#f472b6',
    dark: '#be185d',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%)',
    glow: '0 0 30px -4px rgba(236, 72, 153, 0.45)',
    surface: 'rgba(236, 72, 153, 0.15)',
    preview: '#ec4899',
  },
  cyan: {
    id: 'cyan',
    name: 'Ocean Cyan',
    primary: '#06b6d4',
    light: '#38bdf8',
    dark: '#0e7490',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #3b82f6 100%)',
    glow: '0 0 30px -4px rgba(6, 182, 212, 0.45)',
    surface: 'rgba(6, 182, 212, 0.15)',
    preview: '#06b6d4',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Mint',
    primary: '#10b981',
    light: '#34d399',
    dark: '#047857',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #06b6d4 100%)',
    glow: '0 0 30px -4px rgba(16, 185, 129, 0.45)',
    surface: 'rgba(16, 185, 129, 0.15)',
    preview: '#10b981',
  },
  amber: {
    id: 'amber',
    name: 'Amber Glow',
    primary: '#f59e0b',
    light: '#fbbf24',
    dark: '#b45309',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #ef4444 100%)',
    glow: '0 0 30px -4px rgba(245, 158, 11, 0.45)',
    surface: 'rgba(245, 158, 11, 0.15)',
    preview: '#f59e0b',
  },
};

export const useThemeStore = defineStore('theme', () => {
  const savedMode = (localStorage.getItem('unmute_theme_mode') as ThemeMode) || 'dark';
  const savedAccent = (localStorage.getItem('unmute_theme_accent') as AccentColor) || 'violet';

  const mode = ref<ThemeMode>(savedMode);
  const accent = ref<AccentColor>(savedAccent);

  const activePreset = computed(() => ACCENT_PRESETS[accent.value] || ACCENT_PRESETS.violet);

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
