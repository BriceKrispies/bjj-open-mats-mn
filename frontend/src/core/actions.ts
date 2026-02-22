/**
 * src/core/actions.ts
 *
 * Typed action helpers — the ONLY sanctioned way to mutate app-wide state.
 *
 * Each action:
 *   1. Performs the necessary repository write(s).
 *   2. Dispatches the corresponding action to the store (logged + emitted).
 *
 * Modules must NOT call repository write methods directly for app-wide state.
 * They must call these helpers (via api.store.actions.* or direct import).
 */

import type { OpenMat } from './storage/openMats.repo';
import type { Rsvp } from './storage/rsvps.repo';
import type { Message } from './storage/messages.repo';
import { openMatsRepo } from './storage/openMats.repo';
import { rsvpsRepo } from './storage/rsvps.repo';
import { messagesRepo } from './storage/messages.repo';
import { settingsService } from './settings';
import { generateMockOpenMats } from '../lib/mock-data';
import { uid } from '../lib/utils';
import { appStore } from './store';

export const storeActions = {
  /**
   * Write a list of open mats to the repo and announce the seed event.
   */
  seedOpenMats(mats: OpenMat[]): void {
    for (const m of mats) openMatsRepo.set(m);
    appStore.dispatch('openmat/seeded', { count: mats.length }, { source: 'actions' });
  },

  /**
   * Create (or replace) an RSVP for an open mat.
   *
   * - Silently evicts any existing RSVP for the same mat before writing.
   * - Only dispatches rsvp/created when status is 'going' (matches current
   *   behaviour: 'not_going' is a silent local preference, not a broadcast).
   * - Returns null if the open mat id is not found.
   */
  createRsvp({
    openMatId,
    status,
  }: {
    openMatId: string;
    status: 'going' | 'not_going';
  }): { rsvp: Rsvp; openMat: OpenMat } | null {
    const openMat = openMatsRepo.get(openMatId);
    if (!openMat) return null;

    // Silently replace any prior RSVP for this mat.
    const prev = rsvpsRepo.list().find((r) => r.openMatId === openMatId);
    if (prev) rsvpsRepo.remove(prev.id);

    const rsvp: Rsvp = {
      id: uid(),
      openMatId,
      status,
      createdAt: new Date().toISOString(),
    };
    rsvpsRepo.set(rsvp);

    if (status === 'going') {
      appStore.dispatch('rsvp/created', { rsvp, openMat }, { source: 'actions' });
    }
    return { rsvp, openMat };
  },

  /**
   * Remove an RSVP by id and dispatch rsvp/removed.
   */
  removeRsvp({ rsvpId, openMatId }: { rsvpId: string; openMatId: string }): void {
    rsvpsRepo.remove(rsvpId);
    appStore.dispatch('rsvp/removed', { rsvpId, openMatId }, { source: 'actions' });
  },

  /**
   * Persist a new inbox message and dispatch message/created.
   */
  createMessage(msg: { type: 'system' | 'user'; title: string; body: string }): Message {
    const message: Message = {
      ...msg,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    messagesRepo.set(message);
    appStore.dispatch('message/created', { message }, { source: 'actions' });
    return message;
  },

  /**
   * Mark a message as read and dispatch message/read.
   * No-ops if the message does not exist or is already read.
   */
  markMessageRead({ messageId }: { messageId: string }): void {
    const msg = messagesRepo.get(messageId);
    if (!msg || msg.readAt) return;
    messagesRepo.set({ ...msg, readAt: new Date().toISOString() });
    appStore.dispatch('message/read', { messageId }, { source: 'actions' });
  },

  /**
   * Change the app color theme and dispatch settings/themeChanged.
   */
  setTheme(theme: 'light' | 'dark'): void {
    settingsService.setTheme(theme);
    appStore.dispatch('settings/themeChanged', { theme }, { source: 'actions' });
  },

  /**
   * Clear all persisted data and dispatch data/reset.
   * @param reSeed - When true (default) immediately re-seeds with fresh mock
   *   open mats and dispatches openmat/seeded.
   */
  resetData({ reSeed = true }: { reSeed?: boolean } = {}): void {
    openMatsRepo.clear();
    rsvpsRepo.clear();
    messagesRepo.clear();
    appStore.dispatch('data/reset', undefined, { source: 'actions' });
    if (reSeed) {
      const mats = generateMockOpenMats();
      for (const m of mats) openMatsRepo.set(m);
      appStore.dispatch('openmat/seeded', { count: mats.length }, { source: 'actions' });
    }
  },
};
