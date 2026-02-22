// ── Dev View Model ──

import type { LogEntry } from '../../core/eventLog';

export interface DevLogRow {
  id: string;
  ts: string;
  timeFormatted: string;
  kind: 'action' | 'event' | 'system';
  type: string;
  preview: string;
}

export function formatLogEntries(entries: readonly LogEntry[]): DevLogRow[] {
  return [...entries].reverse().map(e => ({
    id: e.id,
    ts: e.ts,
    timeFormatted: formatTs(e.ts),
    kind: e.kind,
    type: e.type,
    preview: e.preview,
  }));
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}
