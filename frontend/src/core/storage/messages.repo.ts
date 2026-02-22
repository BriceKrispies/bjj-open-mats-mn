import { Repository } from './repository';

export interface Message {
  id: string;
  type: 'system' | 'user';
  title: string;
  body: string;
  /** ISO-8601 */
  createdAt: string;
  /** ISO-8601; undefined means unread */
  readAt?: string;
}

export const messagesRepo = new Repository<Message>('messages');
