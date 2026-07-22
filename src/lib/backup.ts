/**
 * JSON export / import — a launch blocker, not a nice-to-have (§6). Personal
 * learning history is the asset (Principle 3); the learner must always be able
 * to get all of it out of the browser and back in.
 *
 * Export gathers every store into a versioned envelope. Import validates the
 * envelope shape, then replaces local data. We favour explicit, total
 * replacement over a fuzzy merge so the result is predictable.
 */

import * as db from './db';
import { nowIso } from './id';
import { BACKUP_VERSION, type BackupEnvelope } from './types';

export async function exportBackup(): Promise<BackupEnvelope> {
  const [expressions, reviewLogs, sessions, concepts, settingsRows] = await Promise.all([
    db.getAll('expressions'),
    db.getAll('reviewLogs'),
    db.getAll('sessions'),
    db.getAll('concepts'),
    db.getAll('settings'),
  ]);

  return {
    app: 'english-os',
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    data: {
      expressions,
      reviewLogs,
      sessions,
      concepts,
      settings: settingsRows[0] ?? null,
    },
  };
}

export function serializeBackup(envelope: BackupEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

export interface ImportResult {
  expressions: number;
  reviewLogs: number;
  sessions: number;
  concepts: number;
  settings: number;
}

/**
 * Validate a parsed object as a BackupEnvelope. Throws a descriptive Error on
 * failure so the UI can surface exactly what was wrong (never lose data
 * silently). Intentionally structural — we do not re-run the full zod schemas
 * here, but we do refuse anything that is not our envelope or a future version.
 */
export function assertEnvelope(value: unknown): asserts value is BackupEnvelope {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Backup is not a JSON object.');
  }
  const v = value as Record<string, unknown>;
  if (v.app !== 'english-os') {
    throw new Error('This file is not an English OS backup.');
  }
  if (typeof v.version !== 'number') {
    throw new Error('Backup is missing a version number.');
  }
  if (v.version > BACKUP_VERSION) {
    throw new Error(
      `Backup version ${v.version} is newer than this app supports (${BACKUP_VERSION}). Update the app first.`,
    );
  }
  if (typeof v.data !== 'object' || v.data === null) {
    throw new Error('Backup has no data section.');
  }
  const d = v.data as Record<string, unknown>;
  for (const key of ['expressions', 'reviewLogs', 'sessions', 'concepts'] as const) {
    if (!Array.isArray(d[key])) {
      throw new Error(`Backup data.${key} must be an array.`);
    }
  }
}

/**
 * Replace all local data with the contents of an envelope. Existing stores are
 * cleared first so the result exactly matches the backup.
 */
export async function importBackup(raw: string): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Backup is not valid JSON.');
  }
  assertEnvelope(parsed);
  const { data } = parsed;

  await Promise.all([
    db.clear('expressions'),
    db.clear('reviewLogs'),
    db.clear('sessions'),
    db.clear('concepts'),
    db.clear('settings'),
  ]);

  await Promise.all([
    db.putMany('expressions', data.expressions),
    db.putMany('reviewLogs', data.reviewLogs),
    db.putMany('sessions', data.sessions),
    db.putMany('concepts', data.concepts),
    data.settings ? db.putMany('settings', [data.settings]) : Promise.resolve(),
  ]);

  return {
    expressions: data.expressions.length,
    reviewLogs: data.reviewLogs.length,
    sessions: data.sessions.length,
    concepts: data.concepts.length,
    settings: data.settings ? 1 : 0,
  };
}

/** Trigger a browser download of the current backup. Browser-only. */
export async function downloadBackup(): Promise<void> {
  const envelope = await exportBackup();
  const blob = new Blob([serializeBackup(envelope)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = envelope.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `english-os-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
