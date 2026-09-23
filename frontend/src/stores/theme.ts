import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'holo' | 'aurora' | 'synthwave' | 'ember' | 'matrix' | 'sapphire';

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
  /** Bright tone used for accent text/icons on dark surfaces. */
  preview: string;
}

const glow = (rgb: string) => `0 0 0 1px rgba(${rgb}, 0.35), 0 10px 34px -6px rgba(${rgb}, 0.65)`;

export const DEFAULT_ACCENT: AccentColor = 'holo';

export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  holo: {
    id: 'holo',
    name: 'Holo',
    subtitle: 'Cyan, violet & magenta spectrum',
    primary: '#6a4dff',
    light: '#a594ff',
    dark: '#5b3dff',
    bevel: '#3a1fc2',
    gradient: 'linear-gradient(120deg, #00e5ff 0%, #7c5cff 52%, #ff3dc8 100%)',
    glow: glow('124, 92, 255'),
    surface: 'rgba(124, 92, 255, 0.16)',
    preview: '#7ff0ff',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    subtitle: 'Ice cyan & electric azure',
    primary: '#0891b2',
    light: '#67e8f9',
    dark: '#0e7490',
    bevel: '#155e75',
    gradient: 'linear-gradient(120deg, #00f2fe 0%, #22d3ee 45%, #4f6bff 100%)',
    glow: glow('0, 229, 255'),
    surface: 'rgba(0, 229, 255, 0.14)',
    preview: '#67f3ff',
  },
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave',
    subtitle: 'Hyper pink & ultraviolet',
    primary: '#c026d3',
    light: '#f0abfc',
    dark: '#a21caf',
    bevel: '#701a75',
    gradient: 'linear-gradient(120deg, #ff3dc8 0%, #b026ff 55%, #5b3dff 100%)',
    glow: glow('255, 61, 200'),
    surface: 'rgba(255, 61, 200, 0.14)',
    preview: '#ff8ae2',
  },
  ember: {
    id: 'ember',
    name: 'Solar',
    subtitle: 'Plasma coral & flare orange',
    primary: '#e11d48',
    light: '#fb7185',
    dark: '#be123c',
    bevel: '#881337',
    gradient: 'linear-gradient(120deg, #ff416c 0%, #ff6a3d 55%, #ffc53d 100%)',
    glow: glow('255, 90, 90'),
    surface: 'rgba(255, 90, 90, 0.14)',
    preview: '#ff9a8a',
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    subtitle: 'Acid mint & emerald code',
    primary: '#059669',
    light: '#6ee7b7',
    dark: '#047857',
    bevel: '#065f46',
    gradient: 'linear-gradient(120deg, #00f5a0 0%, #00d9f5 100%)',
    glow: glow('0, 245, 160'),
    surface: 'rgba(0, 245, 160, 0.14)',
    preview: '#5dfdc4',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire',
    subtitle: 'Cobalt core & crystal blue',
    primary: '#2563eb',
    light: '#93c5fd',
    dark: '#1d4ed8',
    bevel: '#1e3a8a',
    gradient: 'linear-gradient(120deg, #2563eb 0%, #38bdf8 60%, #a5f3fc 100%)',
    glow: glow('56, 140, 255'),
    surface: 'rgba(56, 140, 255, 0.16)',
    preview: '#8fd0ff',
  },
};

export const useThemeStore = defineStore('theme', () => {
  // The app is dark-first; accents from the retired design fall back to the default.
  const savedMode = (localStorage.getItem('unmute_theme_mode') as ThemeMode) || 'dark';
  const rawAccent = localStorage.getItem('unmute_theme_accent') as AccentColor;
  const initialAccent: AccentColor = rawAccent && ACCENT_PRESETS[rawAccent] ? rawAccent : DEFAULT_ACCENT;

  const mode = ref<ThemeMode>(savedMode);
  const accent = ref<AccentColor>(initialAccent);

  const activePreset = computed(() => ACCENT_PRESETS[accent.value] || ACCENT_PRESETS[DEFAULT_ACCENT]);

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
    // Accent as text/icon colour: the bright tone on dark surfaces, the deep tone on light ones.
    root.style.setProperty('--unmute-accent-text', isDarkMode.value ? preset.preview : preset.primary);

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
