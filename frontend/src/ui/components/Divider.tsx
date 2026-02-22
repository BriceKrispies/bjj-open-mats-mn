import type { JSX } from 'solid-js';
import { Show } from 'solid-js';

interface DividerProps {
  label?: string;
  class?: string;
}

export function Divider(props: DividerProps): JSX.Element {
  return (
    <Show
      when={props.label}
      fallback={<hr class={`divider${props.class ? ' ' + props.class : ''}`} />}
    >
      <div class={`divider--label${props.class ? ' ' + props.class : ''}`}>
        {props.label}
      </div>
    </Show>
  );
}
