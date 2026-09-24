import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor =
  | 'orchid'
  | 'pink'
  | 'coral'
  | 'blush'
  | 'tangerine'
  | 'magenta'
  | 'violet'
  | 'blue'
  | 'sky'
  | 'green';

export interface AccentPreset {
  id: AccentColor;
  name: string;
  /** The colour shown in the picker. */
  swatch: string;
  /** Buttons, badges and fills; white text on it meets WCAG AA (4.5:1). */
  primary: string;
  light: string;
  dark: string;
  bevel: string;
  gradient: string;
  glow: string;
  surface: string;
  /** Accent text and icons on light backgrounds (AA on the page and card colours). */
  text: string;
  /** Accent text and icons on dark backgrounds (AA in dark mode). */
  preview: string;
}

function preset(
  id: AccentColor,
  name: string,
  colours: { swatch: string; primary: string; end: string; light: string; text: string; preview: string; rgb: string }
): AccentPreset {
  return {
    id,
    name,
    swatch: colours.swatch,
    primary: colours.primary,
    light: colours.light,
    dark: colours.end,
    bevel: colours.end,
    gradient: `linear-gradient(100deg, ${colours.primary} 0%, ${colours.end} 100%)`,
    glow: `0 10px 22px -12px rgba(${colours.rgb}, 0.65)`,
    surface: `rgba(${colours.rgb}, 0.1)`,
    text: colours.text,
    preview: colours.preview,
  };
}

export const DEFAULT_ACCENT: AccentColor = 'pink';

/** In picker order. Light swatches (sky, green, blush…) use a deeper working colour for legibility. */
export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  orchid: preset('orchid', 'Orchid', { swatch: '#d13cdd', primary: '#a21caf', end: '#86198f', light: '#e9a6f0', text: '#9d1fae', preview: '#e9a6f0', rgb: '162, 28, 175' }),
  pink: preset('pink', 'Unmute Pink', { swatch: '#e5195f', primary: '#e3175c', end: '#8e1d8c', light: '#f67aa6', text: '#c0124f', preview: '#ff8fb5', rgb: '227, 23, 92' }),
  coral: preset('coral', 'Coral', { swatch: '#f0506e', primary: '#e11d48', end: '#be123c', light: '#fda4af', text: '#c81e45', preview: '#ff9aa8', rgb: '225, 29, 72' }),
  blush: preset('blush', 'Blush', { swatch: '#f7a1c0', primary: '#c9306c', end: '#9d174d', light: '#f9b8d0', text: '#b8215e', preview: '#f9b8d0', rgb: '201, 48, 108' }),
  tangerine: preset('tangerine', 'Tangerine', { swatch: '#f15a24', primary: '#c2410c', end: '#9a3412', light: '#fdba74', text: '#b13c0b', preview: '#fdba74', rgb: '194, 65, 12' }),
  magenta: preset('magenta', 'Magenta', { swatch: '#d63384', primary: '#be1a6c', end: '#9d174d', light: '#f6a3cb', text: '#a8175f', preview: '#f6a3cb', rgb: '190, 26, 108' }),
  violet: preset('violet', 'Violet', { swatch: '#7c3aed', primary: '#7c3aed', end: '#5b21b6', light: '#c4b5fd', text: '#6d28d9', preview: '#c4b5fd', rgb: '124, 58, 237' }),
  blue: preset('blue', 'Blue', { swatch: '#2563eb', primary: '#2563eb', end: '#1e40af', light: '#93c5fd', text: '#1d4ed8', preview: '#93c5fd', rgb: '37, 99, 235' }),
  sky: preset('sky', 'Sky', { swatch: '#0ea5e9', primary: '#0369a1', end: '#075985', light: '#7dd3fc', text: '#036596', preview: '#7dd3fc', rgb: '3, 105, 161' }),
  green: preset('green', 'Green', { swatch: '#22a55a', primary: '#15803d', end: '#166534', light: '#86efac', text: '#13733a', preview: '#86efac', rgb: '21, 128, 61' }),
};

const MODE_KEY = 'unmute_theme_mode';
const ACCENT_KEY = 'unmute_theme_accent';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not persisting is fine; the choice still applies for this visit.
  }
}

export const useThemeStore = defineStore('theme', () => {
  const savedMode = read(MODE_KEY) as ThemeMode | null;
  const savedAccent = read(ACCENT_KEY) as AccentColor | null;

  const mode = ref<ThemeMode>(savedMode && ['light', 'dark', 'system'].includes(savedMode) ? savedMode : 'light');
  // Accents from earlier designs fall back to the brand pink.
  const accent = ref<AccentColor>(savedAccent && ACCENT_PRESETS[savedAccent] ? savedAccent : DEFAULT_ACCENT);
  const systemPrefersDark = ref(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  const activePreset = computed(() => ACCENT_PRESETS[accent.value]);
  const isDarkMode = computed(() => (mode.value === 'system' ? systemPrefersDark.value : mode.value === 'dark'));

  function applyTheme() {
    const root = document.documentElement;
    root.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light');

    const p = activePreset.value;
    root.style.setProperty('--unmute-primary', p.primary);
    root.style.setProperty('--unmute-primary-light', p.light);
    root.style.setProperty('--unmute-primary-dark', p.dark);
    root.style.setProperty('--unmute-primary-bevel', p.bevel);
    root.style.setProperty('--unmute-primary-gradient', p.gradient);
    root.style.setProperty('--unmute-primary-surface', p.surface);
    root.style.setProperty('--unmute-glow-primary', p.glow);
    root.style.setProperty('--unmute-accent-text', isDarkMode.value ? p.preview : p.text);
    // The browser/OS chrome (Android status bar, installed PWA title bar) follows the page.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDarkMode.value ? '#120e18' : '#fdf6f9');

    write(MODE_KEY, mode.value);
    write(ACCENT_KEY, accent.value);
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    applyTheme();
  }

  function toggleMode() {
    setMode(isDarkMode.value ? 'light' : 'dark');
  }

  function setAccent(newAccent: AccentColor) {
    accent.value = newAccent;
    applyTheme();
  }

  function initTheme() {
    applyTheme();
    // In System mode the app follows the device as it switches between light and dark.
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      systemPrefersDark.value = event.matches;
      if (mode.value === 'system') applyTheme();
    });
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
