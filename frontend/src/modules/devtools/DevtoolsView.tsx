import type { JSX } from 'solid-js';
import { For, Show, createSignal } from 'solid-js';
import { appStore } from '../../core/store';
import { storeActions } from '../../core/actions';

export function DevtoolsView(): JSX.Element {
  const [filter, setFilter] = createSignal('');

  const filteredLog = () => {
    const f = filter().toLowerCase();
    const entries = [...appStore.log()].reverse();
    if (!f) return entries;
    return entries.filter((e) => e.type.toLowerCase().includes(f));
  };

  const disableDevtools = () => {
    localStorage.removeItem('bjj_devtools');
    window.location.href = '/';
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: 'var(--sp-5) var(--sp-4) var(--sp-3)',
          'border-bottom': '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div style={{ 'font-size': 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Developer Tools
        </div>
        <div
          style={{
            'font-size': 'var(--text-xl)',
            'font-weight': 'var(--weight-bold)',
            'margin-top': '2px',
          }}
        >
          Action Log
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--sp-2)',
          padding: 'var(--sp-3) var(--sp-4)',
          'border-bottom': '1px solid var(--color-border)',
          'flex-wrap': 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Filter by type…"
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
          style={{
            flex: '1',
            'min-width': '120px',
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            'border-radius': 'var(--radius-sm)',
            color: 'var(--color-text)',
            'font-size': 'var(--text-sm)',
          }}
        />
        <button
          onClick={() => appStore.clearLog()}
          style={{
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            'border-radius': 'var(--radius-sm)',
            color: 'var(--color-text-secondary)',
            'font-size': 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          Clear Log
        </button>
        <button
          onClick={() => storeActions.resetData()}
          style={{
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            'border-radius': 'var(--radius-sm)',
            color: 'var(--color-text-secondary)',
            'font-size': 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          Reset Data
        </button>
        <button
          onClick={disableDevtools}
          style={{
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            'border-radius': 'var(--radius-sm)',
            color: 'var(--color-text-muted)',
            'font-size': 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          Disable Devtools
        </button>
      </div>

      {/* Log entries */}
      <Show
        when={filteredLog().length > 0}
        fallback={
          <div class="empty-state">
            <div class="empty-state__title">No actions logged</div>
            <div class="empty-state__body">
              Dispatch actions (RSVP, navigate, etc.) to see them here.
            </div>
          </div>
        }
      >
        <div style={{ 'font-family': 'monospace', 'font-size': 'var(--text-xs)' }}>
          <For each={filteredLog()}>
            {(entry) => (
              <div
                style={{
                  display: 'grid',
                  'grid-template-columns': '2.5rem 1fr',
                  gap: 'var(--sp-2)',
                  padding: 'var(--sp-3) var(--sp-4)',
                  'border-bottom': '1px solid var(--color-border)',
                  'align-items': 'start',
                }}
              >
                {/* Seq + meta */}
                <div
                  style={{
                    color: 'var(--color-text-muted)',
                    'text-align': 'right',
                    'padding-top': '2px',
                  }}
                >
                  #{entry.seq}
                </div>
                <div>
                  {/* Type badge */}
                  <div
                    style={{
                      display: 'inline-block',
                      background: 'var(--color-accent-glow)',
                      color: 'var(--color-accent)',
                      'border-radius': 'var(--radius-xs)',
                      padding: '1px var(--sp-2)',
                      'font-weight': 'var(--weight-medium)',
                      'margin-bottom': 'var(--sp-1)',
                    }}
                  >
                    {entry.type}
                  </div>
                  <Show when={entry.source}>
                    <span
                      style={{
                        'margin-left': 'var(--sp-2)',
                        color: 'var(--color-text-muted)',
                        'font-size': '10px',
                      }}
                    >
                      via {entry.source}
                    </span>
                  </Show>
                  {/* Timestamp */}
                  <div style={{ color: 'var(--color-text-muted)', 'margin-bottom': 'var(--sp-1)' }}>
                    {new Date(entry.ts).toLocaleTimeString()}
                  </div>
                  {/* Payload */}
                  <Show when={entry.payload !== undefined}>
                    <pre
                      style={{
                        margin: '0',
                        'white-space': 'pre-wrap',
                        'word-break': 'break-all',
                        color: 'var(--color-text-secondary)',
                        background: 'var(--color-bg-elevated)',
                        padding: 'var(--sp-2)',
                        'border-radius': 'var(--radius-xs)',
                        'max-height': '120px',
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
