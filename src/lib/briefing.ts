/**
 * Today briefing generator (§2 step 1).
 *
 * Produces the copy-paste text that configures a ChatGPT Voice session:
 * scenario + difficulty + the review-due expressions to weave in (the compound
 * step), wrapped in the standing coaching rules and the closing JSON contract.
 *
 * Two output modes:
 *   - `full`   : the entire briefing, for a plain ChatGPT chat.
 *   - `compact`: just the session parameters, for use inside a Custom GPT that
 *                already holds the standing instructions (friction budget, §2).
 */

import type { Difficulty, Expression, SessionMode } from './types';

/**
 * Learning track. The primary goal is everyday conversational fluency; finance
 * and business English is a deliberate, separate track studied at its own time.
 */
export type Track = 'everyday' | 'finance';

export interface BriefingScenario {
  /** Short id used for the topic label. */
  key: string;
  title: string;
  /** One-line setup ChatGPT uses to frame the roleplay. */
  prompt: string;
  mode: SessionMode;
  /** Which learning track this scenario belongs to. */
  track: Track;
}

export interface BriefingInput {
  scenario: BriefingScenario;
  difficulty: Difficulty;
  targets: Expression[];
  sessionMinutes: number;
  koreanHelpEnabled: boolean;
}

const DIFFICULTY_GUIDANCE: Record<Track, Record<Difficulty, string>> = {
  everyday: {
    Comfortable:
      'Speak slowly and simply. Use common everyday vocabulary. Rephrase if I hesitate.',
    Natural:
      'Speak at a normal native pace with natural, casual everyday vocabulary.',
    Challenging:
      'Speak quickly with rich, idiomatic native expressions and slang. Push me.',
  },
  finance: {
    Comfortable:
      'Speak slowly and simply. Use common business vocabulary. Rephrase if I hesitate.',
    Natural:
      'Speak at a normal native pace with everyday business vocabulary.',
    Challenging:
      'Speak quickly with rich, idiomatic, executive-level vocabulary. Push me.',
  },
};

const TRACK_FRAMING: Record<Track, string> = {
  everyday:
    'FOCUS: everyday conversational fluency. Keep it natural and casual, like talking with a friend.',
  finance:
    'FOCUS: finance & business English for meetings, calls, and investor discussions.',
};

/** Short human label for a track, used in compact parameter lines. */
const TRACK_LABEL: Record<Track, string> = {
  everyday: 'Everyday',
  finance: 'Finance & Business',
};

/** The standing coaching rules shared by the full briefing and the Custom GPT
 * instructions. Kept in one place so the two never drift apart. */
function coachingRules(koreanHelpEnabled: boolean): string[] {
  return [
    'English only. Never switch to Korean during the conversation.',
    'Do NOT correct me mid-conversation — let the ideas flow.',
    'Ask follow-up questions so I keep speaking; I should talk ~70% of the time.',
    koreanHelpEnabled
      ? 'Only if I explicitly say "help in Korean", give a one-line Korean hint, then return to English.'
      : 'Do not use Korean at all.',
  ];
}

const MODE_LABEL: Record<SessionMode, string> = {
  JustTalk: 'Just Talk',
  TopicTalk: 'Topic Talk',
  ScenarioTalk: 'Scenario Talk',
  ChallengeTalk: 'Challenge Talk',
};

/** The exact JSON contract (§7) ChatGPT must emit at the end of the session. */
export const CONTRACT_TEMPLATE = `{
  "session": { "topic": "...", "mode": "...", "difficulty": "..." },
  "corrections": [
    { "user_said": "...", "corrected": "...", "natural": "...", "note_en": "one-line explanation in easy English" }
  ],
  "new_expressions": [
    { "expression": "...", "meaning_en": "...", "example": "..." }
  ],
  "target_expression_usage": [
    { "expression": "...", "used_correctly": true }
  ],
  "focus_next": "one sentence"
}`;

