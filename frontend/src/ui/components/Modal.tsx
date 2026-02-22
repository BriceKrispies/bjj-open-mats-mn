import type { JSX, ParentProps } from 'solid-js';
import { Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { CloseIcon } from '../icons';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  footer?: JSX.Element;
}

export function Modal(props: ParentProps<ModalProps>): JSX.Element {
  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={props.title}
        >
          <div class="modal">
            <div class="modal__header">
              <h2 class="modal__title">{props.title}</h2>
              <IconButton label="Close" onClick={props.onClose}>
                <CloseIcon size={18} />
              </IconButton>
            </div>
            <div class="modal__body">{props.children}</div>
            {props.footer && <div class="modal__footer">{props.footer}</div>}
          </div>
        </div>
      </Portal>
    </Show>
  );
}
