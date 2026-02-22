import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export function Card(allProps: ParentProps<CardProps>): JSX.Element {
  const [local, rest] = splitProps(allProps, ['elevated', 'interactive', 'class', 'children']);

  return (
    <div
      class={clsx(
        'card',
        local.elevated ? 'card--elevated' : undefined,
        local.interactive ? 'card--interactive' : undefined,
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
