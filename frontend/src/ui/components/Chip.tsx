import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';

interface ChipProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  accent?: boolean;
}

export function Chip(allProps: ParentProps<ChipProps>): JSX.Element {
  const [local, rest] = splitProps(allProps, ['accent', 'class', 'children']);

  return (
    <span class={clsx('chip', local.accent ? 'chip--accent' : undefined, local.class)} {...rest}>
      {local.children}
    </span>
  );
}
