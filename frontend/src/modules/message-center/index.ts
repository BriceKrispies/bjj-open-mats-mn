/**
 * Message Center module — inbox, message detail, system notifications.
 *
 * Subscribes to "rsvp/created" and auto-creates an inbox message.
 * Allowed imports: src/core/*, src/ui/*, src/lib/*, own module files.
 * Must NOT import any other module.
 */

import type { Module } from '../../core/module';
import { messagesRepo } from '../../core/storage/messages.repo';
import { formatDateTime, uid } from '../../lib/utils';
import { InboxView } from './InboxView';
import { MessageDetail } from './MessageDetail';
import { unreadCount, refreshUnreadCount } from './unreadCount';

const messageCenterModule: Module = {
  id: 'message-center',

  register(api) {
    // Routes
    api.router.registerRoute({ path: '/messages', component: InboxView });
    api.router.registerRoute({ path: '/messages/:id', component: MessageDetail });

    // Nav item with reactive badge for unread count
    api.router.registerNavItem({
      path: '/messages',
      label: 'Messages',
      icon: 'message',
      order: 1,
      badge: unreadCount,
    });

    // Listen for RSVP events and create confirmation messages
    api.events.on('rsvp/created', ({ rsvp, openMat }) => {
      const message = {
        id: uid(),
        type: 'system' as const,
        title: `RSVP Confirmed — ${openMat.gymName}`,
        body: `You're confirmed for the open mat at ${openMat.gymName} on ${formatDateTime(openMat.dateTime)}. See you on the mat! 🥋\n\nYour RSVP ID: ${rsvp.id.slice(0, 8).toUpperCase()}`,
        createdAt: new Date().toISOString(),
      };
      messagesRepo.set(message);
      refreshUnreadCount();
      api.events.emit('message/created', { message });
    });

    // On RSVP removed, create a cancellation message
    api.events.on('rsvp/removed', ({ openMatId }) => {
      const mat = api.store.openMats.get(openMatId);
      if (!mat) return;
      const message = {
        id: uid(),
        type: 'system' as const,
        title: `RSVP Cancelled — ${mat.gymName}`,
        body: `Your RSVP for the open mat at ${mat.gymName} on ${formatDateTime(mat.dateTime)} has been removed.`,
        createdAt: new Date().toISOString(),
      };
      messagesRepo.set(message);
      refreshUnreadCount();
      api.events.emit('message/created', { message });
    });

    // On data reset, clear messages and refresh count
    api.events.on('data/reset', (_payload) => {
      refreshUnreadCount();
    });
  },
};

export default messageCenterModule;
