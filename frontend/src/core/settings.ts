import { createSignal } from 'solid-js';
import { storage } from './storage/adapter';

const THEME_KEY = 'bjj_theme';

type Theme = 'light' | 'dark';

function readStoredTheme(): Theme {
  return storage.getItem<Theme>(THEME_KEY) ?? 'dark';
}

function applyTheme(t: Theme): void {
  document.documentElement.setAttribute('data-theme', t);
}

const [theme, setThemeSignal] = createSignal<Theme>(readStoredTheme());
// Apply immediately on module load so the page never flickers.
applyTheme(theme());

export const settingsService = {
  /** Reactive accessor — use inside SolidJS reactive roots. */
  getTheme: theme,

  setTheme(t: Theme): void {
    setThemeSignal(t);
    storage.setItem(THEME_KEY, t);
    applyTheme(t);
  },
};
