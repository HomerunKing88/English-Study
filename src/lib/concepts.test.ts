import { describe, expect, it } from 'vitest';
import { STATIC_CONCEPTS } from './concepts';
import { buildCard } from './review';
import { deriveMastery } from './mastery';
import { newFsrsState, grade } from './fsrs';

describe('static concept content', () => {
  it('loads and validates against the schema', () => {
    expect(STATIC_CONCEPTS.length).toBeGreaterThanOrEqual(20);
  });

  it('has unique slugs', () => {
    const slugs = STATIC_CONCEPTS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has no dangling related references', () => {
    const slugs = new Set(STATIC_CONCEPTS.map((c) => c.slug));
    for (const c of STATIC_CONCEPTS) {
      for (const r of c.related) {
        expect(slugs.has(r), `${c.slug} -> ${r}`).toBe(true);
      }
    }
  });

  it('has all three definition tiers filled in', () => {
    for (const c of STATIC_CONCEPTS) {
      expect(c.easyDef.length).toBeGreaterThan(0);
      expect(c.standardDef.length).toBeGreaterThan(0);
      expect(c.professionalDef.length).toBeGreaterThan(0);
    }
  });
});

describe('deriveMastery', () => {
  it('is New before any review', () => {
    expect(deriveMastery(newFsrsState(new Date('2026-07-22T00:00:00Z')))).toBe('New');
  });

  it('advances past New after a Good review', () => {
    const s = grade(newFsrsState(new Date('2026-07-22T00:00:00Z')), 'Good');
    expect(deriveMastery(s)).not.toBe('New');
  });
});

describe('buildCard', () => {
  const now = '2026-07-22T00:00:00.000Z';
  const expr = {
    id: '1',
    text: 'run rate',
    meaning: 'annualized pace of revenue',
    examples: ['Our run rate is $10m.'],
    userSentence: null,
    correctedSentence: null,
    naturalSentence: 'Our current run rate is $10m.',
    source: 'manual' as const,
    searchCount: 0,
    usageCount: 0,
    mastery: 'Usable' as const,
    fsrs: newFsrsState(new Date(now)),
    createdAt: now,
    updatedAt: now,
  };

  it('builds a recognition card', () => {
    const card = buildCard(expr, 'Recognition');
    expect(card.prompt).toContain('run rate');
    expect(card.answer).toContain('annualized');
  });

  it('blanks out the phrase for a fill-in-blank card', () => {
    const card = buildCard(expr, 'FillInBlank');
    expect(card.prompt).toContain('_____');
  });

  it('builds a speak-it card that references the phrase', () => {
    const card = buildCard(expr, 'SpeakIt');
    expect(card.cardType).toBe('SpeakIt');
    expect(card.prompt).toContain('run rate');
  });
});
