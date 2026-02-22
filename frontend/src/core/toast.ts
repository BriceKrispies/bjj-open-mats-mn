import { createSignal } from 'solid-js';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

const [toasts, setToasts] = createSignal<ToastItem[]>([]);

/** Reactive list consumed by <ToastContainer />. */
export { toasts };

export function showToast(message: string, kind: ToastKind = 'info'): void {
  const id = crypto.randomUUID();
  setToasts((prev) => [...prev, { id, message, kind }]);
  setTimeout(() => dismissToast(id), 3500);
}

export function dismissToast(id: string): void {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}
