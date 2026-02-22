/**
 * src/modules/calendar/index.ts
 *
 * Calendar module — month grid view of Open Mats + per-day RSVP actions.
 *
 * Allowed imports: src/core/*, src/ui/*, src/lib/*, own module files.
 * Must NOT import any other module.
 */

import type { Module } from '../../core/module';
import { CalendarView } from './CalendarView';
import { DayView } from './DayView';

const calendarModule: Module = {
  id: 'calendar',

  register(api) {
    // Month-grid view
    api.router.registerRoute({ path: '/calendar', component: CalendarView });
    // Day-detail view — param format: "2026-02-21"
    api.router.registerRoute({ path: '/calendar/:date', component: DayView });

    // Sits between Home (order 0) and Messages (order 1)
    api.router.registerNavItem({
      path: '/calendar',
      label: 'Calendar',
      icon: 'calendar',
      order: 0.5,
    });
  },
};

export default calendarModule;
