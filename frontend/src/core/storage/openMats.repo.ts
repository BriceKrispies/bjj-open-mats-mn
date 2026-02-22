import { Repository } from './repository';

export interface OpenMat {
  id: string;
  gymName: string;
  /** ISO-8601 date-time string */
  dateTime: string;
  address?: string;
  notes?: string;
  /** Max number of attendees, undefined means unlimited */
  capacity?: number;
}

export const openMatsRepo = new Repository<OpenMat>('openMats');
