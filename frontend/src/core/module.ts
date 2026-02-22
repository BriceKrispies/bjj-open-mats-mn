/**
 * src/core/module.ts
 *
 * Defines the public contract every feature module must satisfy.
 * The ModuleAPI wraps all core services into one typed object that
 * is injected into each module's `register()` call.
 *
 * IMPORTANT: This file may NOT import module implementations.
 */

import type { RouteRegistration, NavItem } from './router';
import type { OpenMat } from './storage/openMats.repo';
import type { Rsvp } from './storage/rsvps.repo';
import type { Message } from './storage/messages.repo';
import type { AppEventMap } from './events';
import type { ToastKind } from './toast';

import { routerService } from './router';
import { eventBus } from './events';
import { openMatsRepo } from './storage/openMats.repo';
import { rsvpsRepo } from './storage/rsvps.repo';
import { messagesRepo } from './storage/messages.repo';
import { showToast } from './toast';
import { settingsService } from './settings';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export data types so modules only need to import from '@core/module'
// ─────────────────────────────────────────────────────────────────────────────
export type { RouteRegistration, NavItem, OpenMat, Rsvp, Message, AppEventMap };

// ─────────────────────────────────────────────────────────────────────────────
// Module contract
// ─────────────────────────────────────────────────────────────────────────────
export interface ModuleAPI {
  router: {
    registerRoute(route: RouteRegistration): void;
    registerNavItem(item: NavItem): void;
  };
  events: {
    emit<K extends keyof AppEventMap>(type: K, payload: AppEventMap[K]): void;
    on<K extends keyof AppEventMap>(
      type: K,
      handler: (payload: AppEventMap[K]) => void,
    ): void;
    off<K extends keyof AppEventMap>(
      type: K,
      handler: (payload: AppEventMap[K]) => void,
    ): void;
  };
  store: {
    openMats: typeof openMatsRepo;
    rsvps: typeof rsvpsRepo;
    messages: typeof messagesRepo;
  };
  ui: {
    toast(message: string, kind?: ToastKind): void;
  };
  settings: {
    getTheme: () => 'light' | 'dark';
    setTheme(theme: 'light' | 'dark'): void;
  };
}

export interface Module {
  /** Unique identifier, e.g. "home" or "message-center". */
  id: string;
  /** Called once during app startup via the module loader. */
  register(api: ModuleAPI): void;
}

/** Factory that wires all core singletons into a fresh ModuleAPI object. */
export function createModuleAPI(): ModuleAPI {
  return {
    router: {
      registerRoute: (r) => routerService.registerRoute(r),
      registerNavItem: (i) => routerService.registerNavItem(i),
    },
    events: {
      emit: (type, payload) => eventBus.emit(type, payload),
      on: (type, handler) => eventBus.on(type, handler),
      off: (type, handler) => eventBus.off(type, handler),
    },
    store: {
      openMats: openMatsRepo,
      rsvps: rsvpsRepo,
      messages: messagesRepo,
    },
    ui: {
      toast: showToast,
    },
    settings: {
      getTheme: settingsService.getTheme,
      setTheme: (t) => settingsService.setTheme(t),
    },
  };
}
