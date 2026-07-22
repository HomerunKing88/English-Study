/**
 * Stable, dependency-free id + timestamp helpers.
 *
 * We avoid importing a uuid package to keep the bundle lean. `crypto.randomUUID`
 * is available in all target browsers and in Node 22 (tests). A fallback keeps
 * the code resilient in exotic runtimes.
 */

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // Fallback: timestamp + random. Not cryptographically strong, but unique
  // enough for a single-user local store.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar day as YYYY-MM-DD (used for streaks and session dates). */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
