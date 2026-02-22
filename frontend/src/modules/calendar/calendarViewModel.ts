// ── Calendar View Model ──

import type { AppState, OpenMat, Rsvp } from '../../core/state';
import { buildMonthGrid, toDateKey, formatTime, monthYearLabel, isToday } from '../../core/time';

export interface CalendarCell {
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  matCount: number;
}

export interface CalendarMonth {
  label: string;
  year: number;
  month: number;
  cells: CalendarCell[];
}

export interface DayMatRow {
  mat: OpenMat;
  rsvp: Rsvp | null;
  timeLabel: string;
}

/** Build calendar grid data for a given year/month */
export function getCalendarMonth(state: AppState, year: number, month: number): CalendarMonth {
  const grid = buildMonthGrid(year, month);

  // Count mats per date key
  const matCounts = new Map<string, number>();
  for (const m of state.openMats) {
    const key = toDateKey(new Date(m.dateTimeISO));
    matCounts.set(key, (matCounts.get(key) ?? 0) + 1);
  }

  const cells = grid.map(dateKey => {
    const d = new Date(dateKey + 'T00:00:00');
    return {
      dateKey,
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
      isToday: isToday(dateKey),
      matCount: matCounts.get(dateKey) ?? 0,
    };
  });

  const label = monthYearLabel(new Date(year, month));
  return { label, year, month, cells };
}

/** Get mat rows for a specific date */
export function getDayMats(state: AppState, dateKey: string): DayMatRow[] {
  return state.openMats
    .filter(m => toDateKey(new Date(m.dateTimeISO)) === dateKey)
    .sort((a, b) => a.dateTimeISO.localeCompare(b.dateTimeISO))
    .map(mat => ({
      mat,
      rsvp: state.rsvps.find(r => r.openMatId === mat.id) ?? null,
      timeLabel: formatTime(mat.dateTimeISO),
    }));
}
