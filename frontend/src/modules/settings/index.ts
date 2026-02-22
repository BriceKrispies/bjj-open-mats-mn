/**
 * Settings module — theme toggle, data reset.
 *
 * Allowed imports: src/core/*, src/ui/*, src/lib/*, own module files.
 * Must NOT import any other module.
 */

import type { Module } from '../../core/module';
import { SettingsView } from './SettingsView';

const settingsModule: Module = {
  id: 'settings',

  register(api) {
    api.router.registerRoute({ path: '/settings', component: SettingsView });
    api.router.registerNavItem({ path: '/settings', label: 'Settings', icon: 'settings', order: 2 });
  },
};

export default settingsModule;
