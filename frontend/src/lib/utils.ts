// ── Pure Utilities ──

/** Generate a short unique id */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Truncate string with ellipsis */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** Compact JSON preview (single line, truncated) */
export function compactJson(val: unknown, max = 80): string {
  try {
    const s = JSON.stringify(val);
    return truncate(s ?? 'undefined', max);
  } catch {
    return '[unserializable]';
  }
}
