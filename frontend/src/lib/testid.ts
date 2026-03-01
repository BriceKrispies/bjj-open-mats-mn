// ── Test ID Utilities ──
// Pure utilities — zero dependencies. Used by Playwright for reliable element selection.

function normalizePart(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-');
}

/**
 * Derive a scope string from import.meta based on file path.
 * - /pages/<name>.<ext>         → "page:<name>"
 * - /modules/<mod>/             → "mod:<mod>"
 * - /ui/components/<Name>.<ext> → "ui:<name>" (lowercased)
 * - else                        → "src:<filename-no-ext>"
 */
export function testScope(meta: ImportMeta): string {
  let path = meta.url;
  try { path = new URL(meta.url).pathname; } catch { /* use raw */ }
  path = path.replace(/\\/g, '/');

  // Strip .astro suffix that appears when Vite compiles .astro → .astro.mjs
  const stripAstro = (s: string) => s.replace(/\.astro$/, '');

  const pagesMatch = path.match(/\/pages\/([^/]+)\.[^/.]+$/);
  if (pagesMatch) return `page:${normalizePart(stripAstro(pagesMatch[1] ?? ''))}`;

  const modulesMatch = path.match(/\/modules\/([^/]+)\//);
  if (modulesMatch) return `mod:${normalizePart(modulesMatch[1] ?? '')}`;

  const uiMatch = path.match(/\/ui\/components\/([^/]+)\.[^/.]+$/);
  if (uiMatch) return `ui:${normalizePart(stripAstro(uiMatch[1] ?? ''))}`;

  const filename = (path.split('/').pop() ?? path).replace(/\.[^/.]+$/, '');
  return `src:${normalizePart(filename)}`;
}

/** Build a test ID string: scope + optional colon-separated parts. */
export function tid(scope: string, ...parts: string[]): string {
  if (parts.length === 0) return scope;
  return `${scope}:${parts.map(normalizePart).join(':')}`;
}

/** Build a `data-testid` attribute object for spreading onto elements. */
export function testId(scope: string, ...parts: string[]): { 'data-testid': string } {
  return { 'data-testid': tid(scope, ...parts) };
}

/**
 * Shallow-copy props and set `data-testid` if not already present.
 */
export function withTestId<T extends Record<string, unknown>>(
  props: T,
  scope: string,
  ...parts: string[]
): T & { 'data-testid': string } {
  if ('data-testid' in props) return props as T & { 'data-testid': string };
  return { ...props, 'data-testid': tid(scope, ...parts) };
}
