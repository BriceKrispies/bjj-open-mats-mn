import type { JSX, ParentProps } from 'solid-js';

interface TopBarProps {
  title: string;
  leading?: JSX.Element;
  trailing?: JSX.Element;
}

export function TopBar(props: ParentProps<TopBarProps>): JSX.Element {
  return (
    <header class="top-bar" role="banner">
      {props.leading && <div>{props.leading}</div>}
      <h1 class="top-bar__title">{props.title}</h1>
      {props.trailing && <div class="top-bar__actions">{props.trailing}</div>}
    </header>
  );
}
