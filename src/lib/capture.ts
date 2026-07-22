/**
 * Capture — turn a validated ChatGPT contract payload into durable memory.
 *
 * This is step 3 of the core loop (§2). Given the parsed payload (and the
 * briefing's target expression ids), it:
 *   - saves each correction and new expression to My Expressions (dedup by text)
 *   - logs the session with the raw transcript + parsed JSON
 *   - applies target_expression_usage to the FSRS schedule of injected targets
 *   - advances the streak
 */

import { recordReview, findByText, upsertExpression } from './expressions';
import { createSession } from './sessions';
import { markActiveToday } from './settings';
import type {
  CorrectionPayload,
  Difficulty,
  Session,
  SessionMode,
} from './types';

const MODE_MAP: Record<string, SessionMode> = {
  justtalk: 'JustTalk',
  'just talk': 'JustTalk',
  topictalk: 'TopicTalk',
  'topic talk': 'TopicTalk',
  scenariotalk: 'ScenarioTalk',
  'scenario talk': 'ScenarioTalk',
  challengetalk: 'ChallengeTalk',
  'challenge talk': 'ChallengeTalk',
};

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  comfortable: 'Comfortable',
  natural: 'Natural',
  challenging: 'Challenging',
};

function coerceMode(raw: string): SessionMode {
  return MODE_MAP[raw.trim().toLowerCase()] ?? 'TopicTalk';
}

function coerceDifficulty(raw: string): Difficulty {
  return DIFFICULTY_MAP[raw.trim().toLowerCase()] ?? 'Natural';
}

export interface CaptureInput {
  payload: CorrectionPayload;
  transcriptRaw?: string | null;
  /** Expression ids that were injected into the briefing as review targets. */
  targetExpressionIds?: string[];
  durationMin?: number | null;
}

export interface CaptureResult {
  session: Session;
  savedExpressionCount: number;
  reviewedTargetCount: number;
}

export async function captureSession(input: CaptureInput): Promise<CaptureResult> {
  const { payload } = input;
  let savedExpressionCount = 0;

  // 1. Corrections → expressions. The corrected/natural sentences are the
  //    valuable artifact; the expression text is the natural phrasing.
  for (const c of payload.corrections) {
    await upsertExpression({
      text: c.natural || c.corrected,
      meaning: c.note_en,
      examples: [c.natural].filter(Boolean),
      userSentence: c.user_said,
      correctedSentence: c.corrected,
      naturalSentence: c.natural,
      source: 'session',
    });
    savedExpressionCount++;
  }

  // 2. New expressions surfaced during the conversation.
  for (const e of payload.new_expressions) {
    await upsertExpression({
      text: e.expression,
      meaning: e.meaning_en,
      examples: [e.example].filter(Boolean),
      source: 'session',
    });
    savedExpressionCount++;
  }

  // 3. Apply target-usage feedback to FSRS. Used correctly → Good; missed → Hard
  //    (kept in rotation rather than reset to Again, which would be punishing).
  let reviewedTargetCount = 0;
  for (const usage of payload.target_expression_usage) {
    const expr = await findByText(usage.expression);
    if (!expr) continue;
    await recordReview(expr.id, usage.used_correctly ? 'Good' : 'Hard');
    reviewedTargetCount++;
  }

  // 4. Persist the session record.
  const session = await createSession({
    mode: coerceMode(payload.session.mode),
    topic: payload.session.topic,
    difficulty: coerceDifficulty(payload.session.difficulty),
    targetExpressionIds: input.targetExpressionIds ?? [],
    transcriptRaw: input.transcriptRaw ?? null,
    correctionJson: payload,
    durationMin: input.durationMin ?? null,
    notes: payload.focus_next ? `Focus next: ${payload.focus_next}` : null,
  });

  // 5. Streak.
  await markActiveToday();

  return { session, savedExpressionCount, reviewedTargetCount };
}
