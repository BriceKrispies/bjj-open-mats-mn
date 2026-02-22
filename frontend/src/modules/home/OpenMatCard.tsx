import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import type { OpenMat } from '../../core/storage/openMats.repo';
import type { Rsvp } from '../../core/storage/rsvps.repo';
import { ClockIcon, MapPinIcon, PeopleIcon, CheckIcon } from '../../ui/icons';
import { Button } from '../../ui/components/Button';
import { Chip } from '../../ui/components/Chip';
import { dayLabel, formatTime, plural } from '../../lib/utils';

interface OpenMatCardProps {
  openMat: OpenMat;
  rsvp: Rsvp | undefined;
  onRsvp: (openMat: OpenMat) => void;
}

export function OpenMatCard(props: OpenMatCardProps): JSX.Element {
  const isGoing = () => props.rsvp?.status === 'going';

  return (
    <article class={`open-mat-card${isGoing() ? ' open-mat-card--rsvpd' : ''}`}>
      {/* Header */}
      <div class="open-mat-card__header">
        <div>
          <div class="open-mat-card__gym">{props.openMat.gymName}</div>
          <div style={{ 'margin-top': '4px' }}>
            <Chip accent={isGoing()}>
              {isGoing() ? '✓ Going' : dayLabel(props.openMat.dateTime)}
            </Chip>
          </div>
        </div>
        <Show when={props.openMat.capacity}>
          <div
            style={{
              'font-size': 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              'text-align': 'right',
              'flex-shrink': '0',
            }}
          >
            <PeopleIcon size={14} style={{ display: 'inline', 'vertical-align': 'middle', 'margin-right': '3px' }} />
            {plural(props.openMat.capacity!, 'spot')}
          </div>
        </Show>
      </div>

      {/* Body */}
      <div class="open-mat-card__body">
        <div class="open-mat-card__meta">
          <ClockIcon size={14} />
          <span>{formatTime(props.openMat.dateTime)}</span>
        </div>
        <Show when={props.openMat.address}>
          <div class="open-mat-card__meta">
            <MapPinIcon size={14} />
            <span class="truncate">{props.openMat.address}</span>
          </div>
        </Show>
        <Show when={props.openMat.notes}>
          <p class="open-mat-card__notes">{props.openMat.notes}</p>
        </Show>
      </div>

      {/* Footer */}
      <div class="open-mat-card__footer">
        <span
          style={{
            'font-size': 'var(--text-xs)',
            color: isGoing() ? 'var(--color-accent)' : 'var(--color-text-muted)',
            'font-weight': 'var(--weight-medium)',
          }}
        >
          {isGoing() ? 'RSVP confirmed' : 'Not going yet'}
        </span>
        <Button
          variant={isGoing() ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => props.onRsvp(props.openMat)}
        >
          {isGoing() ? (
            <>
              <CheckIcon size={14} />
              Going
            </>
          ) : (
            'RSVP'
          )}
        </Button>
      </div>
    </article>
  );
}
