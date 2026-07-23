import { describe, expect, it } from 'vitest';
import {
  buildCompactBriefing,
  buildFullBriefing,
  buildStandingInstructions,
} from './briefing';
import { SCENARIOS, scenariosByTrack, scenarioForDay } from './scenarios';
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

  it('includes the track line', () => {
    const out = buildCompactBriefing(base);
    // base uses the earnings-call (finance) scenario.
    expect(out).toContain('Track: Finance & Business');
  });
});

describe('buildStandingInstructions', () => {
  it('holds the coaching rules and the JSON contract', () => {
    const out = buildStandingInstructions({ koreanHelpEnabled: true });
    expect(out).toContain('English only');
    expect(out).toContain('Do NOT correct me mid-conversation');
    expect(out).toContain('```json');
    expect(out).toContain('target_expression_usage');
  });

  it('explains the per-session parameter block it will receive', () => {
    const out = buildStandingInstructions({ koreanHelpEnabled: true });
    expect(out).toContain('Track:');
    expect(out).toContain('Review targets:');
  });

  it('respects the Korean-help preference', () => {
    expect(buildStandingInstructions({ koreanHelpEnabled: false })).toContain(
      'Do not use Korean',
    );
    expect(buildStandingInstructions({ koreanHelpEnabled: true })).toContain(
      'help in Korean',
    );
  });

  it('does not contain a specific day\'s topic (it is standing, not daily)', () => {
    const out = buildStandingInstructions({ koreanHelpEnabled: true });
    expect(out).not.toContain('Earnings call');
  });
});

describe('scenarioForDay', () => {
  it('is deterministic for a given day', () => {
    expect(scenarioForDay('2026-07-22').key).toBe(scenarioForDay('2026-07-22').key);
  });
  it('always returns a configured scenario', () => {
    expect(SCENARIOS.map((s) => s.key)).toContain(scenarioForDay('2026-01-01').key);
  });
  it('features an everyday scenario by default (the primary goal)', () => {
    expect(scenarioForDay('2026-01-01').track).toBe('everyday');
  });
});

describe('tracks', () => {
  it('splits scenarios into everyday and finance', () => {
    const everyday = scenariosByTrack('everyday');
    const finance = scenariosByTrack('finance');
    expect(everyday.length).toBeGreaterThan(0);
    expect(finance.length).toBeGreaterThan(0);
    expect(everyday.length + finance.length).toBe(SCENARIOS.length);
  });

  it('prioritizes everyday with the larger scenario set', () => {
    expect(scenariosByTrack('everyday').length).toBeGreaterThanOrEqual(
      scenariosByTrack('finance').length,
    );
  });

  it('frames an everyday briefing around conversational fluency', () => {
    const scenario = scenariosByTrack('everyday')[0]!;
    const out = buildFullBriefing({ ...base, scenario });
    expect(out).toContain('everyday conversational fluency');
  });

  it('frames a finance briefing around business English', () => {
    const out = buildFullBriefing(base); // base uses the earnings-call (finance) scenario
    expect(out).toContain('finance & business English');
  });
});
