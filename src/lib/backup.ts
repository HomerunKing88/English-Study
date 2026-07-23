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
import { backupEnvelopeSchema } from './schemas';
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
 * Replace all local data with the contents of an envelope.
 *
 * Safety contract (Principle 3 — never lose learning history):
 *   1. Every record is validated with zod BEFORE any existing data is touched.
 *      On any failure we throw and the current data is left completely intact.
 *   2. The actual clear-and-rewrite runs in a single IndexedDB transaction
 *      (`db.replaceAll`), so even an unexpected mid-write error rolls back
 *      rather than leaving the store half-deleted.
 */
export async function importBackup(raw: string): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Backup is not valid JSON.');
  }

  // Friendly, structural first pass (nice messages for the common cases:
  // wrong app, too-new version, missing arrays).
  assertEnvelope(parsed);

  // Full record-level validation. Nothing below this line mutates the database,
  // so a structurally-valid-but-corrupt file is rejected with data untouched.
  const result = backupEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join('.') || 'data';
    const why = first?.message ?? 'invalid';
    throw new Error(
      `Backup validation failed at "${where}": ${why}. No data was changed.`,
    );
  }

  const { data } = result.data;
  await db.replaceAll({
    expressions: data.expressions,
    reviewLogs: data.reviewLogs,
    sessions: data.sessions,
    concepts: data.concepts,
    settings: data.settings,
  });

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
