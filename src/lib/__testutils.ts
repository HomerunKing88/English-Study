import { DB_NAME, __resetDbForTests } from './db';

/** Wipe the fake IndexedDB between tests so each starts from a clean store. */
export async function resetDb(): Promise<void> {
  await __resetDbForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
