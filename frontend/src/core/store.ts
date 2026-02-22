// ── Central Store (Redux-ish) ──

import type { AppState, OpenMat, Rsvp } from './state';
import { defaultState } from './state';
import type { AppAction, AppActionType, AppActionMap } from './events';
import { eventBus } from './events';
import { appendLog, compactPreview } from './eventLog';
import { loadKey, saveKey, clearAll } from './persistence';
import { seedOpenMats } from './repositories/openMats';

// ── Reducer ──

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'openmat/seeded': {
      return { ...state, openMats: loadKey<OpenMat[]>('openMats') ?? state.openMats };
    }
    case 'rsvp/toggled': {
      const { rsvp } = action.payload as AppActionMap['rsvp/toggled'];
      const existing = state.rsvps.findIndex(r => r.openMatId === rsvp.openMatId);
      let next: Rsvp[];
      if (existing >= 0) {
        if (state.rsvps[existing]!.status === rsvp.status) {
          next = state.rsvps.filter((_, i) => i !== existing);
        } else {
          next = state.rsvps.map((r, i) => (i === existing ? rsvp : r));
        }
      } else {
        next = [...state.rsvps, rsvp];
      }
      return { ...state, rsvps: next };
    }
    case 'rsvp/removed': {
      const { openMatId } = action.payload as AppActionMap['rsvp/removed'];
      return { ...state, rsvps: state.rsvps.filter(r => r.openMatId !== openMatId) };
    }
    case 'settings/themeChanged': {
      const { theme } = action.payload as AppActionMap['settings/themeChanged'];
      return { ...state, settings: { ...state.settings, theme } };
    }
    case 'data/reset': {
      clearAll();
      const mats = seedOpenMats();
      return { ...defaultState(), openMats: mats };
    }
    default:
      return state;
  }
}

// ── Store Singleton ──

type Subscriber = (state: AppState) => void;

class Store {
  private state: AppState;
  private subs = new Set<Subscriber>();

  constructor() {
    const mats = loadKey<OpenMat[]>('openMats');
    const rsvps = loadKey<Rsvp[]>('rsvps');
    const settings = loadKey<AppState['settings']>('settings');

    if (mats) {
      this.state = {
        openMats: mats,
        rsvps: rsvps ?? [],
        settings: settings ?? defaultState().settings,
      };
    } else {
      // First visit — seed sample data
      const seeded = seedOpenMats();
      this.state = { ...defaultState(), openMats: seeded };
    }

    // Log app boot
    appendLog({ kind: 'system', type: 'app/boot', preview: `page=${location.pathname}` });
  }

  getState(): AppState {
    return this.state;
  }

  dispatch<T extends AppActionType>(action: AppAction<T>): void {
    // Log every dispatched action
    appendLog({
      kind: 'action',
      type: action.type,
      preview: compactPreview(action.payload),
    });

    // Reduce
    this.state = reducer(this.state, action as AppAction);

    // Persist
    saveKey('openMats', this.state.openMats);
    saveKey('rsvps', this.state.rsvps);
    saveKey('settings', this.state.settings);

    // Notify subscribers
    this.subs.forEach(fn => fn(this.state));

    // Emit on event bus (also logged there as kind: 'event')
    eventBus.emit(action.type, action.payload as AppActionMap[typeof action.type]);
  }

  subscribe(fn: Subscriber): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
}

export const store = new Store();
