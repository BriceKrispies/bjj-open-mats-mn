// ── Module Registry ──
// ONLY file allowed to import module implementations.

import { homeModule } from './modules/home/index';
import { calendarModule } from './modules/calendar/index';
import { settingsModule } from './modules/settings/index';
import { devModule } from './modules/dev/index';

export const modules = [
  homeModule,
  calendarModule,
  settingsModule,
  devModule,
].sort((a, b) => a.order - b.order);

/** Bootstrap: register all modules */
export function bootstrap(): void {
  for (const mod of modules) {
    mod.register();
  }
}
