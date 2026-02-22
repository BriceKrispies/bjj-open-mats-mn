import type { JSX } from 'solid-js';
import { For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { toasts, dismissToast } from '../../core/toast';
import { CheckIcon, CloseIcon, InfoIcon } from '../icons';

function ToastIcon(props: { kind: string }): JSX.Element {
  switch (props.kind) {
    case 'success': return <CheckIcon size={16} />;
    case 'error':   return <CloseIcon size={16} />;
    default:        return <InfoIcon size={16} />;
  }
}

export function ToastContainer(): JSX.Element {
  return (
    <Portal>
      <div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        <For each={toasts()}>
          {(toast) => (
            <div
              class={`toast toast--${toast.kind}`}
              role="alert"
              onClick={() => dismissToast(toast.id)}
            >
              <ToastIcon kind={toast.kind} />
              <span style={{ flex: 1 }}>{toast.message}</span>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
