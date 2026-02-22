import type { JSX } from 'solid-js';
import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { openMatsRepo } from '../../core/storage/openMats.repo';
import type { OpenMat } from '../../core/storage/openMats.repo';
import { appStore } from '../../core/store';
import { IconButton } from '../../ui/components/IconButton';
import { ChevronLeftIcon, ChevronRightIcon } from '../../ui/icons';
import {
  buildMonthGrid,
  toDateKey,
  monthYearLabel,
  DOW_LABELS,
} from '../../lib/calendarUtils';

export function CalendarView(): JSX.Element {
  const navigate = useNavigate();
  const now = new Date();

  const [year, setYear] = createSignal(now.getFullYear());
  const [month, setMonth] = createSignal(now.getMonth());
  const [openMats, setOpenMats] = createSignal<OpenMat[]>(openMatsRepo.list());

  // Refresh the mat list when data changes
  const refresh = () => setOpenMats(openMatsRepo.list());
  onMount(() => {
    appStore.on('openmat/seeded', refresh);
    appStore.on('data/reset', refresh);
  });
  onCleanup(() => {
    appStore.off('openmat/seeded', refresh);
    appStore.off('data/reset', refresh);
  });

  const prevMonth = () => {
    if (month() === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month() === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  /** Map of "YYYY-MM-DD" → number of open mats on that day. */
  const countByDay = (): Map<string, number> => {
    const map = new Map<string, number>();
    for (const mat of openMats()) {
      const key = toDateKey(new Date(mat.dateTime));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };

  const grid = () => buildMonthGrid(year(), month());

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          padding: 'var(--sp-5) var(--sp-4) var(--sp-3)',
          'border-bottom': '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div style={{ 'font-size': 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Schedule
        </div>
        <div
          style={{
            'font-size': 'var(--text-xl)',
            'font-weight': 'var(--weight-bold)',
            'margin-top': '2px',
          }}
        >
          Calendar
        </div>
      </div>

      {/* Month navigator */}
      <div class="cal-header">
        <IconButton label="Previous month" onClick={prevMonth}>
          <ChevronLeftIcon size={20} />
        </IconButton>
        <span class="cal-month-label">{monthYearLabel(year(), month())}</span>
        <IconButton label="Next month" onClick={nextMonth}>
          <ChevronRightIcon size={20} />
        </IconButton>
      </div>

      {/* Calendar grid — DOW headers + day cells share the same 7-column grid */}
      <div class="cal-grid">
        {/* Day-of-week column headers */}
        <For each={DOW_LABELS}>
          {(dow) => <div class="cal-dow">{dow}</div>}
        </For>

        {/* Weeks → cells (all rendered as flat siblings inside the CSS grid) */}
        <For each={grid()}>
          {(week) => (
            <For each={week}>
              {(cell) => {
                const key = toDateKey(cell.date);
                const count = () => countByDay().get(key) ?? 0;
                const dots = () => Math.min(count(), 3);

                return (
                  <div
                    class={[
                      'cal-cell',
                      !cell.inMonth ? 'cal-cell--outside' : '',
                      cell.isToday ? 'cal-cell--today' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => cell.inMonth && navigate(`/calendar/${key}`)}
                    role={cell.inMonth ? 'button' : undefined}
                    tabIndex={cell.inMonth ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (cell.inMonth && (e.key === 'Enter' || e.key === ' ')) {
                        navigate(`/calendar/${key}`);
                      }
                    }}
                    aria-label={
                      cell.inMonth
                        ? `${cell.date.toDateString()}${count() > 0 ? `, ${count()} open mat${count() !== 1 ? 's' : ''}` : ''}`
                        : undefined
                    }
                  >
                    <span class="cal-day-num">{cell.date.getDate()}</span>

                    <Show when={count() > 0}>
                      <div class="cal-pip-row">
                        <For each={Array.from({ length: dots() })}>
                          {() => <span class="cal-pip" />}
                        </For>
                        <Show when={count() > 3}>
                          <span class="cal-pip-extra">+{count() - 3}</span>
                        </Show>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          )}
        </For>
      </div>
    </div>
  );
}
