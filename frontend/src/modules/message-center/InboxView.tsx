import type { JSX } from 'solid-js';
import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { messagesRepo } from '../../core/storage/messages.repo';
import type { Message } from '../../core/storage/messages.repo';
import { appStore } from '../../core/store';
import { timeAgo } from '../../lib/utils';
import { ListRow } from '../../ui/components/ListRow';
import { Badge } from '../../ui/components/Badge';
import { MessageIcon, BellIcon } from '../../ui/icons';
import { refreshUnreadCount } from './unreadCount';

export function InboxView(): JSX.Element {
  const navigate = useNavigate();
  const [messages, setMessages] = createSignal<Message[]>(
    messagesRepo.list().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  const refresh = () => {
    setMessages(
      messagesRepo.list().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
    refreshUnreadCount();
  };

  onMount(() => {
    appStore.on('message/created', refresh);
    appStore.on('message/read', refresh);
    appStore.on('data/reset', refresh);
  });
  onCleanup(() => {
    appStore.off('message/created', refresh);
    appStore.off('message/read', refresh);
    appStore.off('data/reset', refresh);
  });

  const unreadCount = () => messages().filter((m) => !m.readAt).length;

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          padding: 'var(--sp-5) var(--sp-4) var(--sp-3)',
          'border-bottom': '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div style={{ 'font-size': 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Inbox
        </div>
        <div
          style={{
            'font-size': 'var(--text-xl)',
            'font-weight': 'var(--weight-bold)',
            'margin-top': '2px',
            display: 'flex',
            'align-items': 'center',
            gap: 'var(--sp-2)',
          }}
        >
          Messages
          <Show when={unreadCount() > 0}>
            <Badge variant="error">{unreadCount()}</Badge>
          </Show>
        </div>
      </div>

      {/* Message list */}
      <Show
        when={messages().length > 0}
        fallback={
          <div class="empty-state">
            <MessageIcon size={56} class="empty-state__icon" />
            <div class="empty-state__title">No messages yet</div>
            <div class="empty-state__body">
              RSVP to an open mat and your confirmation will appear here.
            </div>
          </div>
        }
      >
        <div style={{ 'margin-top': 'var(--sp-2)' }}>
          <For each={messages()}>
            {(msg) => (
              <ListRow
                title={msg.title}
                subtitle={timeAgo(msg.createdAt)}
                unread={!msg.readAt}
                leading={<BellIcon size={18} />}
                leadingAccent={!msg.readAt}
                chevron
                trailing={
                  !msg.readAt ? <Badge variant="accent" style={{ 'min-width': '8px', height: '8px', padding: '0', 'border-radius': '50%' }}>{''}</Badge> : undefined
                }
                onClick={() => navigate(`/messages/${msg.id}`)}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
