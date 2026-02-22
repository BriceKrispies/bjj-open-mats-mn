# Frontend System Map

Astro 5.5 + TypeScript static site. Deployed to GitHub Pages at `/bjj-open-mats-mn/`.

## Directory Structure

```
src/
├── core/               # State management & business logic
│   ├── store.ts        # Redux-style singleton store (getState, dispatch, subscribe)
│   ├── state.ts        # AppState, OpenMat, Rsvp, Settings interfaces
│   ├── events.ts       # Typed event bus + AppActionMap
│   ├── actions.ts      # createAction<T>(type, payload) factory
│   ├── time.ts         # Date/time utilities (getWeekDays, buildMonthGrid, etc.)
│   ├── persistence.ts  # localStorage adapter (loadKey, saveKey, clearAll)
│   ├── eventLog.ts     # sessionStorage event log (max 500 entries)
│   └── repositories/
│       ├── openMats.ts # seedOpenMats() — 15 sample mats seeded on first visit
│       └── rsvps.ts    # getRsvp(), toggleRsvp()
├── modules/            # Feature modules (isolated — no cross-module imports)
│   ├── home/           # "This Week" view
│   ├── calendar/       # Month grid view
│   ├── settings/       # Settings & data reset
│   └── dev/            # Event log viewer (dev tools)
├── layouts/
│   └── AppLayout.astro # Root layout: TopNav, global CSS, SW registration
├── pages/
│   ├── index.astro     # /
│   ├── calendar.astro  # /calendar
│   ├── settings.astro  # /settings
│   └── dev.astro       # /dev
├── ui/
│   ├── components/     # Presentational Astro components (no core/module imports)
│   │   ├── Button.astro
│   │   ├── Badge.astro
│   │   ├── Input.astro
│   │   ├── Select.astro
│   │   ├── Table.astro
│   │   ├── ListRow.astro
│   │   ├── CalendarGrid.astro
│   │   └── TopNav.astro
│   └── css/
│       ├── tokens.css      # Design tokens (colors, spacing, typography)
│       ├── base.css        # Reset, .container, .app-content
│       ├── components.css  # All component styles
│       └── pages.css       # Page-specific layout styles
├── lib/
│   └── utils.ts        # uid(), truncate(), compactJson() — zero dependencies
├── registry.ts         # Module bootstrapper
└── env.d.ts
public/
├── sw.js               # Service worker (app shell cache, offline fallback)
└── manifest.webmanifest
```

## Module Pattern

Each module in `src/modules/` exports:
```typescript
{ id, order, nav: { label, href }, register() }
```
Modules are registered via `registry.ts`. Cross-module communication goes through `core/store` dispatch only — enforced by ESLint.

## State Management

Redux-style, no external library:
- `store.dispatch(action)` → reducer → persist to localStorage → notify subscribers
- `store.subscribe(fn)` for reactive UI updates
- Pages use inline `<script>` blocks to subscribe and re-render via template literals

## Key Types

```typescript
// core/state.ts
interface OpenMat { id: string; gymName: string; dateTimeISO: string; address?: string; notes?: string; capacity?: number; }
interface Rsvp    { openMatId: string; status: 'going' | 'not_going'; updatedAtISO: string; }
interface AppState { openMats: OpenMat[]; rsvps: Rsvp[]; settings: Settings; }

// core/events.ts — AppActionMap
'openmat/seeded'       → { count: number }
'rsvp/toggled'         → { rsvp: Rsvp; openMat: OpenMat }
'rsvp/removed'         → { openMatId: string }
'settings/themeChanged'→ { theme: 'light' | 'dark' }
'data/reset'           → undefined
```

## CSS Architecture

Strictly modern CSS — no frameworks, no preprocessors.

- **tokens.css** — all design tokens as custom properties
  - Accent: `--color-accent` (#ea580c orange)
  - Primary: `--color-primary` (#1d4ed8 blue)
  - Nav bg: #0f172a (dark navy)
  - Spacing: `--sp-1` through `--sp-16` (4px grid)
  - Font sizes: `--fs-xs` through `--fs-2xl`
- **base.css** — box-sizing reset, `.container` (max 1120px), `.app-content`
- **components.css** — all component styles (buttons, badges, nav, calendar grid, list rows, etc.)
- **pages.css** — page-specific layouts (calendar splits at 860px breakpoint)

Layout: CSS Grid (7-col calendar) + Flexbox throughout. Mobile-first responsive.

## Path Aliases (tsconfig)

```
@core/*   → src/core/*
@lib/*    → src/lib/*
@ui/*     → src/ui/*
@modules/* → src/modules/*
```

## Strict Module Boundaries (ESLint enforced)

| Layer    | Can import                  | Cannot import         |
|----------|-----------------------------|-----------------------|
| `lib`    | nothing (pure utils)        | everything else       |
| `ui`     | `@lib/*`                    | `@core/*`, `@modules/*` |
| `core`   | `@lib/*`                    | `@modules/*`, `@ui/*` |
| `modules`| `@core/*`, `@lib/*`, `@ui/*`| other `@modules/*`    |

## Dev Commands

```bash
npm run dev        # dev server on port 3000
npm run build      # build to dist/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src/
```
