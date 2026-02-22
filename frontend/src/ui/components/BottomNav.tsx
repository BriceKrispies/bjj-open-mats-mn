import type { JSX } from 'solid-js';
import { For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import type { NavItem } from '../../core/router';
import { getIcon } from '../icons';
import { Badge } from './Badge';

interface BottomNavProps {
  items: readonly NavItem[];
}

export function BottomNav(props: BottomNavProps): JSX.Element {
  return (
    <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
      <For each={props.items}>
        {(item) => {
          const IconComp = getIcon(item.icon);

          return (
            <A
              href={item.path}
              class="bottom-nav__item"
              activeClass="active"
              end={item.path === '/'}
              aria-label={item.label}
            >
              <span class="bottom-nav__icon">
                <IconComp size={22} />
                <Show when={item.badge && (item.badge() ?? 0) > 0}>
                  <Badge
                    variant="error"
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-6px',
                      'font-size': '9px',
                      height: '14px',
                      'min-width': '14px',
                      padding: '0 3px',
                    }}
                  >
                    {item.badge!()}
                  </Badge>
                </Show>
              </span>
              <span class="bottom-nav__label">{item.label}</span>
            </A>
          );
        }}
      </For>
    </nav>
  );
}
