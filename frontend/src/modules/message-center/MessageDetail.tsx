import type { JSX } from 'solid-js';
import { Show, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { messagesRepo } from '../../core/storage/messages.repo';
import { eventBus } from '../../core/events';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../ui/components/Button';
import { ChevronLeftIcon, BellIcon } from '../../ui/icons';
import { refreshUnreadCount } from './unreadCount';

export function MessageDetail(): JSX.Element {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const message = () => messagesRepo.get(params.id);

  onMount(() => {
    const msg = message();
    if (msg && !msg.readAt) {
      messagesRepo.set({ ...msg, readAt: new Date().toISOString() });
      eventBus.emit('message/read', { messageId: msg.id });
      refreshUnreadCount();
    }
  });

  return (
    <Show
      when={message()}
      fallback={
        <div class="empty-state">
          <div class="empty-state__title">Message not found</div>
          <Button variant="ghost" onClick={() => navigate('/messages')}>
            Back to inbox
          </Button>
        </div>
      }
    >
      {(msg) => (
        <div>
          {/* Back bar */}
          <button
            onClick={() => navigate('/messages')}
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: 'var(--sp-2)',
              padding: 'var(--sp-3) var(--sp-4)',
              color: 'var(--color-accent)',
              'font-size': 'var(--text-sm)',
              'font-weight': 'var(--weight-medium)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              'border-bottom': '1px solid var(--color-border)',
              width: '100%',
              'text-align': 'left',
            }}
          >
            <ChevronLeftIcon size={18} />
            Inbox
          </button>

          {/* Message body */}
          <div style={{ padding: 'var(--sp-5) var(--sp-4)' }}>
            {/* Icon */}
            <div
              style={{
                width: '48px',
                height: '48px',
                'border-radius': 'var(--radius-sm)',
                background: 'var(--color-accent-glow)',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                color: 'var(--color-accent)',
                'margin-bottom': 'var(--sp-4)',
              }}
            >
              <BellIcon size={24} />
            </div>

            {/* Title */}
            <h2
              style={{
                'font-size': 'var(--text-lg)',
                'font-weight': 'var(--weight-bold)',
                'line-height': 'var(--leading-tight)',
                'margin-bottom': 'var(--sp-2)',
              }}
            >
              {msg().title}
            </h2>

            {/* Timestamp */}
            <div
              style={{
                'font-size': 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em',
                'margin-bottom': 'var(--sp-5)',
              }}
            >
              {formatDateTime(msg().createdAt)}
            </div>

            <hr class="divider" style={{ 'margin-bottom': 'var(--sp-4)' }} />

            {/* Body */}
            <p
              style={{
                'font-size': 'var(--text-base)',
                color: 'var(--color-text-secondary)',
                'line-height': 'var(--leading-normal)',
              }}
            >
              {msg().body}
            </p>
          </div>
        </div>
      )}
    </Show>
  );
}
