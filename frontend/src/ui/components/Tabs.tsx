import type { JSX } from 'solid-js';
import { For } from 'solid-js';

export interface TabDef {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs(props: TabsProps): JSX.Element {
  return (
    <nav class="tabs" role="tablist">
      <For each={props.tabs}>
        {(tab) => (
          <button
            role="tab"
            class={`tab-item${props.active === tab.id ? ' active' : ''}`}
            aria-selected={props.active === tab.id}
            onClick={() => props.onChange(tab.id)}
          >
            {tab.label}
          </button>
        )}
      </For>
    </nav>
  );
}
