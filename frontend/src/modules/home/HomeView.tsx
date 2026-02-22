import type { JSX } from 'solid-js';
import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { openMatsRepo } from '../../core/storage/openMats.repo';
import { rsvpsRepo } from '../../core/storage/rsvps.repo';
import type { Rsvp } from '../../core/storage/rsvps.repo';
import { eventBus } from '../../core/events';
import { showToast } from '../../core/toast';
import { uid, dayLabel } from '../../lib/utils';
import { OpenMatCard } from './OpenMatCard';
import { MatIcon } from '../../ui/icons';
import type { OpenMat } from '../../core/storage/openMats.repo';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeView(): JSX.Element {
  const [openMats, setOpenMats] = createSignal(openMatsRepo.list());
  const [rsvps, setRsvps] = createSignal<Rsvp[]>(rsvpsRepo.list());

  // Refresh when a seed event arrives (e.g. after data reset)
  const onSeeded = () => {
    setOpenMats(openMatsRepo.list());
    setRsvps(rsvpsRepo.list());
  };

  onMount(() => eventBus.on('openmat/seeded', onSeeded));
  onCleanup(() => eventBus.off('openmat/seeded', onSeeded));

  const onDataReset = () => {
    setOpenMats(openMatsRepo.list());
    setRsvps([]);
  };
  onMount(() => eventBus.on('data/reset', onDataReset));
  onCleanup(() => eventBus.off('data/reset', onDataReset));

  const rsvpFor = (openMatId: string) =>
    rsvps().find((r) => r.openMatId === openMatId);

  const handleRsvp = (openMat: OpenMat) => {
    const existing = rsvpFor(openMat.id);
    if (existing) {
      rsvpsRepo.remove(existing.id);
      setRsvps(rsvpsRepo.list());
      eventBus.emit('rsvp/removed', { rsvpId: existing.id, openMatId: openMat.id });
      showToast('RSVP removed', 'info');
    } else {
      const rsvp: Rsvp = {
        id: uid(),
        openMatId: openMat.id,
        status: 'going',
        createdAt: new Date().toISOString(),
      };
      rsvpsRepo.set(rsvp);
      setRsvps(rsvpsRepo.list());
      eventBus.emit('rsvp/created', { rsvp, openMat });
      showToast(`RSVP'd to ${openMat.gymName}! 🥋`, 'success');
    }
  };

  // Group open mats by day label — reads the signal so SolidJS tracks reactivity
  const grouped = () => {
    const mats = openMats().slice().sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );
    const groups = new Map<string, OpenMat[]>();
    for (const mat of mats) {
      const label = dayLabel(mat.dateTime);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(mat);
    }
    return [...groups.entries()];
  };

  return (
    <div>
      {/* Hero greeting */}
      <div
        style={{
          padding: 'var(--sp-5) var(--sp-4) var(--sp-3)',
          'border-bottom': '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div style={{ 'font-size': 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {greeting()}, Grappler
        </div>
        <div
          style={{
            'font-size': 'var(--text-xl)',
            'font-weight': 'var(--weight-bold)',
            'margin-top': '2px',
            'line-height': 'var(--leading-tight)',
          }}
        >
          Open Mats
        </div>
      </div>

      {/* Mats list grouped by day */}
      <Show
        when={openMats().length > 0}
        fallback={
          <div class="empty-state">
            <MatIcon size={56} class="empty-state__icon" />
            <div class="empty-state__title">No open mats scheduled</div>
            <div class="empty-state__body">
              Check Settings to reset sample data, or add mats manually.
            </div>
          </div>
        }
      >
        <For each={grouped()}>
          {([label, mats]) => (
            <section>
              <div class="section-header">
                <span class="section-title">{label}</span>
                <span class="text-sm text-secondary">{mats.length} mat{mats.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="mats-grid">
                <For each={mats}>
                  {(mat) => (
                    <OpenMatCard
                      openMat={mat}
                      rsvp={rsvpFor(mat.id)}
                      onRsvp={handleRsvp}
                    />
                  )}
                </For>
              </div>
            </section>
          )}
        </For>
      </Show>
    </div>
  );
}
