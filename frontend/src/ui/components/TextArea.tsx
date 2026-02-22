import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { clsx } from '../../lib/utils';

interface TextAreaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea(allProps: TextAreaProps): JSX.Element {
  const [local, rest] = splitProps(allProps, ['label', 'class', 'id']);
  const inputId = local.id ?? `textarea-${Math.random().toString(36).slice(2)}`;

  return (
    <div class="input-group">
      {local.label && (
        <label class="input-label" for={inputId}>
          {local.label}
        </label>
      )}
      <textarea
        id={inputId}
        class={clsx('input textarea', local.class)}
        {...rest}
      />
    </div>
  );
}
