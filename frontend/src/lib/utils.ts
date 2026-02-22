// ─────────────────────────────────────────────────────────────────────────────
// Date / time helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function isTomorrow(iso: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(iso).toDateString() === tomorrow.toDateString();
}

export function dayLabel(iso: string): string {
  if (isToday(iso)) return 'Today';
  if (isTomorrow(iso)) return 'Tomorrow';
  return formatDate(iso);
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ID generation
// ─────────────────────────────────────────────────────────────────────────────

export function uid(): string {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────────────────────────────────────

export function clsx(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function plural(n: number, singular: string, pluralWord?: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralWord ?? singular + 's'}`;
}
