import type { OpenMat } from './storage/openMats.repo';
import type { Rsvp } from './storage/rsvps.repo';
import type { Message } from './storage/messages.repo';

// ─────────────────────────────────────────────────────────────────────────────
// Typed event map — add new event types here as the app grows.
// ─────────────────────────────────────────────────────────────────────────────
export interface AppEventMap {
  /** Fired after the mock data seed runs. */
  'openmat/seeded': { count: number };

  /** Fired when the user RSVPs to an open mat. */
  'rsvp/created': { rsvp: Rsvp; openMat: OpenMat };

  /** Fired when the user removes their RSVP. */
  'rsvp/removed': { rsvpId: string; openMatId: string };

  /** Fired when a new message is added to the inbox. */
  'message/created': { message: Message };

  /** Fired when a message is opened/read. */
  'message/read': { messageId: string };

  /** Fired when the user changes the color theme. */
  'settings/themeChanged': { theme: 'light' | 'dark' };

  /** Fired after a full data reset. */
  'data/reset': undefined;
}

type Handler<T> = (payload: T) => void;

// ─────────────────────────────────────────────────────────────────────────────
// EventBus implementation
// ─────────────────────────────────────────────────────────────────────────────
class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly listeners = new Map<string, Set<Handler<any>>>();

  emit<K extends keyof AppEventMap>(type: K, payload: AppEventMap[K]): void {
    const handlers = this.listeners.get(type as string);
    if (handlers) {
      // Iterate over a snapshot so handlers that call `off` mid-loop are safe.
      [...handlers].forEach((h) => h(payload));
    }
  }

  on<K extends keyof AppEventMap>(type: K, handler: Handler<AppEventMap[K]>): void {
    if (!this.listeners.has(type as string)) {
      this.listeners.set(type as string, new Set());
    }
    this.listeners.get(type as string)!.add(handler);
  }

  off<K extends keyof AppEventMap>(type: K, handler: Handler<AppEventMap[K]>): void {
    this.listeners.get(type as string)?.delete(handler);
  }
}

export const eventBus = new EventBus();
