/**
 * Devtools module — session action log for development and debugging.
 *
 * Enabled when:
 *   - The URL contains ?dev query param (also persists to localStorage), OR
 *   - localStorage.getItem('bjj_devtools') === '1'
 *
 * The route /dev is always registered; the nav item only appears when enabled.
 * Allowed imports: src/core/*, src/ui/*, src/lib/*, own module files.
 */

import type { Module } from '../../core/module';
import { DevtoolsView } from './DevtoolsView';

function isDevEnabled(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.has('dev')) {
    localStorage.setItem('bjj_devtools', '1');
    return true;
  }
  return localStorage.getItem('bjj_devtools') === '1';
}

const devtoolsModule: Module = {
  id: 'devtools',

  register(api) {
    api.router.registerRoute({ path: '/dev', component: DevtoolsView });

    if (isDevEnabled()) {
      api.router.registerNavItem({
        path: '/dev',
        label: 'Devtools',
        icon: 'terminal',
        order: 99,
      });
    }
  },
};

export default devtoolsModule;
