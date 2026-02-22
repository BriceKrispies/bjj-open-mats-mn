import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button(allProps: ParentProps<ButtonProps>): JSX.Element {
  const [local, rest] = splitProps(allProps, ['variant', 'size', 'class', 'children']);

  return (
    <button
      class={clsx(
        'btn',
        `btn--${local.variant ?? 'primary'}`,
        local.size === 'sm' ? 'btn--sm' : local.size === 'lg' ? 'btn--lg' : undefined,
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </button>
  );
}
