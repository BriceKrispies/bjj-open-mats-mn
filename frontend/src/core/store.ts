/**
 * src/core/store.ts
 *
 * Central application store — the single dispatch choke-point for all
 * app-wide actions.
 *
 * - Every dispatched action is appended to an in-memory, bounded session log.
 * - Internally delegates to the EventBus so existing reactive patterns work.
 * - The EventBus is NOT exported from this file; modules must use the store.
 */

import { createSignal } from 'solid-js';
import type { AppEventMap } from './events';
import { eventBus } from './events';

/** The canonical typed action map (mirrors AppEventMap). */
export type AppActionMap = AppEventMap;

export interface LogEntry {
  /** Monotonically increasing sequence number, resets each session. */
  seq: number;
  /** ISO-8601 timestamp at dispatch time. */
  ts: string;
  /** Action type key (e.g. "rsvp/created"). */
  type: string;
  /** Raw payload — may be undefined for actions like data/reset. */
  payload: unknown;
  /** Optional tag identifying the originating source. */
  source?: string;
}

const MAX_LOG = 1000;
let _seq = 0;

const [_log, _setLog] = createSignal<readonly LogEntry[]>([]);

export const appStore = {
  /**
   * Dispatch an action: appends a LogEntry and emits on the internal bus.
   * This is the ONLY way to broadcast app-wide state changes.
   */
  dispatch<K extends keyof AppActionMap>(
    type: K,
    payload: AppActionMap[K],
    meta?: { source?: string },
  ): void {
    const entry: LogEntry = {
      seq: ++_seq,
      ts: new Date().toISOString(),
      type: type as string,
      payload,
      source: meta?.source,
    };
    _setLog((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_LOG ? next.slice(-MAX_LOG) : next;
    });
    eventBus.emit(type, payload);
  },

  /** Subscribe to a specific action type. */
  on<K extends keyof AppActionMap>(
    type: K,
    handler: (payload: AppActionMap[K]) => void,
  ): void {
    eventBus.on(type, handler);
  },

  /** Unsubscribe from a specific action type. */
  off<K extends keyof AppActionMap>(
    type: K,
    handler: (payload: AppActionMap[K]) => void,
  ): void {
    eventBus.off(type, handler);
  },

  /**
   * Reactive signal accessor for the session log.
   * Call inside a SolidJS reactive root for live updates.
   */
  log: _log,

  /** Wipe the in-memory session log (does not affect persisted data). */
  clearLog(): void {
    _setLog([]);
  },
};