function targetLines(targets: Expression[]): string {
  if (targets.length === 0) {
    return '(none due today — introduce fresh useful phrases instead)';
  }
  return targets.map((t) => `- "${t.text}" — ${t.meaning}`).join('\n');
}

export function buildFullBriefing(input: BriefingInput): string {
  const { scenario, difficulty, targets, sessionMinutes, koreanHelpEnabled } = input;

  const rules = coachingRules(koreanHelpEnabled);

  return [
    `You are my English speaking coach. This is a ${sessionMinutes}-minute ${MODE_LABEL[scenario.mode]} voice session.`,
    '',
    TRACK_FRAMING[scenario.track],
    '',
    `TOPIC / SCENARIO: ${scenario.title}`,
    scenario.prompt,
    '',
    `DIFFICULTY: ${difficulty}. ${DIFFICULTY_GUIDANCE[scenario.track][difficulty]}`,
    '',
    'WEAVE THESE EXPRESSIONS IN naturally (these are my spaced-review items — create situations where I would use them):',
    targetLines(targets),
    '',
    'RULES DURING THE SESSION:',
    ...rules.map((r) => `- ${r}`),
    '',
    'AT THE VERY END of the session, output EXACTLY ONE fenced JSON code block',
    'in this shape and nothing after it:',
    '```json',
    CONTRACT_TEMPLATE,
    '```',
    '',
    'Fill target_expression_usage with each weaved expression and whether I used it correctly.',
    'Keep note_en explanations in easy English. Begin the conversation now.',
  ].join('\n');
}

/** Compact parameters for a Custom GPT that already holds the standing rules. */
export function buildCompactBriefing(input: BriefingInput): string {
  const { scenario, difficulty, targets, sessionMinutes } = input;
  const targetsInline =
    targets.length > 0 ? targets.map((t) => `"${t.text}"`).join(', ') : 'none due';
  return [
    `Track: ${TRACK_LABEL[scenario.track]}`,
    `Mode: ${MODE_LABEL[scenario.mode]}`,
    `Topic: ${scenario.title}`,
    `Difficulty: ${difficulty}`,
    `Minutes: ${sessionMinutes}`,
    `Review targets: ${targetsInline}`,
  ].join('\n');
}

/**
 * The one-time "standing instructions" a learner pastes into a ChatGPT Custom
 * GPT's Instructions field. It holds everything that does NOT change day to day
 * — the coaching rules and the closing JSON contract — so that each day only a
 * short compact parameter block (buildCompactBriefing) needs to be sent.
 *
 * This is the friction-budget lever from §2: set up once, then daily effort
 * drops to a couple of lines (which can even be spoken aloud to the GPT).
 */
export function buildStandingInstructions(opts: { koreanHelpEnabled: boolean }): string {
  const rules = coachingRules(opts.koreanHelpEnabled);
  return [
    'You are my personal English speaking coach. We do short spoken practice',
    'sessions (about 10 minutes each). The overall goal is everyday',
    'conversational fluency first, and finance/business English second.',
    '',
    'STANDING RULES — always apply, every session:',
    ...rules.map((r) => `- ${r}`),
    '',
    'AT THE START of each session I will give you the parameters in this form:',
    '  Track: Everyday | Finance & Business',
    '  Mode: Just Talk | Topic Talk | Scenario Talk | Challenge Talk',
    '  Topic: <the scenario>',
    '  Difficulty: Comfortable | Natural | Challenging',
    '  Minutes: <length>',
    '  Review targets: "phrase one", "phrase two", ...',
    'Use them to frame the roleplay and set your pace. Create natural situations',
    'where I would use each review target. If review targets say "none due",',
    'introduce a few fresh, useful phrases instead.',
    '',
    'AT THE VERY END of the session, output EXACTLY ONE fenced JSON code block',
    'in this shape and nothing after it:',
    '```json',
    CONTRACT_TEMPLATE,
    '```',
    'Fill target_expression_usage with each weaved expression and whether I used',
    'it correctly. Keep note_en explanations in easy English.',
  ].join('\n');
}
