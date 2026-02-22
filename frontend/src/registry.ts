/**
 * src/registry.ts
 *
 * THE ONLY FILE ALLOWED to import module implementations directly.
 * This is an app-level file, not part of core.
 *
 * To add a new module: import it here and push it to the array.
 */

import type { Module } from './core/module';
import homeModule from './modules/home';
import calendarModule from './modules/calendar';
import messageCenterModule from './modules/message-center';
import settingsModule from './modules/settings';
import devtoolsModule from './modules/devtools';

export const moduleRegistry: readonly Module[] = [
  homeModule,
  calendarModule,
  messageCenterModule,
  settingsModule,
  devtoolsModule,
];
