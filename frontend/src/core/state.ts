// ── App State Types ──

export interface OpenMat {
  id: string;
  gymName: string;
  dateTimeISO: string;
  address?: string;
  notes?: string;
  capacity?: number;
}

export interface Rsvp {
  openMatId: string;
  status: 'going' | 'not_going';
  updatedAtISO: string;
}

export interface Settings {
  theme: 'light' | 'dark';
}

export interface AppState {
  openMats: OpenMat[];
  rsvps: Rsvp[];
  settings: Settings;
}

export function defaultState(): AppState {
  return {
    openMats: [],
    rsvps: [],
    settings: { theme: 'light' },
  };
}
