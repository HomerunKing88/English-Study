import { describe, expect, it } from 'vitest';
import { grade, intervalPreview, isDue, newFsrsState } from './fsrs';

describe('fsrs adapter', () => {
  it('creates a fresh state that is due now', () => {
    const now = new Date('2026-07-22T00:00:00Z');
    const s = newFsrsState(now);
    expect(s.reps).toBe(0);
    expect(s.lastReview).toBeNull();
    expect(isDue(s, now)).toBe(true);
  });

  it('advances reps and pushes the due date out on Good', () => {
    const now = new Date('2026-07-22T00:00:00Z');
    const s0 = newFsrsState(now);
    const s1 = grade(s0, 'Good', now);
    expect(s1.reps).toBe(1);
    expect(new Date(s1.due).getTime()).toBeGreaterThan(now.getTime());
    expect(s1.lastReview).not.toBeNull();
  });

  it('schedules Easy further out than Again', () => {
    const now = new Date('2026-07-22T00:00:00Z');
    const s0 = newFsrsState(now);
    const again = grade(s0, 'Again', now);
    const easy = grade(s0, 'Easy', now);
    expect(new Date(easy.due).getTime()).toBeGreaterThan(new Date(again.due).getTime());
  });

  it('produces a human interval preview for each rating', () => {
    const now = new Date('2026-07-22T00:00:00Z');
    const p = intervalPreview(newFsrsState(now), now);
    expect(p.Again).toMatch(/[mhd]$/);
    expect(p.Easy).toMatch(/[mhd]$/);
  });

  it('serializes dates as ISO strings for JSON durability', () => {
    const s = newFsrsState(new Date('2026-07-22T00:00:00Z'));
    expect(typeof s.due).toBe('string');
    expect(() => JSON.parse(JSON.stringify(s))).not.toThrow();
  });
});
