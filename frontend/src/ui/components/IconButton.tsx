import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';

interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton(allProps: ParentProps<IconButtonProps>): JSX.Element {
  const [local, rest] = splitProps(allProps, ['label', 'class', 'children']);

  return (
    <button
      class={clsx('btn btn--icon btn--ghost', local.class)}
      aria-label={local.label}
      title={local.label}
      type="button"
      {...rest}
    >
      {local.children}
    </button>
  );
}
