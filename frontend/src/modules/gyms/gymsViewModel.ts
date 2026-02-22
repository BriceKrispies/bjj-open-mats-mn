// ── Gyms View Model ──
// Derives a unique gym registry from open mat session data.

import type { AppState } from '../../core/state';

export interface GymRow {
  gymName: string;
  location: string;
  lastSeenISO: string;
  lastSeenLabel: string;
  status: 'verified' | 'needs-review' | 'stale';
  matCount: number;
}

function deriveStatus(lastSeenISO: string): 'verified' | 'needs-review' | 'stale' {
  const diffDays = (Date.now() - new Date(lastSeenISO).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return 'verified';
  if (diffDays <= 90) return 'needs-review';
  return 'stale';
}

function formatLastSeen(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Build unique gym list from open mat sessions, sorted by most-recently active */
export function getGymList(state: AppState): GymRow[] {
  const byGym = new Map<string, { isos: string[]; location: string }>();

  for (const mat of state.openMats) {
    const entry = byGym.get(mat.gymName);
    if (entry) {
      entry.isos.push(mat.dateTimeISO);
    } else {
      byGym.set(mat.gymName, { isos: [mat.dateTimeISO], location: mat.address ?? '' });
    }
  }

  return Array.from(byGym.entries())
    .map(([gymName, { isos, location }]) => {
      const latestISO = isos.reduce((a, b) => (a > b ? a : b));
      return {
        gymName,
        location,
        lastSeenISO: latestISO,
        lastSeenLabel: formatLastSeen(latestISO),
        status: deriveStatus(latestISO),
        matCount: isos.length,
      };
    })
    .sort((a, b) => b.lastSeenISO.localeCompare(a.lastSeenISO));
}

/** Filter gym list by search query and optional status */
export function filterGyms(gyms: GymRow[], search: string, statusFilter: string): GymRow[] {
  const q = search.toLowerCase();
  return gyms.filter(gym => {
    const matchesSearch =
      q === '' ||
      gym.gymName.toLowerCase().includes(q) ||
      gym.location.toLowerCase().includes(q);
    const matchesStatus = statusFilter === '' || gym.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}
