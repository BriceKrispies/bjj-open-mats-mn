// ── Session-persisted Event Log ──
// Backed by sessionStorage so entries survive page navigations within the same tab.

const STORAGE_KEY = 'bjj_event_log_v1';
const MAX_ENTRIES = 500;
const MAX_PREVIEW = 240;

export interface LogEntry {
  id: string;
  ts: string;
  kind: 'action' | 'event' | 'system';
  type: string;
  preview: string;
}

// ── Preview helper ──

export function compactPreview(val: unknown, maxLen = MAX_PREVIEW): string {
  if (val === undefined) return '—';
  if (val === null) return 'null';
  try {
    const seen = new WeakSet<object>();
    const str = JSON.stringify(val, function (_key, v) {
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      if (typeof v === 'string' && v.length > 80) return v.slice(0, 77) + '…';
      if (Array.isArray(v) && v.length > 5) {
        return ([...v.slice(0, 5), `…+${v.length - 5} more`] as unknown[]);
      }
      return v;
    });
    if (!str) return '—';
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
  } catch {
    return '[unserializable]';
  }
}

// ── ID ──

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── sessionStorage I/O ──

export function loadLog(): LogEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: LogEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ── Public API ──

export function getLog(): LogEntry[] {
  return loadLog();
}

export function appendLog(entry: Omit<LogEntry, 'id' | 'ts'> & { ts?: string }): void {
  const entries = loadLog();
  entries.push({
    id: genId(),
    ts: entry.ts ?? new Date().toISOString(),
    kind: entry.kind,
    type: entry.type,
    preview: entry.preview,
  });
  // Cap: keep most recent MAX_ENTRIES
  const capped = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
  saveLog(capped);
}

export function clearLog(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
