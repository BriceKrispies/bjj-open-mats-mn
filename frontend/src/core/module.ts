/**
 * src/core/module.ts
 *
 * Public contract every feature module must satisfy.
 * The ModuleAPI wraps all core services into one typed object that is
 * injected into each module's `register()` call.
 *
 * IMPORTANT: This file may NOT import module implementations.
 *
 * Key rules for module authors:
 *   - All app-wide state mutations go through api.store.actions.*
 *   - Subscribe / unsubscribe via api.store.on / api.store.off
 *   - Never import src/core/events directly — that boundary is ESLint-enforced.
 */

import type { RouteRegistration, NavItem } from './router';
import type { OpenMat } from './storage/openMats.repo';
import type { Rsvp } from './storage/rsvps.repo';
import type { Message } from './storage/messages.repo';
import type { AppActionMap, LogEntry } from './store';
import type { ToastKind } from './toast';

import { routerService } from './router';
import { openMatsRepo } from './storage/openMats.repo';
import { showToast } from './toast';
import { settingsService } from './settings';
import { appStore } from './store';
import { storeActions } from './actions';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export data types so modules can import from core/module instead of
// reaching into individual core sub-files.
// ─────────────────────────────────────────────────────────────────────────────
export type { RouteRegistration, NavItem, OpenMat, Rsvp, Message, AppActionMap, LogEntry };

// ─────────────────────────────────────────────────────────────────────────────
// Module contract
// ─────────────────────────────────────────────────────────────────────────────
export interface ModuleAPI {
  router: {
    registerRoute(route: RouteRegistration): void;
    registerNavItem(item: NavItem): void;
  };

  store: {
    /** Dispatch an action (logs it + emits on the event bus). */
    dispatch<K extends keyof AppActionMap>(
      type: K,
      payload: AppActionMap[K],
      meta?: { source?: string },
    ): void;
    /** Subscribe to an action type. */
    on<K extends keyof AppActionMap>(
      type: K,
      handler: (payload: AppActionMap[K]) => void,
    ): void;
    /** Unsubscribe from an action type. */
    off<K extends keyof AppActionMap>(
      type: K,
      handler: (payload: AppActionMap[K]) => void,
    ): void;
    /** Reactive signal — returns the bounded session log. */
    log(): readonly LogEntry[];
    /** Read-only access to the open mats repository (for lookups). */
    openMats: typeof openMatsRepo;
    /** Typed action helpers — the sanctioned write path for app state. */
    actions: typeof storeActions;
  };

  ui: {
    toast(message: string, kind?: ToastKind): void;
  };

  settings: {
    /** Reactive accessor — use inside SolidJS reactive roots. */
    getTheme(): 'light' | 'dark';
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
    store: {
      dispatch: (type, payload, meta) => appStore.dispatch(type, payload, meta),
      on: (type, handler) => appStore.on(type, handler),
      off: (type, handler) => appStore.off(type, handler),
      log: appStore.log,
      openMats: openMatsRepo,
      actions: storeActions,
    },
    ui: {
      toast: showToast,
    },
    settings: {
      getTheme: settingsService.getTheme,
    },
  };
}
