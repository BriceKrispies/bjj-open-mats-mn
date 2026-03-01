# BJJ Open Mats — Frontend

Astro + TypeScript + modern CSS PWA for finding and RSVPing to BJJ open mat sessions.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (localhost:3000)
npm run build        # production build → dist/
npm run preview      # preview production build
npm run lint         # run ESLint
npm run typecheck    # run Astro check + tsc
node scripts/gen-icons.mjs  # generate placeholder PNG icons
```

## Playwright Tests

Test files live under `tests/pw/`, mirroring the `src/modules/` structure.

### Folder convention

```
tests/pw/
  modules/
    home/        home.pw.spec.ts
    calendar/    calendar.pw.spec.ts
    settings/    settings.pw.spec.ts
    dev/         dev.pw.spec.ts
    gyms/        gyms.pw.spec.ts
```

Each module gets one entry spec: `tests/pw/modules/<name>/<name>.pw.spec.ts`.

### Running tests

```bash
npm run pw                    # run all Playwright tests
npm run pw:mod -- calendar    # run one module's tests
npm run pw:coverage           # check which modules have test coverage (warn only)
```

`npm run pw:mod -- <module>` expands to `playwright test tests/pw/modules <module>`,
which runs tests under `tests/pw/modules/` whose path contains `<module>`.

Tests start the dev server automatically via `webServer` in `playwright.config.ts`.
If the dev server is already running, it is reused (`reuseExistingServer: true` locally).

## Architecture

```
src/
  pages/           Astro file-based routes (index, calendar, settings, dev)
  layouts/         AppLayout — top nav + responsive container shell
  core/            Event bus, store (reducer + dispatch), persistence, repositories
  lib/             Pure utility functions (no app imports)
  ui/css/          Layered CSS: tokens → base → components → pages (@layer)
  ui/components/   Astro components (TopNav, Button, Badge, etc.)
  modules/         Feature modules (home, calendar, settings, dev)
  registry.ts      ONLY file that imports module implementations
```

### Import Boundaries (enforced by ESLint)

| Layer | Can import |
|-------|-----------|
| `modules/*` | `core/*`, `lib/*`, own files only — never other modules |
| `core/*` | `lib/*`, own files — never `modules/*` |
| `ui/*` | nothing from `core/` or `modules/` |
| `lib/*` | nothing from `core/`, `modules/`, or `ui/` |
| `registry.ts` | everything (sole module importer) |

### State Management

- **Store** (`core/store.ts`): single state tree, reducer-style dispatch, subscriber notifications
- **Event bus** (`core/events.ts`): typed pub/sub for inter-module communication
- **Persistence** (`core/persistence.ts`): namespaced localStorage adapter
- **Session log**: in-memory ring buffer of dispatched actions, viewable at `/dev`

All state writes go through `store.dispatch(action)`. Pages subscribe to store changes and re-render.

### CSS Layers

Uses `@layer` to enforce cascade ordering:

1. `tokens` — design tokens (custom properties)
2. `base` — reset, typography, layout primitives
3. `components` — buttons, badges, tables, list rows, calendar grid, nav
4. `pages` — page-specific composition only

No external UI frameworks or Tailwind. All styles are hand-written.

### PWA

- `public/manifest.webmanifest` — installable app manifest
- `public/sw.js` — service worker with network-first navigation, cache-first assets
- `public/icons/` — SVG source + generated PNG icons
