/**
 * Message Center module — inbox, message detail, system notifications.
 *
 * Subscribes to "rsvp/created" and auto-creates an inbox message.
 * Allowed imports: src/core/*, src/ui/*, src/lib/*, own module files.
 * Must NOT import any other module.
 */

import type { Module } from '../../core/module';
import { formatDateTime } from '../../lib/utils';
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
    api.store.on('rsvp/created', ({ rsvp, openMat }) => {
      api.store.actions.createMessage({
        type: 'system',
        title: `RSVP Confirmed — ${openMat.gymName}`,
        body: `You're confirmed for the open mat at ${openMat.gymName} on ${formatDateTime(openMat.dateTime)}. See you on the mat! 🥋\n\nYour RSVP ID: ${rsvp.id.slice(0, 8).toUpperCase()}`,
      });
      refreshUnreadCount();
    });

    // On RSVP removed, create a cancellation message
    api.store.on('rsvp/removed', ({ openMatId }) => {
      const mat = api.store.openMats.get(openMatId);
      if (!mat) return;
      api.store.actions.createMessage({
        type: 'system',
        title: `RSVP Cancelled — ${mat.gymName}`,
        body: `Your RSVP for the open mat at ${mat.gymName} on ${formatDateTime(mat.dateTime)} has been removed.`,
      });
      refreshUnreadCount();
    });

    // On data reset, refresh unread count
    api.store.on('data/reset', () => {
      refreshUnreadCount();
    });
  },
};

export default messageCenterModule;
