# Frontend System Map

> **Stack:** SolidJS · TypeScript · Vite · vite-plugin-pwa
> **Runtime:** Bun (`bun run dev` / `bun run build`)
> **Root:** `frontend/`

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Architecture Layers](#2-architecture-layers)
3. [Boot Sequence](#3-boot-sequence)
4. [Core Services](#4-core-services)
5. [Data Models](#5-data-models)
6. [Storage Layer](#6-storage-layer)
7. [App Store & Action Map](#7-app-store--action-map)
8. [Router Service](#8-router-service)
9. [Module API Contract](#9-module-api-contract)
10. [Modules](#10-modules)
11. [UI Design System](#11-ui-design-system)
12. [Import Boundary Rules](#12-import-boundary-rules)
13. [Adding a New Module](#13-adding-a-new-module)

---

## 1. Folder Structure

```
frontend/
├── index.html                  # App shell HTML, mounts #app
├── vite.config.ts              # Vite + SolidJS + PWA (PWA only in build)
├── tsconfig.json               # Strict TS, "Bundler" moduleResolution
├── eslint.config.js            # Flat config; enforces import boundaries
├── package.json
├── scripts/
│   └── gen-icons.mjs           # Generates PWA PNG icons from icon.svg
├── public/
│   └── icons/
│       ├── icon.svg            # Source icon (always present)
│       ├── icon-192.png        # } Run `npm run icons` (needs sharp)
│       └── icon-512*.png       # }
└── src/
    ├── main.tsx                # Entry: imports CSS, loads modules, mounts app
    ├── App.tsx                 # Router root + AppShell layout
    ├── registry.ts             # ⚠ ONLY file allowed to import modules
    │
    ├── core/                   # Infrastructure — no module imports allowed
    │   ├── module.ts           # Module + ModuleAPI types; createModuleAPI()
    │   ├── loader.ts           # loadModules(registry) — calls register()
    │   ├── events.ts           # Typed EventBus singleton (internal — do not import from modules)
    │   ├── store.ts            # Central AppStore — dispatch choke-point + session log
    │   ├── actions.ts          # Typed action helpers — the ONLY sanctioned write path
    │   ├── router.ts           # RouterService singleton
    │   ├── settings.ts         # Theme signal + localStorage persistence
    │   ├── toast.ts            # Toast queue signal + show/dismiss
    │   └── storage/
    │       ├── adapter.ts      # StorageAdapter interface (localStorage impl)
    │       ├── repository.ts   # Generic Repository<T> (CRUD over adapter)
    │       ├── openMats.repo.ts
    │       ├── rsvps.repo.ts
    │       ├── messages.repo.ts
    │       └── index.ts        # Re-exports all of the above
    │
    ├── lib/                    # Pure utilities — no framework/core imports
    │   ├── utils.ts            # Date formatting, uid(), clsx(), plural()
    │   ├── calendarUtils.ts    # Month grid builder, toDateKey, fromDateKey
    │   └── mock-data.ts        # generateMockOpenMats()
    │
    ├── ui/                     # Design system — no module imports allowed
    │   ├── tokens.css          # All CSS custom properties (dark + light)
    │   ├── global.css          # Resets + every component class
    │   ├── icons.tsx           # Inline SVG icon set + getIcon(name)
    │   ├── index.ts            # Re-exports all components + icons
    │   └── components/
    │       ├── Button.tsx      # variant: primary|secondary|ghost|danger
    │       ├── IconButton.tsx
    │       ├── Card.tsx
    │       ├── Badge.tsx       # variant: accent|success|warning|error|neutral
    │       ├── Chip.tsx
    │       ├── Input.tsx
    │       ├── TextArea.tsx
    │       ├── Tabs.tsx
    │       ├── Modal.tsx       # Portal-based, closes on overlay click
    │       ├── Sheet.tsx       # Bottom drawer, Portal-based
    │       ├── ToastContainer.tsx  # Reads toast signal, renders stack
    │       ├── ListRow.tsx
    │       ├── Divider.tsx
    │       ├── TopBar.tsx
    │       ├── SideNav.tsx     # Desktop rail nav (≥900px), reads NavItems
    │       └── BottomNav.tsx   # Mobile tab bar (<900px), reads NavItems
    │
    └── modules/                # Feature modules — strict isolation
        ├── home/
        │   ├── index.ts        # Registers /, seeds mock data on first run
        │   ├── HomeView.tsx    # Dashboard with grouped open mat cards
        │   └── OpenMatCard.tsx # Single open mat card + RSVP button
        ├── calendar/
        │   ├── index.ts        # Registers /calendar + /calendar/:date
        │   ├── CalendarView.tsx # Month grid, pip indicators per day
        │   └── DayView.tsx     # Day detail + Going/Not Going RSVP actions
        ├── message-center/
        │   ├── index.ts        # Subscribes to rsvp/* actions, creates messages
        │   ├── InboxView.tsx   # Message list with unread badges
        │   ├── MessageDetail.tsx # Marks message read on mount
        │   └── unreadCount.ts  # Reactive signal for unread count (nav badge)
        ├── settings/
        │   ├── index.ts        # Registers /settings
        │   └── SettingsView.tsx # Theme toggle, Reset, Clear data
        └── devtools/
            ├── index.ts        # Registers /dev; nav item only when dev mode enabled
            └── DevtoolsView.tsx # Reactive action log viewer + controls
```

> **Note:** `.js` files alongside `.ts` files are Bun's compiled output cache — they are not source files and should be gitignored if they appear in the working tree.

---

## 2. Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  App shell  (src/main.tsx · src/App.tsx · src/registry) │
│  Bootstraps everything; the only place modules load     │
└───────────────────┬─────────────────────────────────────┘
                    │ loadModules(registry)
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Modules  (src/modules/*)                               │
│  ┌──────┐ ┌──────────┐ ┌────────────────┐ ┌──────┐ ┌──┐│
│  │ home │ │ calendar │ │ message-center │ │ sett.│ │dev││
│  └──────┘ └──────────┘ └────────────────┘ └──────┘ └──┘│
│  Each module is isolated — no cross-module imports      │
│  Communicate only through core services ↓               │
└───────────────────┬─────────────────────────────────────┘
                    │ import from src/core/*
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Core  (src/core/*)                                     │
│  AppStore · storeActions · RouterService                │
│  Repositories · Settings · Toast · StorageAdapter       │
│  (EventBus is internal to core — not exported to modules)│
└───────────────────┬─────────────────────────────────────┘
                    │ import from src/ui/* · src/lib/*
                    ▼
┌──────────────┐   ┌──────────────────────────────────────┐
│  lib         │   │  UI design system  (src/ui/*)        │
│  Pure utils  │   │  Tokens · Components · Icons         │
│  No deps     │   │  No module or core imports           │
└──────────────┘   └──────────────────────────────────────┘
```

**Allowed import directions (strict):**

| From \ To    | core | ui  | lib | modules |
|-------------|:----:|:---:|:---:|:-------:|
| `app/registry` | ✓ | ✓ | ✓ | ✓ |
| `modules`   | ✓ | ✓ | ✓ | own only |
| `core`      | ✓ | ✗ | ✓ | ✗ |
| `ui`        | ✗ | ✓ | ✓ | ✗ |
| `lib`       | ✗ | ✗ | ✓ | ✗ |

**Additional restriction:** modules must NOT import `core/events` — the EventBus is an internal core detail. Use `api.store.on/off` or import `appStore` from `core/store` instead.

---

## 3. Boot Sequence

```
index.html
  └── src/main.tsx
        1. import './ui/tokens.css'        — CSS custom properties applied
        2. import './ui/global.css'        — Component classes applied
        3. loadModules(moduleRegistry)     — Synchronous; all modules register
        │     ├── homeModule.register(api)
        │     │     ├── routerService.registerRoute({ path: '/' })
        │     │     ├── routerService.registerNavItem({ label: 'Home' })
        │     │     └── api.store.actions.seedOpenMats(...)  ← first-run data seed
        │     ├── calendarModule.register(api)
        │     │     ├── routerService.registerRoute({ path: '/calendar' })
        │     │     └── routerService.registerRoute({ path: '/calendar/:date' })
        │     ├── messageCenterModule.register(api)
        │     │     ├── routerService.registerRoute({ path: '/messages' })
        │     │     ├── routerService.registerRoute({ path: '/messages/:id' })
        │     │     ├── api.store.on('rsvp/created', ...)  ← auto-inbox
        │     │     └── api.store.on('rsvp/removed', ...)  ← auto-inbox
        │     ├── settingsModule.register(api)
        │     │     └── routerService.registerRoute({ path: '/settings' })
        │     └── devtoolsModule.register(api)
        │           ├── routerService.registerRoute({ path: '/dev' })
        │           └── [nav item only if ?dev or bjj_devtools=1]
        4. render(App, #app)
              └── App.tsx reads routerService.getRoutes() — already populated
```

---

## 4. Core Services

### `core/store.ts` — AppStore

Central dispatch choke-point. Every app-wide state change flows through `appStore.dispatch()`, which:
1. Appends a `LogEntry` to a bounded (1000-entry) in-memory session log (a SolidJS reactive signal).
2. Emits on the internal EventBus so reactive view subscriptions fire.

```ts
appStore.dispatch(type, payload, meta?)  // broadcast an action
appStore.on(type, handler)               // subscribe
appStore.off(type, handler)              // unsubscribe (always call in onCleanup)
appStore.log()                           // reactive signal: readonly LogEntry[]
appStore.clearLog()                      // wipe in-memory log
```

### `core/actions.ts` — storeActions

**The only sanctioned write path for app-wide state.** Each action performs the necessary repository write(s) and then dispatches the corresponding action to the store. Modules must NOT call repository write methods directly for app-wide state — they must use these helpers.

```ts
storeActions.seedOpenMats(mats)                           // writes + dispatches openmat/seeded
storeActions.createRsvp({ openMatId, status })            // writes + dispatches rsvp/created (if 'going')
storeActions.removeRsvp({ rsvpId, openMatId })            // writes + dispatches rsvp/removed
storeActions.createMessage({ type, title, body })         // writes + dispatches message/created
storeActions.markMessageRead({ messageId })               // writes + dispatches message/read
storeActions.setTheme(theme)                              // writes + dispatches settings/themeChanged
storeActions.resetData({ reSeed? })                       // clears all repos + dispatches data/reset
                                                          // if reSeed=true (default), also re-seeds
```

### `core/events.ts` — EventBus (internal)

Singleton pub/sub bus used internally by `appStore`. **Do not import this from modules.** All event types are declared in `AppEventMap`; TypeScript enforces payload shapes.

### `core/router.ts` — RouterService

Collects route and nav-item registrations before the app renders. `App.tsx` reads them once (synchronously) after `loadModules`.

```ts
routerService.registerRoute({ path, component })
routerService.registerNavItem({ path, label, icon, order?, badge? })
routerService.getRoutes()    → readonly RouteRegistration[]
routerService.getNavItems()  → readonly NavItem[]  (sorted by order)
```

`NavItem.badge` is an optional `() => number` reactive accessor — used by `BottomNav` and `SideNav` to show live unread counts.

### `core/loader.ts` — Module Loader

Pure function; takes the registry array, creates a fresh `ModuleAPI` for each module, and calls `module.register(api)`.

```ts
loadModules(registry: readonly Module[]): void
```

### `core/settings.ts` — Theme

SolidJS signal backed by `localStorage`. Applies `data-theme` attribute to `<html>` immediately on import (no flash).

```ts
settingsService.getTheme()          // reactive signal: 'light' | 'dark'
settingsService.setTheme('light')   // updates signal + storage + DOM attr
```

### `core/toast.ts` — Toast Queue

SolidJS signal of `ToastItem[]`. Toasts auto-dismiss after 3.5 s.

```ts
showToast(message, kind?)    // kind: 'success' | 'error' | 'info' | 'warning'
dismissToast(id)
toasts()                     // reactive accessor consumed by ToastContainer
```

### `core/storage/adapter.ts` — StorageAdapter

Thin wrapper over `localStorage` with JSON serialization. Swap the implementation here to migrate to IndexedDB without touching any other file.

```ts
storage.getItem<T>(key)        → T | null
storage.setItem<T>(key, value)
storage.removeItem(key)
storage.clearAll()             // removes all 'bjj_*' keys
```

---

## 5. Data Models

```ts
// core/storage/openMats.repo.ts
interface OpenMat {
  id: string;
  gymName: string;
  dateTime: string;       // ISO-8601 local time
  address?: string;
  notes?: string;
  capacity?: number;
}

// core/storage/rsvps.repo.ts
interface Rsvp {
  id: string;
  openMatId: string;
  status: 'going' | 'not_going';
  createdAt: string;      // ISO-8601
}

// core/storage/messages.repo.ts
interface Message {
  id: string;
  type: 'system' | 'user';
  title: string;
  body: string;
  createdAt: string;      // ISO-8601
  readAt?: string;        // undefined = unread
}
```

---

## 6. Storage Layer

```
StorageAdapter (interface)
  └── LocalStorageAdapter  (concrete, default)
        └── Repository<T extends { id: string }>
              ├── openMatsRepo   key: bjj_openMats
              ├── rsvpsRepo      key: bjj_rsvps
              └── messagesRepo   key: bjj_messages
```

**Repository API (all synchronous):**

```ts
repo.list()           → T[]
repo.get(id)          → T | undefined
repo.set(item)        → void   // upsert by id
repo.remove(id)       → void
repo.clear()          → void
repo.count()          → number
```

Repositories are **read-only** for modules via `api.store.openMats`. Direct reads (`.list()`, `.get()`) are allowed anywhere. Direct writes (`.set()`, `.remove()`, `.clear()`) for app-wide state must go through `storeActions.*`.

---

## 7. App Store & Action Map

### Full Action Map

| Action | Payload | Dispatched by | Consumed by |
|---|---|---|---|
| `openmat/seeded` | `{ count: number }` | `storeActions.seedOpenMats`, `storeActions.resetData` | home view, calendar view |
| `rsvp/created` | `{ rsvp: Rsvp, openMat: OpenMat }` | `storeActions.createRsvp` | message-center (auto-inbox), DayView refresh |
| `rsvp/removed` | `{ rsvpId: string, openMatId: string }` | `storeActions.removeRsvp` | message-center (auto-inbox), DayView refresh |
| `message/created` | `{ message: Message }` | `storeActions.createMessage` | inbox view (reactive refresh) |
| `message/read` | `{ messageId: string }` | `storeActions.markMessageRead` | inbox view (reactive refresh) |
| `settings/themeChanged` | `{ theme: 'light' \| 'dark' }` | `storeActions.setTheme` | — |
| `data/reset` | `undefined` | `storeActions.resetData` | home, calendar, message-center |

### Pattern: subscribing in a component

```ts
// Always clean up in onCleanup to avoid memory leaks
const handler = () => refresh();
onMount(() => appStore.on('openmat/seeded', handler));
onCleanup(() => appStore.off('openmat/seeded', handler));
```

Or via the ModuleAPI in `register()`:

```ts
api.store.on('rsvp/created', ({ rsvp, openMat }) => { ... });
```

### Session Log (DevtoolsView)

Every dispatched action is logged as a `LogEntry`:

```ts
interface LogEntry {
  seq: number;      // monotonically increasing per session
  ts: string;       // ISO-8601 dispatch timestamp
  type: string;     // action type key
  payload: unknown; // raw payload
  source?: string;  // originating tag (e.g. 'actions')
}
```

Access at `/dev` (enable with `?dev` URL param or `bjj_devtools=1` in localStorage).

---

## 8. Router Service

Routes and nav items are registered **synchronously** during `loadModules`, before `App.tsx` renders. `App.tsx` reads the finalized arrays once:

```tsx
// App.tsx
const routes = routerService.getRoutes().slice();

return (
  <Router>
    <Route path="/" component={AppShell}>
      {routes.map((r) => <Route path={r.path} component={r.component} />)}
      <Route path="*404" component={NotFound} />
    </Route>
  </Router>
);
```

**Registered routes (in order of registration):**

| Path | Component | Module |
|---|---|---|
| `/` | `HomeView` | home |
| `/calendar` | `CalendarView` | calendar |
| `/calendar/:date` | `DayView` | calendar |
| `/messages` | `InboxView` | message-center |
| `/messages/:id` | `MessageDetail` | message-center |
| `/settings` | `SettingsView` | settings |
| `/dev` | `DevtoolsView` | devtools |

**Nav items (sorted by `order`):**

| order | Label | Icon | Path | Badge |
|---|---|---|---|---|
| 0 | Home | `home` | `/` | — |
| 0.5 | Calendar | `calendar` | `/calendar` | — |
| 1 | Messages | `message` | `/messages` | unread count |
| 2 | Settings | `settings` | `/settings` | — |
| 99 | Devtools | `terminal` | `/dev` | — (only in dev mode) |

---

## 9. Module API Contract

Every module receives a `ModuleAPI` object in its `register()` call. This is the **only** sanctioned interface between modules and core infrastructure.

```ts
interface Module {
  id: string;
  register(api: ModuleAPI): void;
}

interface ModuleAPI {
  router: {
    registerRoute(route: { path: string; component: Component }): void;
    registerNavItem(item: {
      path: string; label: string; icon: string;
      order?: number; badge?: () => number;
    }): void;
  };

  store: {
    /** Dispatch an action (logs it + emits on the event bus). */
    dispatch<K extends keyof AppActionMap>(
      type: K, payload: AppActionMap[K], meta?: { source?: string }
    ): void;
    /** Subscribe to an action type. */
    on<K extends keyof AppActionMap>(
      type: K, handler: (payload: AppActionMap[K]) => void
    ): void;
    /** Unsubscribe from an action type. */
    off<K extends keyof AppActionMap>(
      type: K, handler: (payload: AppActionMap[K]) => void
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
    getTheme(): 'light' | 'dark';
  };
}
```

> Views may also import `appStore` from `core/store` and `storeActions` from `core/actions` directly (both are in `src/core/*`, an allowed layer). The `api` object is the primary interface inside `register()` itself.

---

## 10. Modules

### `home`

| | |
|---|---|
| Routes | `/` |
| Nav | Home (order 0) |
| On register | Seeds mock data: `api.store.actions.seedOpenMats(generateMockOpenMats())` if repo is empty |
| Dispatches | `openmat/seeded` (via storeActions), `rsvp/created`, `rsvp/removed` |
| Listens | `openmat/seeded`, `data/reset` |

**Files:**
- `HomeView.tsx` — groups open mats by day label (Today / Tomorrow / date), renders `OpenMatCard` for each. RSVP handled via `storeActions.createRsvp` / `storeActions.removeRsvp`.
- `OpenMatCard.tsx` — shows gym name, time, address, notes, capacity; RSVP toggle button. Going state reflected visually.

### `calendar`

| | |
|---|---|
| Routes | `/calendar`, `/calendar/:date` |
| Nav | Calendar (order 0.5) |
| On register | Nothing (reads data on demand) |
| Dispatches | `rsvp/created`, `rsvp/removed` (via storeActions) |
| Listens | `openmat/seeded`, `data/reset`, `rsvp/created`, `rsvp/removed` |

**Files:**
- `CalendarView.tsx` — month grid (Sun–Sat), prev/next navigation, accent pip dots for days with open mats (up to 3 dots, then `+N`). Today highlighted with accent circle.
- `DayView.tsx` — lists open mats for the tapped day. Going / Not Going buttons (tapping active status removes RSVP via `storeActions.removeRsvp`).

**Month grid algorithm** (`lib/calendarUtils.ts`):
1. Find `startDow` = day-of-week of the 1st (0=Sun).
2. `totalCells` = next multiple of 7 ≥ `startDow + daysInMonth`.
3. For cell `i`: `date = new Date(year, month, i - startDow + 1)`. JS `Date` handles negative/overflow day numbers natively (rolls into adjacent months).
4. Chunk flat array into rows of 7.

### `message-center`

| | |
|---|---|
| Routes | `/messages`, `/messages/:id` |
| Nav | Messages (order 1, badge = unread count) |
| On register | `api.store.on('rsvp/created', ...)` + `api.store.on('rsvp/removed', ...)` to auto-create inbox messages via `api.store.actions.createMessage` |
| Dispatches | `message/created`, `message/read` (via storeActions) |
| Listens | `rsvp/created`, `rsvp/removed`, `data/reset`, `message/created`, `message/read` |

**Files:**
- `InboxView.tsx` — sorted message list, bold title for unread, accent dot indicator.
- `MessageDetail.tsx` — marks message read via `storeActions.markMessageRead({ messageId })` on mount.
- `unreadCount.ts` — module-scoped SolidJS signal. Exported as a `() => number` accessor and plugged directly into the nav item's `badge` field. Updated by `refreshUnreadCount()`.

### `settings`

| | |
|---|---|
| Routes | `/settings` |
| Nav | Settings (order 2) |
| On register | Nothing |
| Dispatches | `settings/themeChanged`, `data/reset`, `openmat/seeded` (all via storeActions) |
| Listens | — |

**Files:**
- `SettingsView.tsx` — dark/light toggle via `storeActions.setTheme`, Reset (clear + reseed) via `storeActions.resetData({ reSeed: true })`, Clear All via `storeActions.resetData({ reSeed: false })`. Reset confirmed with `Modal`.

### `devtools`

| | |
|---|---|
| Routes | `/dev` (always registered) |
| Nav | Devtools / terminal (order 99, only when dev mode active) |
| On register | Checks `?dev` param or `bjj_devtools` localStorage; registers nav item if enabled |
| Dispatches | — |
| Listens | — (reads `appStore.log()` reactively) |

**Activating dev mode:**
- Visit `?dev` in the URL — persists `bjj_devtools=1` to localStorage.
- Or set `localStorage.setItem('bjj_devtools', '1')` manually.
- "Disable Devtools" button removes the key and redirects to `/`.

**Files:**
- `DevtoolsView.tsx` — reactive action log (newest-first), type filter input, Clear Log / Reset Data / Disable Devtools buttons.

---

## 11. UI Design System

### Tokens (`src/ui/tokens.css`)

All values are CSS custom properties on `:root`. Dark is the default; `[data-theme="light"]` overrides. The `data-theme` attribute is set on `<html>` by `settingsService`.

| Category | Variables |
|---|---|
| Accent | `--color-accent`, `--color-accent-dim`, `--color-accent-glow`, `--color-on-accent` |
| Backgrounds | `--color-bg`, `--color-bg-elevated`, `--color-surface`, `--color-surface-2/3` |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` |
| Border | `--color-border`, `--color-border-strong` |
| Semantic | `--color-success/warning/error/info` + `-bg` variants |
| Spacing | `--sp-1` … `--sp-16` (4px grid) |
| Radii | `--radius-xs/sm/md/lg/xl/full` |
| Typography | `--text-xs` … `--text-2xl`, `--weight-*`, `--leading-*` |
| Shadows | `--shadow-sm/md/lg` |
| Motion | `--ease-fast/normal/slow/spring` |
| Layout | `--top-bar-height: 56px`, `--bottom-nav-height: 64px`, `--content-max-width: 600px`, `--side-nav-width: 220px` |
| Safe areas | `--safe-top`, `--safe-bottom` (env() values for notched devices) |

### Responsive Layout

| Breakpoint | Layout |
|---|---|
| `<900px` (mobile) | TopBar + content + BottomNav |
| `≥900px` (tablet/desktop) | SideNav (220px rail) + content; BottomNav hidden |
| `≥1200px` (wide desktop) | SideNav widens to 240px; content max-width 1280px |

`.mats-grid` — 1 col mobile → 2 col at 900px → 3 col at 1200px.

### Components (`src/ui/components/`)

| Component | Key props / notes |
|---|---|
| `Button` | `variant` (primary\|secondary\|ghost\|danger), `size` (sm\|md\|lg) |
| `IconButton` | `label` (aria), wraps any icon child |
| `Card` | `elevated?`, `interactive?` |
| `Badge` | `variant` (accent\|success\|warning\|error\|neutral) |
| `Chip` | `accent?` — accent-coloured variant for active state |
| `Input` | `label?` — renders labelled input group |
| `TextArea` | Same as Input but `<textarea>` |
| `Tabs` | `tabs: TabDef[]`, `active: string`, `onChange` |
| `Modal` | `open`, `onClose`, `title?`, `footer?` — Portal, backdrop click closes |
| `Sheet` | `open`, `onClose`, `title?` — bottom drawer, Portal |
| `ToastContainer` | No props — reads global `toasts()` signal |
| `ListRow` | `title`, `subtitle?`, `leading?`, `trailing?`, `chevron?`, `unread?` |
| `Divider` | `label?` — labelled rule |
| `TopBar` | `title`, `leading?`, `trailing?` |
| `SideNav` | `items: NavItem[]` — desktop rail nav, uses `<A activeClass end>` |
| `BottomNav` | `items: NavItem[]` — mobile tab bar, uses `<A activeClass end>` |

### Icons (`src/ui/icons.tsx`)

All icons are inline SVG, no external dependency. Factory pattern: `const SomeIcon = icon(<path d="..." />)`.

Available icons: `HomeIcon`, `MessageIcon`, `BellIcon`, `SettingsIcon`, `CalendarIcon`, `CheckIcon`, `CloseIcon`, `ChevronRightIcon`, `ChevronLeftIcon`, `MapPinIcon`, `ClockIcon`, `PeopleIcon`, `TrashIcon`, `RefreshIcon`, `MoonIcon`, `SunIcon`, `InfoIcon`, `PlusIcon`, `MatIcon`, `TerminalIcon`.

`getIcon(name: string)` maps nav item icon keys to components:

| Key | Component |
|---|---|
| `home` | HomeIcon |
| `calendar` | CalendarIcon |
| `message` | MessageIcon |
| `settings` | SettingsIcon |
| `bell` | BellIcon |
| `mat` | MatIcon |
| `terminal` | TerminalIcon |
| _(unknown)_ | InfoIcon |

---

## 12. Import Boundary Rules

Enforced by `eslint.config.js` using `no-restricted-imports` patterns.

**Rule 1 — Modules cannot import other modules:**
Files inside `src/modules/foo/*` may not import from `src/modules/bar/*`.
✓ `../../core/store` — allowed
✓ `./OpenMatCard` — allowed (same module)
✗ `../message-center/unreadCount` — blocked

**Rule 2 — Modules cannot import core/events:**
The EventBus is an internal core detail. Use `api.store.on/off` (in `register()`) or import `appStore` from `core/store` (in view files) instead.
✗ `../../core/events` — blocked
✓ `../../core/store` — allowed
✓ `../../core/actions` — allowed

**Rule 3 — Core cannot import modules:**
Files inside `src/core/*` may not import from `src/modules/**`.
Exception: `src/registry.ts` (app-level) is explicitly exempt.

**Permitted import graph:**
```
registry.ts  →  modules  →  core  →  lib
                          →  ui    →  lib
                          →  lib
```

To **verify** boundaries: `bun run lint` (or `npx eslint src/`)

---

## 13. Adding a New Module

**Step 1 — Create the module folder:**
```
src/modules/my-feature/
├── index.ts          ← required: default export Module
└── MyView.tsx        ← SolidJS component(s)
```

**Step 2 — Write `index.ts`:**
```ts
import type { Module } from '../../core/module';
import { MyView } from './MyView';

const myModule: Module = {
  id: 'my-feature',
  register(api) {
    api.router.registerRoute({ path: '/my-feature', component: MyView });
    api.router.registerNavItem({
      path: '/my-feature',
      label: 'My Feature',
      icon: 'mat',          // any key from getIcon()
      order: 3,             // position in nav
    });

    // Subscribe to actions if needed
    api.store.on('rsvp/created', ({ openMat }) => {
      // react to RSVPs...
    });
  },
};

export default myModule;
```

**Step 3 — Register in `src/registry.ts`** (the only permitted place):
```ts
import myModule from './modules/my-feature';

export const moduleRegistry: readonly Module[] = [
  homeModule,
  calendarModule,
  myModule,          // ← add here
  messageCenterModule,
  settingsModule,
  devtoolsModule,
];
```

**Step 4 — Add a nav icon key** (if using a new name):
In `src/ui/icons.tsx`, add the export and add the key to the `getIcon` map.

**Step 5 — Add new actions** (if needed):
In `src/core/events.ts`, extend `AppEventMap`. Add the corresponding action helper to `src/core/actions.ts`. TypeScript will then enforce the payload shape everywhere.

**Step 6 — Verify:**
```bash
bun run build    # TypeScript + Vite build — must pass clean
bun run lint     # Boundary rules — must pass with 0 warnings
```
