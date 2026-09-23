import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ThemeMode = 'dark' | 'light' | 'system';
/**
 * How much the 3D backdrop may move. `auto` animates only while the person is interacting and
 * holds still on low battery, data saver or reduced motion; `calm` is always a still frame;
 * `off` skips WebGL entirely.
 */
export type MotionPreference = 'auto' | 'full' | 'calm' | 'off';
const MOTION_PREFERENCES: MotionPreference[] = ['auto', 'full', 'calm', 'off'];
export type AccentColor = 'iris' | 'aqua' | 'rose' | 'mint' | 'amber' | 'graphite';

export interface AccentPreset {
  id: AccentColor;
  name: string;
  subtitle: string;
  primary: string;
  light: string;
  dark: string;
  bevel: string;
  gradient: string;
  glow: string;
  surface: string;
  /** Lighter tone used for accent text/icons on dark glass. */
  preview: string;
}

const glow = (rgb: string) => `0 12px 30px -12px rgba(${rgb}, 0.7)`;

export const DEFAULT_ACCENT: AccentColor = 'iris';

export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  iris: {
    id: 'iris',
    name: 'Iris',
    subtitle: 'Soft periwinkle light',
    primary: '#4f5bff',
    light: '#8d97ff',
    dark: '#3a44e0',
    bevel: '#2c34b8',
    gradient: 'linear-gradient(135deg, #7b8cff 0%, #4f5bff 55%, #8b5cf6 100%)',
    glow: glow('79, 91, 255'),
    surface: 'rgba(79, 91, 255, 0.12)',
    preview: '#a3acff',
  },
  aqua: {
    id: 'aqua',
    name: 'Aqua',
    subtitle: 'Glacier cyan',
    primary: '#0891b2',
    light: '#67e8f9',
    dark: '#0e7490',
    bevel: '#155e75',
    gradient: 'linear-gradient(135deg, #5ee7f5 0%, #0ea5c6 55%, #3b82f6 100%)',
    glow: glow('14, 165, 198'),
    surface: 'rgba(14, 165, 198, 0.12)',
    preview: '#7ce9f7',
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    subtitle: 'Pearl pink',
    primary: '#e0457b',
    light: '#f9a8c9',
    dark: '#be2d63',
    bevel: '#9d174d',
    gradient: 'linear-gradient(135deg, #ffa3c4 0%, #e0457b 55%, #a855f7 100%)',
    glow: glow('224, 69, 123'),
    surface: 'rgba(224, 69, 123, 0.12)',
    preview: '#ffa9c8',
  },
  mint: {
    id: 'mint',
    name: 'Mint',
    subtitle: 'Fresh jade',
    primary: '#0f9f75',
    light: '#6ee7b7',
    dark: '#047857',
    bevel: '#065f46',
    gradient: 'linear-gradient(135deg, #7af0c3 0%, #10b981 55%, #0ea5a4 100%)',
    glow: glow('16, 185, 129'),
    surface: 'rgba(16, 185, 129, 0.12)',
    preview: '#7cf0c7',
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    subtitle: 'Warm sunlight',
    primary: '#d97706',
    light: '#fcd34d',
    dark: '#b45309',
    bevel: '#92400e',
    gradient: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #f97316 100%)',
    glow: glow('245, 158, 11'),
    surface: 'rgba(245, 158, 11, 0.13)',
    preview: '#fcd668',
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    subtitle: 'Monochrome chrome',
    primary: '#2a3246',
    light: '#8e9ab4',
    dark: '#0c1222',
    bevel: '#05080f',
    gradient: 'linear-gradient(135deg, #5b6680 0%, #2a3246 55%, #0c1222 100%)',
    glow: glow('20, 30, 60'),
    surface: 'rgba(42, 50, 70, 0.1)',
    preview: '#d7deeb',
  },
};

export const useThemeStore = defineStore('theme', () => {
  // Bright liquid glass is the default; accents from retired designs fall back to Iris.
  const savedMode = (localStorage.getItem('unmute_theme_mode') as ThemeMode) || 'light';
  const rawAccent = localStorage.getItem('unmute_theme_accent') as AccentColor;
  const initialAccent: AccentColor = rawAccent && ACCENT_PRESETS[rawAccent] ? rawAccent : DEFAULT_ACCENT;

  const mode = ref<ThemeMode>(savedMode);
  const savedMotion = localStorage.getItem('unmute_motion') as MotionPreference;
  const motion = ref<MotionPreference>(MOTION_PREFERENCES.includes(savedMotion) ? savedMotion : 'auto');

  function setMotion(value: MotionPreference) {
    motion.value = value;
    try {
      localStorage.setItem('unmute_motion', value);
    } catch {
      // Not persisting is fine; the choice still applies for this visit.
    }
  }
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
    motion,
    setMotion,
    isDarkMode,
    activePreset,
    presets: ACCENT_PRESETS,
    setMode,
    toggleMode,
    setAccent,
    initTheme,
  };
});
