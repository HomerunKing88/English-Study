import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './__testutils';
import { exportBackup, importBackup, serializeBackup, assertEnvelope } from './backup';
import { getAllExpressions, upsertExpression } from './expressions';
import { getAllSessions } from './sessions';
import { captureSession } from './capture';
import type { BackupEnvelope, CorrectionPayload } from './types';

const payload: CorrectionPayload = {
  session: { topic: 'T', mode: 'Topic Talk', difficulty: 'Natural' },
  corrections: [],
  new_expressions: [{ expression: 'run rate', meaning_en: 'annualized pace', example: 'Our run rate is $10m.' }],
  target_expression_usage: [],
  focus_next: 'x',
};

beforeEach(resetDb);

describe('backup export/import', () => {
  it('round-trips all data losslessly', async () => {
    await upsertExpression({ text: 'liquidity', meaning: 'ease of trading', source: 'manual' });
    await captureSession({ payload });

    const before = await exportBackup();
    const json = serializeBackup(before);

    // Wipe and re-import.
    await resetDb();
    expect(await getAllExpressions()).toHaveLength(0);

    const result = await importBackup(json);
    expect(result.expressions).toBe(before.data.expressions.length);
    expect(result.sessions).toBe(1);

    const after = await exportBackup();
    expect(after.data.expressions).toHaveLength(before.data.expressions.length);
    expect(after.data.sessions).toHaveLength(before.data.sessions.length);
  });

  it('rejects a non-English-OS file', () => {
    expect(() => assertEnvelope({ app: 'something-else' })).toThrow(/not an English OS backup/);
  });

  it('rejects a newer backup version', () => {
    expect(() =>
      assertEnvelope({ app: 'english-os', version: 999, data: { expressions: [], reviewLogs: [], sessions: [], concepts: [] } }),
    ).toThrow(/newer than this app supports/);
  });

  it('rejects malformed JSON on import', async () => {
    await expect(importBackup('{ not json')).rejects.toThrow(/not valid JSON/);
  });

  it('accepts a valid minimal envelope', () => {
    expect(() =>
      assertEnvelope({
        app: 'english-os',
        version: 1,
        exportedAt: '2026-07-22T00:00:00.000Z',
        data: { expressions: [], reviewLogs: [], sessions: [], concepts: [], settings: null },
      }),
    ).not.toThrow();
  });
});

describe('importBackup — record-level validation & data preservation', () => {
  async function seedAndExport(): Promise<BackupEnvelope> {
    await upsertExpression({ text: 'liquidity', meaning: 'ease of trading', source: 'manual' });
    await captureSession({ payload });
    return exportBackup();
  }

  it('rejects a backup whose arrays are valid but a record is broken', async () => {
    const good = await seedAndExport();
    // Structurally an array (passes assertEnvelope) but the record is missing
    // required fields like `fsrs`, `text`, etc.
    const corrupt = {
      ...good,
      data: { ...good.data, expressions: [{ id: 'x' }] },
    };
    await expect(importBackup(JSON.stringify(corrupt))).rejects.toThrow(
      /validation failed/i,
    );
  });

  it('leaves existing data completely intact when import fails validation', async () => {
    const good = await seedAndExport();
    const beforeExprs = await getAllExpressions();
    const beforeSessions = await getAllSessions();
    expect(beforeExprs.length).toBeGreaterThan(0);

    const corrupt = {
      ...good,
      data: {
        ...good.data,
        reviewLogs: [{ id: 'r1', rating: 'NotARating' }], // invalid enum + missing fields
      },
    };
    await expect(importBackup(JSON.stringify(corrupt))).rejects.toThrow();

    // The pre-existing data must survive untouched.
    const afterExprs = await getAllExpressions();
    const afterSessions = await getAllSessions();
    expect(afterExprs).toHaveLength(beforeExprs.length);
    expect(afterSessions).toHaveLength(beforeSessions.length);
    expect(afterExprs.map((e) => e.id).sort()).toEqual(beforeExprs.map((e) => e.id).sort());
  });

  it('surfaces a message that no data was changed', async () => {
    const good = await seedAndExport();
    const corrupt = { ...good, data: { ...good.data, sessions: [{ id: 'bad' }] } };
    await expect(importBackup(JSON.stringify(corrupt))).rejects.toThrow(
      /No data was changed/i,
    );
  });

  it('still accepts a fully valid exported backup', async () => {
    const good = await seedAndExport();
    await resetDb();
    const res = await importBackup(serializeBackup(good));
    expect(res.expressions).toBe(good.data.expressions.length);
  });
});
