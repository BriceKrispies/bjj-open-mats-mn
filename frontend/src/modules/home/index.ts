/**
 * Home module — dashboard with today's open mats + RSVP actions.
 *
 * Allowed imports: src/core/*, src/ui/*, src/lib/*, own module files.
 * Must NOT import any other module.
 */

import type { Module } from '../../core/module';
import { openMatsRepo } from '../../core/storage/openMats.repo';
import { generateMockOpenMats } from '../../lib/mock-data';
import { HomeView } from './HomeView';

const homeModule: Module = {
  id: 'home',

  register(api) {
    // Register route + nav item
    api.router.registerRoute({ path: '/', component: HomeView });
    api.router.registerNavItem({ path: '/', label: 'Home', icon: 'home', order: 0 });

    // Seed mock data on first run
    if (openMatsRepo.list().length === 0) {
      api.store.actions.seedOpenMats(generateMockOpenMats());
    }
  },
};

export default homeModule;
