import type { JSX } from 'solid-js';
import { Suspense } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { routerService } from './core/router';
import { BottomNav } from './ui/components/BottomNav';
import { ToastContainer } from './ui/components/ToastContainer';

/**
 * AppShell — persistent shell around every route.
 * @solidjs/router passes the matched child route via props.children.
 */
function AppShell(props: { children?: JSX.Element }): JSX.Element {
  const navItems = routerService.getNavItems();

  return (
    <div class="app-shell">
      <main class="app-content">
        <Suspense>{props.children}</Suspense>
      </main>
      <BottomNav items={navItems} />
    </div>
  );
}

function NotFound(): JSX.Element {
  return (
    <div class="empty-state" style={{ 'margin-top': 'var(--sp-16)' }}>
      <div class="empty-state__title">404 — Page not found</div>
    </div>
  );
}

export function App(): JSX.Element {
  // routerService is already populated synchronously by loadModules() in main.tsx.
  // Using .slice() converts readonly array to mutable for map().
  const routes = routerService.getRoutes().slice();

  return (
    <>
      <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Route path="/" component={AppShell}>
          {routes.map((route) => (
            <Route path={route.path} component={route.component} />
          ))}
          <Route path="*404" component={NotFound} />
        </Route>
      </Router>
      <ToastContainer />
    </>
  );
}
