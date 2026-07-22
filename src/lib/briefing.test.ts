import { describe, expect, it } from 'vitest';
import { buildCompactBriefing, buildFullBriefing } from './briefing';
import { SCENARIOS, scenarioForDay } from './scenarios';
import { newFsrsState } from './fsrs';
import type { Expression } from './types';

function expr(text: string, meaning: string): Expression {
  const now = '2026-07-22T00:00:00.000Z';
  return {
    id: text,
    text,
    meaning,
    examples: [],
    userSentence: null,
    correctedSentence: null,
    naturalSentence: null,
    source: 'manual',
    searchCount: 0,
    usageCount: 0,
    mastery: 'New',
    fsrs: newFsrsState(new Date(now)),
    createdAt: now,
    updatedAt: now,
  };
}

const scenario = SCENARIOS.find((s) => s.key === 'earnings-call')!;
const base = {
  scenario,
  difficulty: 'Natural' as const,
  targets: [expr('headwind', 'a slowing factor'), expr('tailwind', 'a boosting factor')],
  sessionMinutes: 10,
  koreanHelpEnabled: true,
};

describe('buildFullBriefing', () => {
  it('includes the coaching rules and the JSON contract fence', () => {
    const out = buildFullBriefing(base);
    expect(out).toContain('English only');
    expect(out).toContain('Do NOT correct me mid-conversation');
    expect(out).toContain('```json');
    expect(out).toContain('target_expression_usage');
  });

  it('weaves in the target expressions by text', () => {
    const out = buildFullBriefing(base);
    expect(out).toContain('headwind');
    expect(out).toContain('tailwind');
  });

  it('handles the no-targets-due case gracefully', () => {
    const out = buildFullBriefing({ ...base, targets: [] });
    expect(out).toContain('none due today');
  });

  it('omits Korean help when disabled', () => {
    const out = buildFullBriefing({ ...base, koreanHelpEnabled: false });
    expect(out).toContain('Do not use Korean');
  });
});

describe('buildCompactBriefing', () => {
  it('emits terse parameters for a Custom GPT', () => {
    const out = buildCompactBriefing(base);
    expect(out).toContain('Mode:');
    expect(out).toContain('Difficulty: Natural');
    expect(out).toContain('headwind');
  });
});

describe('scenarioForDay', () => {
  it('is deterministic for a given day', () => {
    expect(scenarioForDay('2026-07-22').key).toBe(scenarioForDay('2026-07-22').key);
  });
  it('always returns a configured scenario', () => {
    expect(SCENARIOS.map((s) => s.key)).toContain(scenarioForDay('2026-01-01').key);
  });
});
