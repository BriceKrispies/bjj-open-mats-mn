import type { JSX } from 'solid-js';
import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { openMatsRepo } from '../../core/storage/openMats.repo';
import type { OpenMat } from '../../core/storage/openMats.repo';
import { rsvpsRepo } from '../../core/storage/rsvps.repo';
import type { Rsvp } from '../../core/storage/rsvps.repo';
import { appStore } from '../../core/store';
import { storeActions } from '../../core/actions';
import { showToast } from '../../core/toast';
import { formatTime, plural } from '../../lib/utils';
import { fromDateKey, dayHeadingLabel, toDateKey } from '../../lib/calendarUtils';
import { Button } from '../../ui/components/Button';
import { Chip } from '../../ui/components/Chip';
import { ChevronLeftIcon, ClockIcon, MapPinIcon, CheckIcon, PeopleIcon } from '../../ui/icons';

function matsOnDate(date: Date): OpenMat[] {
  return openMatsRepo
    .list()
    .filter((mat) => toDateKey(new Date(mat.dateTime)) === toDateKey(date))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
}

export function DayView(): JSX.Element {
  const params = useParams<{ date: string }>();
  const navigate = useNavigate();

  const date = () => fromDateKey(params.date);

  const [openMats, setOpenMats] = createSignal<OpenMat[]>(matsOnDate(date()));
  const [rsvps, setRsvps] = createSignal<Rsvp[]>(rsvpsRepo.list());

  const refreshMats = () => setOpenMats(matsOnDate(date()));
  const refreshRsvps = () => setRsvps(rsvpsRepo.list());
  const refreshAll = () => { refreshMats(); refreshRsvps(); };

  onMount(() => {
    appStore.on('openmat/seeded', refreshMats);
    appStore.on('data/reset', refreshAll);
    appStore.on('rsvp/created', refreshRsvps);
    appStore.on('rsvp/removed', refreshRsvps);
  });
  onCleanup(() => {
    appStore.off('openmat/seeded', refreshMats);
    appStore.off('data/reset', refreshAll);
    appStore.off('rsvp/created', refreshRsvps);
    appStore.off('rsvp/removed', refreshRsvps);
  });

  const rsvpFor = (openMatId: string): Rsvp | undefined =>
    rsvps().find((r) => r.openMatId === openMatId);

  const handleRsvp = (openMat: OpenMat, status: 'going' | 'not_going') => {
    const existing = rsvpFor(openMat.id);

    // Tapping the active status again → remove (toggle off)
    if (existing?.status === status) {
      storeActions.removeRsvp({ rsvpId: existing.id, openMatId: openMat.id });
      setRsvps(rsvpsRepo.list());
      showToast('RSVP removed', 'info');
      return;
    }

    // createRsvp handles eviction of any existing RSVP internally
    storeActions.createRsvp({ openMatId: openMat.id, status });
    setRsvps(rsvpsRepo.list());

    if (status === 'going') {
      showToast(`RSVP'd to ${openMat.gymName}! 🥋`, 'success');
    } else {
      showToast('Marked as not going', 'info');
    }
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/calendar')}
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: 'var(--sp-2)',
          padding: 'var(--sp-3) var(--sp-4)',
          color: 'var(--color-accent)',
          'font-size': 'var(--text-sm)',
          'font-weight': 'var(--weight-medium)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          'border-bottom': '1px solid var(--color-border)',
          width: '100%',
          'text-align': 'left',
        }}
      >
        <ChevronLeftIcon size={18} />
        Calendar
      </button>

      {/* Day header */}
      <div
        style={{
          padding: 'var(--sp-4) var(--sp-4) var(--sp-3)',
          'border-bottom': '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div
          style={{
            'font-size': 'var(--text-lg)',
            'font-weight': 'var(--weight-bold)',
            'line-height': 'var(--leading-tight)',
          }}
        >
          {dayHeadingLabel(date())}
        </div>
        <div
          style={{
            'font-size': 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            'margin-top': 'var(--sp-1)',
          }}
        >
          {openMats().length === 0
            ? 'No open mats'
            : plural(openMats().length, 'open mat')}
        </div>
      </div>

      {/* Open mat cards */}
      <Show
        when={openMats().length > 0}
        fallback={
          <div class="empty-state">
            <div class="empty-state__title">No open mats on this day</div>
            <div class="empty-state__body">
              Browse the calendar to find a day with open mats.
            </div>
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: 'var(--sp-3)',
            padding: 'var(--sp-4)',
          }}
        >
          <For each={openMats()}>
            {(mat) => {
              const isGoing = () => rsvpFor(mat.id)?.status === 'going';
              const isNotGoing = () => rsvpFor(mat.id)?.status === 'not_going';

              return (
                <article
                  class={`open-mat-card${isGoing() ? ' open-mat-card--rsvpd' : ''}`}
                >
                  {/* Card header */}
                  <div class="open-mat-card__header">
                    <div style={{ flex: 1, 'min-width': 0 }}>
                      <div class="open-mat-card__gym">{mat.gymName}</div>
                      <div style={{ 'margin-top': '4px' }}>
                        <Chip accent={isGoing()}>
                          {isGoing()
                            ? '✓ Going'
                            : isNotGoing()
                              ? '✕ Not going'
                              : formatTime(mat.dateTime)}
                        </Chip>
                      </div>
                    </div>
                    <Show when={mat.capacity}>
                      <div
                        style={{
                          'font-size': 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                          'text-align': 'right',
                          'flex-shrink': '0',
                        }}
                      >
                        <PeopleIcon
                          size={14}
                          style={{
                            display: 'inline',
                            'vertical-align': 'middle',
                            'margin-right': '3px',
                          }}
                        />
                        {plural(mat.capacity!, 'spot')}
                      </div>
                    </Show>
                  </div>

                  {/* Card body */}
                  <div class="open-mat-card__body">
                    <div class="open-mat-card__meta">
                      <ClockIcon size={14} />
                      <span>{formatTime(mat.dateTime)}</span>
                    </div>
                    <Show when={mat.address}>
                      <div class="open-mat-card__meta">
                        <MapPinIcon size={14} />
                        <span class="truncate">{mat.address}</span>
                      </div>
                    </Show>
                    <Show when={mat.notes}>
                      <p class="open-mat-card__notes">{mat.notes}</p>
                    </Show>
                  </div>

                  {/* Card footer — RSVP actions */}
                  <div class="open-mat-card__footer">
                    <span
                      style={{
                        'font-size': 'var(--text-xs)',
                        'font-weight': 'var(--weight-medium)',
                        color: isGoing()
                          ? 'var(--color-accent)'
                          : 'var(--color-text-muted)',
                      }}
                    >
                      {isGoing()
                        ? 'RSVP confirmed'
                        : isNotGoing()
                          ? 'Declined'
                          : 'No RSVP yet'}
                    </span>

                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      <Button
                        variant={isGoing() ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handleRsvp(mat, 'going')}
                      >
                        <Show when={isGoing()}>
                          <CheckIcon size={14} />
                        </Show>
                        Going
                      </Button>
                      <Button
                        variant={isNotGoing() ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => handleRsvp(mat, 'not_going')}
                      >
                        Not Going
                      </Button>
                    </div>
                  </div>
                </article>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
