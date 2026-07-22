import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './__testutils';
import { exportBackup, importBackup, serializeBackup, assertEnvelope } from './backup';
import { getAllExpressions, upsertExpression } from './expressions';
import { captureSession } from './capture';
import type { CorrectionPayload } from './types';

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
