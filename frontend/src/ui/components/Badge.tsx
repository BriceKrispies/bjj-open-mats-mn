import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge(allProps: ParentProps<BadgeProps>): JSX.Element {
  const [local, rest] = splitProps(allProps, ['variant', 'class', 'children']);

  return (
    <span
      class={clsx('badge', `badge--${local.variant ?? 'accent'}`, local.class)}
      {...rest}
    >
      {local.children}
    </span>
  );
}
