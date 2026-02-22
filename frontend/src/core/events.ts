// ── Typed Event Bus ──

import type { OpenMat, Rsvp } from './state';
import { appendLog, compactPreview } from './eventLog';

/** All app action/event types and their payloads */
export interface AppActionMap {
  'openmat/seeded': { count: number };
  'rsvp/toggled': { rsvp: Rsvp; openMat: OpenMat };
  'rsvp/removed': { openMatId: string };
  'settings/themeChanged': { theme: 'light' | 'dark' };
  'data/reset': undefined;
}

export type AppActionType = keyof AppActionMap;

export interface AppAction<T extends AppActionType = AppActionType> {
  type: T;
  payload: AppActionMap[T];
}

type Listener<T extends AppActionType> = (payload: AppActionMap[T]) => void;

export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on<T extends AppActionType>(type: T, fn: Listener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  off<T extends AppActionType>(type: T, fn: Listener<T>): void {
    this.listeners.get(type)?.delete(fn);
  }

  emit<T extends AppActionType>(type: T, payload: AppActionMap[T]): void {
    // Log every emit to the session event log
    appendLog({ kind: 'event', type: String(type), preview: compactPreview(payload) });
    this.listeners.get(type)?.forEach(fn => (fn as Listener<T>)(payload));
  }
}

/** Singleton event bus */
export const eventBus = new EventBus();
