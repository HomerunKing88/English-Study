import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './__testutils';
import { captureSession } from './capture';
import { findByText, getAllExpressions, upsertExpression } from './expressions';
import { getAllSessions } from './sessions';
import { getSettings } from './settings';
import type { CorrectionPayload } from './types';

const payload: CorrectionPayload = {
  session: { topic: 'Investor Q&A', mode: 'Scenario Talk', difficulty: 'Challenging' },
  corrections: [
    {
      user_said: 'We will growth revenue',
      corrected: 'We will grow revenue',
      natural: "We're going to drive top-line growth",
      note_en: '"grow" is the verb; "growth" is the noun.',
    },
  ],
  new_expressions: [
    { expression: 'capital allocation', meaning_en: 'how a firm deploys its money', example: 'Our capital allocation favors buybacks.' },
  ],
  target_expression_usage: [{ expression: 'headwind', used_correctly: false }],
  focus_next: 'Distinguish grow vs growth.',
};

beforeEach(resetDb);

describe('captureSession', () => {
  it('saves corrections and new expressions to memory', async () => {
    const res = await captureSession({ payload, transcriptRaw: 'full transcript' });
    expect(res.savedExpressionCount).toBe(2);
    const all = await getAllExpressions();
    const texts = all.map((e) => e.text);
    expect(texts).toContain("We're going to drive top-line growth");
    expect(texts).toContain('capital allocation');
  });

  it('logs a session record with the parsed JSON and transcript', async () => {
    await captureSession({ payload, transcriptRaw: 'raw text', targetExpressionIds: ['x'] });
    const sessions = await getAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.topic).toBe('Investor Q&A');
    expect(sessions[0]!.mode).toBe('ScenarioTalk');
    expect(sessions[0]!.difficulty).toBe('Challenging');
    expect(sessions[0]!.correctionJson).not.toBeNull();
    expect(sessions[0]!.transcriptRaw).toBe('raw text');
  });

  it('applies target-usage feedback to an existing expression via FSRS', async () => {
    const existing = await upsertExpression({ text: 'headwind', meaning: 'a slowing factor', source: 'manual' });
    expect(existing.fsrs.reps).toBe(0);
    const res = await captureSession({ payload });
    expect(res.reviewedTargetCount).toBe(1);
    const after = await findByText('headwind');
    expect(after!.fsrs.reps).toBe(1);
  });

  it('advances the streak', async () => {
    await captureSession({ payload });
    const settings = await getSettings();
    expect(settings.streakCount).toBe(1);
    expect(settings.lastActiveDate).not.toBeNull();
  });
});
