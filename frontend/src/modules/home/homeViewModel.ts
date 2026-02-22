// ── Home View Model ──
// Pure functions deriving view data from state.

import type { AppState, OpenMat, Rsvp } from '../../core/state';
import { getWeekDays, toDateKey, dayLabel, formatTime } from '../../core/time';

export interface MatRow {
  mat: OpenMat;
  rsvp: Rsvp | null;
  timeLabel: string;
}

export interface DayGroup {
  dateKey: string;
  label: string;
  isToday: boolean;
  mats: MatRow[];
}

/** Group current week's mats by day (Mon–Sun) */
export function getWeekGroups(state: AppState): DayGroup[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const todayKey = toDateKey(new Date());

  return weekDays.map(day => {
    const dateKey = toDateKey(day);
    const dayMats = state.openMats
      .filter(m => toDateKey(new Date(m.dateTimeISO)) === dateKey)
      .sort((a, b) => a.dateTimeISO.localeCompare(b.dateTimeISO));

    return {
      dateKey,
      label: dayLabel(day),
      isToday: dateKey === todayKey,
      mats: dayMats.map(mat => ({
        mat,
        rsvp: state.rsvps.find(r => r.openMatId === mat.id) ?? null,
        timeLabel: formatTime(mat.dateTimeISO),
      })),
    };
  });
}
