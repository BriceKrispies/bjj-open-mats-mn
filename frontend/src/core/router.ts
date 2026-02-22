import type { Component } from 'solid-js';

// ─────────────────────────────────────────────────────────────────────────────
// Public types (re-used in module.ts and App.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export interface RouteRegistration {
  /** Path pattern, e.g. "/messages" or "/messages/:id" */
  path: string;
  component: Component;
}

export interface NavItem {
  /** Path to navigate to */
  path: string;
  label: string;
  /** One of the icon keys defined in src/ui/icons.tsx */
  icon: string;
  /** Render order in the bottom nav (ascending) */
  order?: number;
  /** Reactive accessor returning badge count; omit if no badge needed. */
  badge?: () => number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RouterService — modules register with this; App.tsx reads from it.
// ─────────────────────────────────────────────────────────────────────────────
class RouterService {
  private readonly routes: RouteRegistration[] = [];
  private readonly navItems: NavItem[] = [];

  registerRoute(route: RouteRegistration): void {
    this.routes.push(route);
  }

  registerNavItem(item: NavItem): void {
    this.navItems.push(item);
    this.navItems.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }

  getRoutes(): readonly RouteRegistration[] {
    return this.routes;
  }

  getNavItems(): readonly NavItem[] {
    return this.navItems;
  }
}

export const routerService = new RouterService();
