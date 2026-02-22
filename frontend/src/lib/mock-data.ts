import type { OpenMat } from '../core/storage/openMats.repo';
import { uid } from './utils';

function at(daysOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function generateMockOpenMats(): OpenMat[] {
  return [
    {
      id: uid(),
      gymName: 'Triangle BJJ',
      dateTime: at(0, 18, 0),
      address: '123 Main St, Durham, NC 27701',
      notes: 'All levels welcome! Bring gi and no-gi gear. Water provided.',
      capacity: 20,
    },
    {
      id: uid(),
      gymName: 'Gracie Barra Chapel Hill',
      dateTime: at(0, 11, 0),
      address: '456 Franklin St, Chapel Hill, NC 27514',
      notes: 'No-gi only today. Beginners especially encouraged to attend!',
      capacity: 15,
    },
    {
      id: uid(),
      gymName: 'Raleigh Grappling Club',
      dateTime: at(1, 9, 30),
      address: '789 Hillsborough St, Raleigh, NC 27603',
      notes: 'Open mat after Saturday fundamentals class. Free for members.',
    },
    {
      id: uid(),
      gymName: 'Duke BJJ',
      dateTime: at(2, 16, 0),
      address: '321 Campus Dr, Durham, NC 27708',
      notes: 'Student and alumni open mat. All are welcome.',
      capacity: 30,
    },
    {
      id: uid(),
      gymName: 'Submission Lab',
      dateTime: at(3, 18, 30),
      address: '654 Tobacco Rd, Durham, NC 27704',
      notes: 'Advanced training session. Blue belt and above preferred.',
      capacity: 12,
    },
    {
      id: uid(),
      gymName: 'Chapel Hill Judo & BJJ',
      dateTime: at(4, 10, 0),
      address: '99 Estes Dr, Chapel Hill, NC 27514',
      notes: 'Combined judo + BJJ open mat. Rashguard required.',
    },
  ];
}

export function seedIfEmpty(repo: { count(): number; set(item: OpenMat): void }): {
  seeded: boolean;
  count: number;
} {
  if (repo.count() > 0) return { seeded: false, count: repo.count() };
  const mats = generateMockOpenMats();
  mats.forEach((m) => repo.set(m));
  return { seeded: true, count: mats.length };
}
