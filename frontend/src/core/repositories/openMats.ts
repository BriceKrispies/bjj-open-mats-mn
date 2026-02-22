// ── Open Mats Repository ──

import type { OpenMat } from '../state';
import { saveKey } from '../persistence';
import { appendLog } from '../eventLog';

let idCounter = 0;
function matId(): string {
  return `mat_${Date.now()}_${++idCounter}`;
}

/** Generate seed data spanning the current week + a few adjacent days */
export function seedOpenMats(): OpenMat[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  function d(dayOffset: number, hour: number, min = 0): string {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + dayOffset);
    dt.setHours(hour, min, 0, 0);
    return dt.toISOString();
  }

  const mats: OpenMat[] = [
    // Monday
    { id: matId(), gymName: 'Alliance BJJ', dateTimeISO: d(0, 6, 30), address: '120 Main St', notes: 'Gi only, all levels', capacity: 30 },
    { id: matId(), gymName: 'Gracie Barra Downtown', dateTimeISO: d(0, 18, 0), address: '45 Oak Ave', notes: 'No-gi welcome' },
    // Tuesday
    { id: matId(), gymName: '10th Planet', dateTimeISO: d(1, 12, 0), address: '88 Vine Blvd', notes: 'No-gi only', capacity: 20 },
    { id: matId(), gymName: 'Atos HQ', dateTimeISO: d(1, 19, 0), address: '300 Pacific Dr', notes: 'Competition prep, advanced' },
    // Wednesday
    { id: matId(), gymName: 'Alliance BJJ', dateTimeISO: d(2, 6, 30), address: '120 Main St', notes: 'Gi only, all levels', capacity: 30 },
    { id: matId(), gymName: 'CheckMat', dateTimeISO: d(2, 17, 30), address: '9 Pine Rd', notes: 'All levels, gi & no-gi' },
    // Thursday
    { id: matId(), gymName: 'Unity BJJ', dateTimeISO: d(3, 11, 0), address: '500 2nd Ave', notes: 'Open roll, any rank', capacity: 25 },
    { id: matId(), gymName: 'Marcelo Garcia Academy', dateTimeISO: d(3, 19, 30), address: '15 W 36th St', notes: 'Gi & no-gi, bring mouthguard' },
    // Friday
    { id: matId(), gymName: 'Renzo Gracie', dateTimeISO: d(4, 7, 0), address: '224 W 30th St', notes: 'Morning open mat', capacity: 40 },
    { id: matId(), gymName: 'Gracie Barra Downtown', dateTimeISO: d(4, 18, 0), address: '45 Oak Ave', notes: 'Friday rolls' },
    // Saturday
    { id: matId(), gymName: 'Alliance BJJ', dateTimeISO: d(5, 10, 0), address: '120 Main St', notes: 'Weekend open mat, all levels', capacity: 35 },
    { id: matId(), gymName: '10th Planet', dateTimeISO: d(5, 14, 0), address: '88 Vine Blvd', notes: 'No-gi only', capacity: 20 },
    // Sunday
    { id: matId(), gymName: 'Atos HQ', dateTimeISO: d(6, 9, 0), address: '300 Pacific Dr', notes: 'Sunday open mat' },
    // Adjacent days
    { id: matId(), gymName: 'CheckMat', dateTimeISO: d(-1, 15, 0), address: '9 Pine Rd', notes: 'Last Sunday leftovers' },
    { id: matId(), gymName: 'Unity BJJ', dateTimeISO: d(7, 11, 0), address: '500 2nd Ave', notes: 'Next Monday preview' },
  ];

  saveKey('openMats', mats);
  appendLog({ kind: 'system', type: 'data/seeded', preview: `count=${mats.length}` });
  return mats;
}
