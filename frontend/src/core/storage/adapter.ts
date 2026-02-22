/**
 * StorageAdapter abstracts the persistence mechanism behind a simple
 * key/value interface.  The concrete implementation uses localStorage,
 * but swapping to IndexedDB later only requires changing this file.
 */
export interface StorageAdapter {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  /** Clears every key that belongs to this app (prefixed with "bjj_"). */
  clearAll(): void;
}

class LocalStorageAdapter implements StorageAdapter {
  getItem<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[Storage] write failed:', e);
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clearAll(): void {
    const appKeys = Object.keys(localStorage).filter((k) => k.startsWith('bjj_'));
    appKeys.forEach((k) => localStorage.removeItem(k));
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();
