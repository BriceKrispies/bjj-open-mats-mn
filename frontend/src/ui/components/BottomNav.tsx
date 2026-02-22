import type { JSX } from 'solid-js';
import { For, Show } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import type { NavItem } from '../../core/router';
import { getIcon } from '../icons';
import { Badge } from './Badge';

interface BottomNavProps {
  items: readonly NavItem[];
}

export function BottomNav(props: BottomNavProps): JSX.Element {
  const location = useLocation();

  return (
    <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
      <For each={props.items}>
        {(item) => {
          const IconComp = getIcon(item.icon);
          const isActive = () =>
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <A
              href={item.path}
              class={`bottom-nav__item${isActive() ? ' active' : ''}`}
              activeClass=""
              aria-label={item.label}
              aria-current={isActive() ? 'page' : undefined}
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
