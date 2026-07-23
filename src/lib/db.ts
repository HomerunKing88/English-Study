/**
 * Thin, typed IndexedDB wrapper.
 *
 * Deliberately tiny — no external IndexedDB library — so the persistence layer
 * has zero runtime cost and no supply-chain surface. Every store is keyed by a
 * string `id`. Higher-level repositories (expressions.ts, sessions.ts, …) build
 * on top of these primitives.
 *
 * All methods return Promises and are safe to call only in the browser. During
 * SSR there is no `indexedDB`; callers must guard with `isBrowser()` or run
 * inside effects.
 */

import type {
  Concept,
  Expression,
  ReviewLog,
  Session,
  Settings,
} from './types';

export const DB_NAME = 'english-os';
export const DB_VERSION = 1;

export const STORES = {
  expressions: 'expressions',
  reviewLogs: 'reviewLogs',
  sessions: 'sessions',
  concepts: 'concepts',
  settings: 'settings',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/** Compile-time map from store name to the record type it holds. */
export interface StoreShape {
  expressions: Expression;
  reviewLogs: ReviewLog;
  sessions: Session;
  concepts: Concept;
  settings: Settings;
}

export function isBrowser(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      // Expressions keyed by id; index `due` for the review scheduler and
      // `mastery` for filtered views.
      if (!db.objectStoreNames.contains(STORES.expressions)) {
        const s = db.createObjectStore(STORES.expressions, { keyPath: 'id' });
        s.createIndex('due', 'fsrs.due');
        s.createIndex('mastery', 'mastery');
        s.createIndex('source', 'source');
      }
      if (!db.objectStoreNames.contains(STORES.reviewLogs)) {
        const s = db.createObjectStore(STORES.reviewLogs, { keyPath: 'id' });
        s.createIndex('expressionId', 'expressionId');
        s.createIndex('reviewedAt', 'reviewedAt');
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const s = db.createObjectStore(STORES.sessions, { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains(STORES.concepts)) {
        // Concepts use slug as the natural key.
        const s = db.createObjectStore(STORES.concepts, { keyPath: 'slug' });
        s.createIndex('category', 'category');
        s.createIndex('savedForReview', 'savedForReview');
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });

  return dbPromise;
}

/**
 * For tests: close and forget the cached connection so a fresh fake-indexeddb
 * can be created. Closing is required or `deleteDatabase` stays blocked by the
 * still-open connection.
 */
export async function __resetDbForTests(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // Ignore — the connection may have failed to open.
    }
  }
  dbPromise = null;
}

function tx(
  db: IDBDatabase,
  store: StoreName,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

// ---------------------------------------------------------------------------
// Generic CRUD
// ---------------------------------------------------------------------------

export async function put<K extends StoreName>(
  store: K,
  value: StoreShape[K],
): Promise<StoreShape[K]> {
  const db = await openDb();
  const os = tx(db, store, 'readwrite');
  await promisifyRequest(os.put(value));
  return value;
}

export async function putMany<K extends StoreName>(
  store: K,
  values: StoreShape[K][],
): Promise<void> {
  const db = await openDb();
  const t = db.transaction(store, 'readwrite');
  const os = t.objectStore(store);
  for (const v of values) os.put(v);
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error('Bulk put failed'));
    t.onabort = () => reject(t.error ?? new Error('Bulk put aborted'));
  });
}

export async function get<K extends StoreName>(
  store: K,
  key: string,
): Promise<StoreShape[K] | undefined> {
  const db = await openDb();
  const os = tx(db, store, 'readonly');
  return promisifyRequest(os.get(key) as IDBRequest<StoreShape[K] | undefined>);
}

export async function getAll<K extends StoreName>(
  store: K,
): Promise<StoreShape[K][]> {
  const db = await openDb();
  const os = tx(db, store, 'readonly');
  return promisifyRequest(os.getAll() as IDBRequest<StoreShape[K][]>);
}

export async function remove(store: StoreName, key: string): Promise<void> {
  const db = await openDb();
  const os = tx(db, store, 'readwrite');
  await promisifyRequest(os.delete(key));
}

export async function clear(store: StoreName): Promise<void> {
  const db = await openDb();
  const os = tx(db, store, 'readwrite');
  await promisifyRequest(os.clear());
}

export async function count(store: StoreName): Promise<number> {
  const db = await openDb();
  const os = tx(db, store, 'readonly');
  return promisifyRequest(os.count());
}

export interface ReplaceAllPayload {
  expressions: Expression[];
  reviewLogs: ReviewLog[];
  sessions: Session[];
  concepts: Concept[];
  settings: Settings | null;
}

/**
 * Atomically replace the entire database contents in ONE transaction spanning
 * every store: clear each store, then write the new records. If any operation
 * fails, IndexedDB aborts the whole transaction and rolls back — so the
 * existing data is never left half-deleted. This is the safe primitive behind
 * backup import.
 */
export async function replaceAll(payload: ReplaceAllPayload): Promise<void> {
  const db = await openDb();
  const names: StoreName[] = [
    STORES.expressions,
    STORES.reviewLogs,
    STORES.sessions,
    STORES.concepts,
    STORES.settings,
  ];
  const t = db.transaction(names, 'readwrite');

  const writeStore = <T>(name: StoreName, rows: T[]) => {
    const os = t.objectStore(name);
    os.clear();
    for (const row of rows) os.put(row);
  };

  writeStore(STORES.expressions, payload.expressions);
  writeStore(STORES.reviewLogs, payload.reviewLogs);
  writeStore(STORES.sessions, payload.sessions);
  writeStore(STORES.concepts, payload.concepts);

  const settingsStore = t.objectStore(STORES.settings);
  settingsStore.clear();
  if (payload.settings) settingsStore.put(payload.settings);

  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error('replaceAll failed'));
    t.onabort = () => reject(t.error ?? new Error('replaceAll aborted'));
  });
}
