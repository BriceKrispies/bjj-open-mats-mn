// ── RSVP Repository Helpers ──

import type { Rsvp } from '../state';
import { store } from '../store';
import { createAction } from '../actions';

/** Get RSVP for a given open mat, or null */
export function getRsvp(openMatId: string): Rsvp | null {
  return store.getState().rsvps.find(r => r.openMatId === openMatId) ?? null;
}

/** Toggle RSVP: if currently 'going', remove; otherwise set 'going' */
export function toggleRsvp(openMatId: string): void {
  const existing = getRsvp(openMatId);
  const mat = store.getState().openMats.find(m => m.id === openMatId);
  if (!mat) return;

  if (existing?.status === 'going') {
    // Remove RSVP
    store.dispatch(createAction('rsvp/removed', { openMatId }));
  } else {
    // Set going
    const rsvp: Rsvp = {
      openMatId,
      status: 'going',
      updatedAtISO: new Date().toISOString(),
    };
    store.dispatch(createAction('rsvp/toggled', { rsvp, openMat: mat }));
  }
}
