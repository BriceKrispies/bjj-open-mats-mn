import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input(allProps: InputProps): JSX.Element {
  const [local, rest] = splitProps(allProps, ['label', 'class', 'id']);
  const inputId = local.id ?? `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div class="input-group">
      {local.label && (
        <label class="input-label" for={inputId}>
          {local.label}
        </label>
      )}
      <input
        id={inputId}
        class={clsx('input', local.class)}
        {...rest}
      />
    </div>
  );
}
