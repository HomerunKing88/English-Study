import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './__testutils';
import {
  getAllExpressions,
  getDueExpressions,
  pickReviewTargets,
  recordReview,
  upsertExpression,
} from './expressions';

beforeEach(resetDb);

describe('expressions repository', () => {
  it('creates a new expression with FSRS state, due immediately', async () => {
    const e = await upsertExpression({ text: 'headwind', meaning: 'a factor that slows growth', source: 'manual' });
    expect(e.id).toBeTruthy();
    expect(e.mastery).toBe('New');
    const due = await getDueExpressions();
    expect(due.map((x) => x.id)).toContain(e.id);
  });

  it('dedupes by normalized text and bumps usage instead of duplicating', async () => {
    await upsertExpression({ text: 'top line', meaning: 'revenue', source: 'session' });
    await upsertExpression({ text: '  Top Line ', meaning: 'total revenue', source: 'session' });
    const all = await getAllExpressions();
    expect(all).toHaveLength(1);
    expect(all[0]!.usageCount).toBe(2);
    expect(all[0]!.meaning).toBe('total revenue');
  });

  it('merges examples without duplicating', async () => {
    await upsertExpression({ text: 'run the numbers', meaning: 'calculate', examples: ['Let me run the numbers.'], source: 'manual' });
    await upsertExpression({ text: 'run the numbers', meaning: 'calculate', examples: ['Let me run the numbers.', 'Run the numbers first.'], source: 'manual' });
    const all = await getAllExpressions();
    expect(all[0]!.examples).toHaveLength(2);
  });

  it('reschedules and re-derives mastery on review', async () => {
    const e = await upsertExpression({ text: 'ballpark', meaning: 'rough estimate', source: 'manual' });
    const before = new Date(e.fsrs.due).getTime();
    const updated = await recordReview(e.id, 'Good');
    expect(updated).toBeDefined();
    expect(new Date(updated!.fsrs.due).getTime()).toBeGreaterThan(before);
    expect(updated!.fsrs.reps).toBe(1);
  });

  it('picks the most-overdue items as review targets, capped at limit', async () => {
    await upsertExpression({ text: 'a', meaning: 'x', source: 'manual' });
    await upsertExpression({ text: 'b', meaning: 'x', source: 'manual' });
    await upsertExpression({ text: 'c', meaning: 'x', source: 'manual' });
    await upsertExpression({ text: 'd', meaning: 'x', source: 'manual' });
    const targets = await pickReviewTargets(3);
    expect(targets).toHaveLength(3);
  });
});
