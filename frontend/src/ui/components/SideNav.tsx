import type { JSX } from 'solid-js';
import { For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import type { NavItem } from '../../core/router';
import { getIcon, MatIcon } from '../icons';
import { Badge } from './Badge';

interface SideNavProps {
  items: readonly NavItem[];
}

export function SideNav(props: SideNavProps): JSX.Element {
  return (
    <nav class="side-nav" role="navigation" aria-label="Main navigation">
      <div class="side-nav__brand">
        <MatIcon size={22} style={{ color: 'var(--color-accent)' }} />
        <span>BJJ Open Mats</span>
      </div>

      <For each={props.items}>
        {(item) => {
          const IconComp = getIcon(item.icon);

          return (
            <A
              href={item.path}
              class="side-nav__item"
              activeClass="active"
              end={item.path === '/'}
              aria-label={item.label}
            >
              <span class="side-nav__icon">
                <IconComp size={20} />
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
              <span class="side-nav__label">{item.label}</span>
            </A>
          );
        }}
      </For>
    </nav>
  );
}
