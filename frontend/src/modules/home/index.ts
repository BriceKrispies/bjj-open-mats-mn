/**
 * Home module — dashboard with today's open mats + RSVP actions.
 *
 * Allowed imports: src/core/*, src/ui/*, src/lib/*, own module files.
 * Must NOT import any other module.
 */

import type { Module } from '../../core/module';
import { openMatsRepo } from '../../core/storage/openMats.repo';
import { eventBus } from '../../core/events';
import { seedIfEmpty } from '../../lib/mock-data';
import { HomeView } from './HomeView';

const homeModule: Module = {
  id: 'home',

  register(api) {
    // Register route + nav item
    api.router.registerRoute({ path: '/', component: HomeView });
    api.router.registerNavItem({ path: '/', label: 'Home', icon: 'home', order: 0 });

    // Seed mock data on first run
    const result = seedIfEmpty(openMatsRepo);
    if (result.seeded) {
      eventBus.emit('openmat/seeded', { count: result.count });
    }
  },
};

export default homeModule;
