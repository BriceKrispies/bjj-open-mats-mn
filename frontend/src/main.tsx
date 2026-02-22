/**
 * src/main.tsx — Application entry point.
 *
 * Boot order:
 *   1. Import design tokens + global styles (parsed before any JS runs)
 *   2. Load all modules synchronously (register routes, subscribe to events)
 *   3. Mount the SolidJS app
 */

import './ui/tokens.css';
import './ui/global.css';

import { render } from 'solid-js/web';
import { loadModules } from './core/loader';
import { moduleRegistry } from './registry';
import { App } from './App';

// Step 2: Register all modules before the first render.
// By the time App() is called, routerService has all routes and nav items.
loadModules(moduleRegistry);

// Step 3: Mount
const root = document.getElementById('app');
if (!root) throw new Error('#app element not found');

render(App, root);
