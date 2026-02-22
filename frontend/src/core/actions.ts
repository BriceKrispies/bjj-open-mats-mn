// ── Action Creators ──

import type { AppAction, AppActionMap, AppActionType } from './events';

export function createAction<T extends AppActionType>(
  type: T,
  payload: AppActionMap[T]
): AppAction<T> {
  return { type, payload };
}
