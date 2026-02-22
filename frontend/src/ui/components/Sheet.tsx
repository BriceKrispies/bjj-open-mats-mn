import type { JSX, ParentProps } from 'solid-js';
import { Show } from 'solid-js';
import { Portal } from 'solid-js/web';

interface SheetProps {
  open: boolean;
  title?: string;
  onClose: () => void;
}

export function Sheet(props: ParentProps<SheetProps>): JSX.Element {
  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="sheet-overlay"
          onClick={props.onClose}
          aria-hidden="true"
        />
        <div
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={props.title}
        >
          <div class="sheet__handle" />
          {props.title && (
            <div class="sheet__header">
              <h3 class="sheet__title">{props.title}</h3>
            </div>
          )}
          <div class="sheet__body">{props.children}</div>
        </div>
      </Portal>
    </Show>
  );
}
