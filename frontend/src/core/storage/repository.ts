import { storage } from './adapter';

/**
 * Generic CRUD repository backed by the StorageAdapter.
 * All items must have a string `id` field.
 */
export class Repository<T extends { id: string }> {
  private readonly key: string;

  constructor(collectionName: string) {
    this.key = `bjj_${collectionName}`;
  }

  list(): T[] {
    return storage.getItem<T[]>(this.key) ?? [];
  }

  get(id: string): T | undefined {
    return this.list().find((item) => item.id === id);
  }

  /** Upsert — inserts if new, replaces if id already exists. */
  set(item: T): void {
    const items = this.list();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    storage.setItem(this.key, items);
  }

  remove(id: string): void {
    storage.setItem(
      this.key,
      this.list().filter((i) => i.id !== id),
    );
  }

  clear(): void {
    storage.removeItem(this.key);
  }

  count(): number {
    return this.list().length;
  }
}
