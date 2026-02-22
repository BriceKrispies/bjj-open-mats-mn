// ── localStorage Adapter ──

const NS = 'bjj_openmats_';

export function loadKey<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveKey<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // storage full — silently ignore
  }
}

export function removeKey(key: string): void {
  localStorage.removeItem(NS + key);
}

export function clearAll(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(NS)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
