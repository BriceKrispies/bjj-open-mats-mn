import { Repository } from './repository';

export interface Rsvp {
  id: string;
  openMatId: string;
  status: 'going' | 'not_going';
  /** ISO-8601 */
  createdAt: string;
}

export const rsvpsRepo = new Repository<Rsvp>('rsvps');
