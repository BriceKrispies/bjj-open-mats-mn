// ── Date / Week Utilities ──

/** Returns Monday of the week containing `date` */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const mondayOffset = (day + 6) % 7; 
  // Monday -> 0
  // Tuesday -> 1
  // ...
  // Sunday -> 6

  d.setDate(d.getDate() - mondayOffset);
  return d;
}
/** Returns array of 7 Date objects (Mon–Sun) for the week containing `date` */
export function getWeekDays(date: Date): Date[] {
  const mon = getMonday(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

/** YYYY-MM-DD key from a Date */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD back to Date (midnight local) */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Build calendar month grid: array of 42 date keys (6 weeks, Sun–Sat) */
export function buildMonthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const start = new Date(first);
  start.setDate(1 - startDay);

  const grid: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    grid.push(toDateKey(d));
  }
  return grid;
}

/** Format a Date as "Mon, Feb 22" */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Format a Date as "February 2026" */
export function monthYearLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Format time from ISO string: "6:30 AM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Day-of-week labels for calendar header */
export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Is `key` today? */
export function isToday(key: string): boolean {
  return key === toDateKey(new Date());
}
