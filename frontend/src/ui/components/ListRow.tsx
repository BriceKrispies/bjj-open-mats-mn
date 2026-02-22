import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';
import { ChevronRightIcon } from '../icons';

interface ListRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  leading?: JSX.Element;
  trailing?: JSX.Element;
  leadingAccent?: boolean;
  unread?: boolean;
  chevron?: boolean;
  onClick?: () => void;
}

export function ListRow(allProps: ParentProps<ListRowProps>): JSX.Element {
  const [local, rest] = splitProps(allProps, [
    'title',
    'subtitle',
    'leading',
    'trailing',
    'leadingAccent',
    'unread',
    'chevron',
    'onClick',
    'class',
  ]);

  return (
    <div
      class={clsx('list-row', local.class)}
      onClick={local.onClick}
      role={local.onClick ? 'button' : undefined}
      tabIndex={local.onClick ? 0 : undefined}
      onKeyDown={
        local.onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') local.onClick?.();
            }
          : undefined
      }
      {...rest}
    >
      {local.leading && (
        <div class={clsx('list-row__leading', local.leadingAccent ? 'list-row__leading--accent' : undefined)}>
          {local.leading}
        </div>
      )}
      <div class="list-row__content">
        <div class={`list-row__title${local.unread ? ' list-row__title--unread' : ''}`}>
          {local.title}
        </div>
        {local.subtitle && <div class="list-row__subtitle">{local.subtitle}</div>}
      </div>
      <div class="list-row__trailing">
        {local.trailing}
        {local.chevron && <ChevronRightIcon size={16} />}
      </div>
    </div>
  );
}
