// ── Settings View Model ──

import type { AppState } from '../../core/state';

export interface SettingsView {
  theme: 'light' | 'dark';
  openMatCount: number;
  rsvpCount: number;
}

export function getSettingsView(state: AppState): SettingsView {
  return {
    theme: state.settings.theme,
    openMatCount: state.openMats.length,
    rsvpCount: state.rsvps.length,
  };
}
