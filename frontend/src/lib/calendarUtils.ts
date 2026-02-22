/**
 * src/lib/calendarUtils.ts
 *
 * Minimal calendar helpers — no external date library required.
 * All operations use local-timezone Date methods to stay consistent
 * with how open mat dateTimes are stored and displayed.
 */

export interface CalCell {
  date: Date;
  /** True when this cell belongs to the currently-displayed month. */
  inMonth: boolean;
  isToday: boolean;
}

/** Day-of-week column labels starting on Sunday. */
export const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/**
 * Builds the full 7-column grid for a given year + month (0-indexed).
 * The grid always starts on Sunday and may contain leading/trailing cells
 * from the adjacent months (marked with inMonth = false).
 *
 * Algorithm:
 *   1. Find the day-of-week of the 1st (0 = Sun … 6 = Sat) → startDow
 *   2. Total cells = next multiple of 7 that covers startDow + daysInMonth
 *   3. For cell i, the actual day number is:  (i - startDow + 1)
 *      JS Date handles negative/overflow day numbers by rolling the month.
 */
export function buildMonthGrid(year: number, month: number): CalCell[][] {
  const todayKey = toDateKey(new Date());

  const startDow = new Date(year, month, 1).getDay();           // 0–6
  const daysInMonth = new Date(year, month + 1, 0).getDate();   // 28–31

  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const flat: CalCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    // dayNum 1 = first of month; values < 1 roll into previous month,
    // values > daysInMonth roll into next month — Date handles it natively.
    const date = new Date(year, month, i - startDow + 1);
    flat.push({
      date,
      inMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: toDateKey(date) === todayKey,
    });
  }

  // Chunk into rows of 7
  const rows: CalCell[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    rows.push(flat.slice(i, i + 7));
  }
  return rows;
}

/** "YYYY-MM-DD" key — used for routing and day grouping. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a "YYYY-MM-DD" key back into a local Date.
 * Noon is used to avoid DST-boundary edge cases where midnight
 * might shift to the previous day in certain timezones.
 */
export function fromDateKey(key: string): Date {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d, 12, 0, 0);
}

/** "February 2026" */
export function monthYearLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** "Monday, February 21" */
export function dayHeadingLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
