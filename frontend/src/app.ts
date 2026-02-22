import { getMockEvents, isAlmostFull, type MatEvent } from "./data/mock-events";
import { icons } from "./ui/icons";

type DateMode = "today" | "tomorrow" | "week";
type SortMode = "popular" | "nearest" | "new" | "all";
type Screen = "list" | "calendar";

interface AppState {
  screen: Screen;
  dateMode: DateMode;
  sortMode: SortMode;
  filters: { gymId: string; withinMiles: number; dateISO: string };
  detailId: string | null;
  events: MatEvent[];
  calYear: number;
  calMonth: number;
  selectedDate: string;
}

const now = new Date();
const state: AppState = {
  screen: "list",
  dateMode: "today",
  sortMode: "popular",
  filters: { gymId: "all", withinMiles: 50, dateISO: "" },
  detailId: null,
  events: [],
  calYear: now.getFullYear(),
  calMonth: now.getMonth(),
  selectedDate: todayStr(),
};

let root: HTMLElement;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function filterAndSort(events: MatEvent[]): MatEvent[] {
  let filtered = events;

  if (state.dateMode === "today") {
    filtered = filtered.filter((e) => e.date === todayStr());
  } else if (state.dateMode === "tomorrow") {
    filtered = filtered.filter((e) => e.date === tomorrowStr());
  }

  if (state.filters.gymId !== "all") {
    filtered = filtered.filter((e) => e.id === state.filters.gymId);
  }

  switch (state.sortMode) {
    case "popular":
      filtered.sort((a, b) => b.rsvpCount - a.rsvpCount);
      break;
    case "nearest":
      filtered.sort((a, b) => b.rsvpCount - a.rsvpCount);
      break;
    case "new":
      filtered.sort((a, b) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
      break;
    case "all":
      filtered.sort((a, b) => {
        const dc = a.date.localeCompare(b.date);
        return dc !== 0 ? dc : a.time.localeCompare(b.time);
      });
      break;
  }

  return filtered;
}

function groupByDate(events: MatEvent[]): Map<string, MatEvent[]> {
  const map = new Map<string, MatEvent[]>();
  for (const e of events) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return map;
}

function dateLabel(iso: string): string {
  if (iso === todayStr()) return "Today";
  if (iso === tomorrowStr()) return "Tomorrow";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fullDateLabel(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function uniqueGyms(events: MatEvent[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const e of events) {
    if (!seen.has(e.gym)) seen.set(e.gym, e.id);
  }
  return [{ id: "all", name: "All Gyms" }, ...Array.from(seen, ([name, id]) => ({ id, name }))];
}

function renderEventRow(e: MatEvent): string {
  const almostFull = isAlmostFull(e);
  const badges: string[] = [];
  if (almostFull) badges.push(`<span class="badge badge--warn">${icons.fire} Almost Full!</span>`);
  if (e.isNew) badges.push(`<span class="badge badge--success">NEW</span>`);

  return `
    <div class="event-row" data-action="detail" data-id="${e.id}">
      <div class="event-row__info">
        <div class="event-row__name">${e.gym}</div>
        <div class="event-row__meta">
          <span>${icons.mapPin} ${e.city}</span>
          <span>${icons.clock} ${e.time} – ${e.endTime}</span>
        </div>
        <div class="event-row__meta" style="margin-top:4px">
          <span>${icons.users} ${e.rsvpCount} RSVP</span>
          ${e.remaining !== undefined ? `<span>${e.remaining} remaining</span>` : ""}
          ${badges.join(" ")}
        </div>
      </div>
      <div class="event-row__stats">
        <button class="btn btn--primary" data-action="detail" data-id="${e.id}">View Details</button>
      </div>
    </div>`;
}

function renderDetail(e: MatEvent): string {
  const almostFull = isAlmostFull(e);
  const backAction = state.screen === "calendar" ? "backToCal" : "back";
  return `
    <div class="detail">
      <button class="btn btn--ghost" data-action="${backAction}" style="margin-bottom:var(--space-md)">${icons.chevronLeft} Back</button>
      <div class="card">
        <div class="card--section">
          <div class="detail__header">${e.gym}</div>
          <div style="color:var(--c-text-secondary);font-size:var(--font-sm)">${e.city}</div>
          ${almostFull ? `<div style="margin-top:var(--space-sm)"><span class="badge badge--warn">${icons.fire} Almost Full!</span></div>` : ""}
          ${e.isNew ? `<div style="margin-top:var(--space-sm)"><span class="badge badge--success">NEW</span></div>` : ""}
        </div>
        <div class="card--section">
          <div class="detail__row"><span class="detail__label">Date</span><span>${dateLabel(e.date)}, ${e.date}</span></div>
          <div class="detail__row"><span class="detail__label">Time</span><span>${e.time} – ${e.endTime}</span></div>
          <div class="detail__row"><span class="detail__label">RSVPs</span><span>${e.rsvpCount}${e.capacity ? ` / ${e.capacity}` : ""}</span></div>
          ${e.remaining !== undefined ? `<div class="detail__row"><span class="detail__label">Remaining</span><span>${e.remaining}</span></div>` : ""}
          <div class="detail__row"><span class="detail__label">Style</span><span>${[e.gi && "Gi", e.nogi && "No-Gi"].filter(Boolean).join(", ") || "Open"}</span></div>
        </div>
        ${e.description ? `<div class="card--section" style="font-size:var(--font-sm);color:var(--c-text-secondary)">${e.description}</div>` : ""}
        <div class="card--section">
          <button class="btn btn--primary" style="width:100%;justify-content:center">RSVP</button>
        </div>
      </div>
    </div>`;
}

function renderList(): string {
  const events = filterAndSort(state.events);
  const gyms = uniqueGyms(state.events);

  const dateModes: { key: DateMode; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "week", label: "This Week" },
  ];

  const sortModes: { key: SortMode; label: string }[] = [
    { key: "popular", label: "Popular" },
    { key: "nearest", label: "Nearest" },
    { key: "new", label: "New Events" },
    { key: "all", label: "All Events" },
  ];

  const grouped = groupByDate(events);

  let sections = "";
  for (const [date, evts] of grouped) {
    sections += `
      <div class="section-title">${dateLabel(date)}</div>
      <div class="card">
        ${evts.map(renderEventRow).join("")}
      </div>`;
  }

  if (events.length === 0) {
    sections = `<div style="padding:var(--space-2xl);text-align:center;color:var(--c-text-muted)">No events found</div>`;
  }

  return `
    <div class="header">
      <div class="row">
        <div>
          <div class="header__title">OpenMatsMN</div>
          <div class="header__subtitle">Find open mats near you</div>
        </div>
        <div class="right">
          <button class="btn" data-action="openCalendar">${icons.calendar} Calendar</button>
        </div>
      </div>
      <div style="margin-top:var(--space-md)">
        <div class="segmented">
          ${dateModes.map((m) => `<button class="segmented__item${state.dateMode === m.key ? " segmented__item--active" : ""}" data-action="dateMode" data-value="${m.key}">${m.label}</button>`).join("")}
        </div>
      </div>
    </div>
    <div class="filters">
      <select class="select" data-action="gymFilter">
        ${gyms.map((g) => `<option value="${g.id}"${state.filters.gymId === g.id ? " selected" : ""}>${g.name}</option>`).join("")}
      </select>
      <select class="select" data-action="distanceFilter">
        ${[5, 10, 25, 50].map((d) => `<option value="${d}"${state.filters.withinMiles === d ? " selected" : ""}>${d} mi</option>`).join("")}
      </select>
    </div>
    <div class="tabs">
      ${sortModes.map((m) => `<button class="tabs__item${state.sortMode === m.key ? " tabs__item--active" : ""}" data-action="sortMode" data-value="${m.key}">${m.label}</button>`).join("")}
    </div>
    <div style="padding-bottom:var(--space-2xl)">
      ${sections}
    </div>`;
}

function renderCalendar(): string {
  const { calYear, calMonth, selectedDate } = state;
  const today = todayStr();
  const monthName = new Date(calYear, calMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const eventsByDate = groupByDate(state.events);
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let cells = dows.map((d) => `<div class="cal__dow">${d}</div>`).join("");

  for (let i = 0; i < firstDow; i++) {
    cells += `<div class="cal__cell cal__cell--empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = isoDate(calYear, calMonth, day);
    const isToday = iso === today;
    const isSelected = iso === selectedDate;
    const dayEvents = eventsByDate.get(iso) ?? [];

    const pills = dayEvents.slice(0, 3).map((e) =>
      `<span class="pill" data-action="detail" data-id="${e.id}">${e.time.replace(/:00/g, "")} ${e.gym.split(" ")[0]}</span>`
    ).join("");
    const overflow = dayEvents.length > 3 ? `<span class="pill" style="background:var(--c-muted-bg);color:var(--c-text-secondary)">+${dayEvents.length - 3}</span>` : "";

    const cls = [
      "cal__cell",
      isToday ? "cal__cell--today" : "",
      isSelected ? "cal__cell--selected" : "",
    ].filter(Boolean).join(" ");

    cells += `
      <div class="${cls}" data-action="selectDay" data-date="${iso}">
        <span class="cal__day">${day}</span>
        <div class="cal__pills">${pills}${overflow}</div>
      </div>`;
  }

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const detailPanel = selectedEvents.length > 0
    ? `<div class="card">${selectedEvents.map(renderEventRow).join("")}</div>`
    : `<div style="padding:var(--space-2xl);text-align:center;color:var(--c-text-muted)">No open mats</div>`;

  return `
    <div class="header">
      <div class="row">
        <button class="btn btn--ghost" data-action="backToList">${icons.chevronLeft} Back</button>
        <div class="grow" style="text-align:center">
          <div class="header__title" style="font-size:var(--font-lg)">OpenMatsMN</div>
        </div>
        <div style="width:60px"></div>
      </div>
    </div>
    <div class="cal">
      <div class="cal__header">
        <button class="btn btn--ghost" data-action="prevMonth">${icons.chevronLeft}</button>
        <span class="cal__header-title">${monthName}</span>
        <button class="btn btn--ghost" data-action="nextMonth">${icons.chevronRight}</button>
      </div>
      <div class="cal__grid">
        ${cells}
      </div>
      <div class="cal__detail">
        <div class="cal__detail-heading">${fullDateLabel(selectedDate)}</div>
        ${detailPanel}
      </div>
    </div>`;
}

function render() {
  if (state.detailId) {
    const event = state.events.find((e) => e.id === state.detailId);
    root.innerHTML = event ? renderDetail(event) : renderList();
  } else if (state.screen === "calendar") {
    root.innerHTML = renderCalendar();
  } else {
    root.innerHTML = renderList();
  }
}

function clampSelectedDate() {
  const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
  const selDay = parseInt(state.selectedDate.slice(8), 10);
  const clamped = Math.min(selDay, daysInMonth);
  state.selectedDate = isoDate(state.calYear, state.calMonth, clamped);
}

function handleAction(action: string, el: HTMLElement) {
  switch (action) {
    case "dateMode":
      state.dateMode = (el.dataset.value as DateMode) ?? "today";
      state.detailId = null;
      break;
    case "sortMode":
      state.sortMode = (el.dataset.value as SortMode) ?? "popular";
      break;
    case "detail":
      state.detailId = el.dataset.id ?? null;
      window.location.hash = state.detailId ? `/event/${state.detailId}` : "";
      return;
    case "back":
      state.detailId = null;
      state.screen = "list";
      window.location.hash = "";
      return;
    case "backToCal":
      state.detailId = null;
      window.location.hash = "/calendar";
      return;
    case "openCalendar":
      state.screen = "calendar";
      state.detailId = null;
      window.location.hash = "/calendar";
      return;
    case "backToList":
      state.screen = "list";
      state.detailId = null;
      window.location.hash = "";
      return;
    case "prevMonth":
      if (state.calMonth === 0) {
        state.calMonth = 11;
        state.calYear--;
      } else {
        state.calMonth--;
      }
      clampSelectedDate();
      break;
    case "nextMonth":
      if (state.calMonth === 11) {
        state.calMonth = 0;
        state.calYear++;
      } else {
        state.calMonth++;
      }
      clampSelectedDate();
      break;
    case "selectDay":
      state.selectedDate = el.dataset.date ?? state.selectedDate;
      break;
    case "gymFilter":
      state.filters.gymId = (el as HTMLSelectElement).value;
      break;
    case "distanceFilter":
      state.filters.withinMiles = parseInt((el as HTMLSelectElement).value, 10);
      break;
    default:
      return;
  }
  render();
}

async function loadEvents() {
  try {
    const res = await fetch("/data/events.json");
    if (res.ok) {
      state.events = await res.json();
      return;
    }
  } catch {
    // offline or fetch failed
  }
  state.events = getMockEvents();
}

function handleHash() {
  const hash = window.location.hash.replace("#", "");
  const eventMatch = hash.match(/^\/event\/(.+)$/);
  if (eventMatch) {
    state.detailId = eventMatch[1];
  } else if (hash === "/calendar") {
    state.screen = "calendar";
    state.detailId = null;
  } else {
    state.screen = "list";
    state.detailId = null;
  }
  render();
}

export async function initApp(el: HTMLElement) {
  root = el;
  await loadEvents();
  handleHash();

  root.addEventListener("click", (ev) => {
    const target = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (target) handleAction(target.dataset.action!, target);
  });

  root.addEventListener("change", (ev) => {
    const target = ev.target as HTMLElement;
    if (target.dataset.action) handleAction(target.dataset.action, target);
  });

  window.addEventListener("hashchange", handleHash);
}
