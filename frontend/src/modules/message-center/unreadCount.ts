/**
 * Reactive unread-count signal for the message center.
 * Kept in its own file so both InboxView and the module index can import it
 * without circular dependencies.
 */

import { createSignal } from 'solid-js';
import { messagesRepo } from '../../core/storage/messages.repo';

function computeUnread(): number {
  return messagesRepo.list().filter((m) => !m.readAt).length;
}

const [unreadCount, setUnreadCount] = createSignal<number>(computeUnread());

export { unreadCount };

export function refreshUnreadCount(): void {
  setUnreadCount(computeUnread());
}
