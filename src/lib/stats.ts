/**
 * Minimal progress stats (§4 Phase 1). Kept deliberately small — the richer
 * "English Brain" dashboard is Phase 2, only meaningful once data accrues.
 */

import { getAllExpressions } from './expressions';
import { getAllReviewLogs, getAllSessions } from './sessions';
import { getSettings } from './settings';
import type { Mastery } from './types';

export interface ProgressStats {
  streak: number;
  sessionsLogged: number;
  expressionsLearned: number;
  reviewsDone: number;
  /** Share of reviews rated Good or Easy. Null when no reviews yet. */
  accuracy: number | null;
  /** Median Speak-it latency in ms, our automaticity proxy. Null if none. */
  medianLatencyMs: number | null;
  masteryBreakdown: Record<Mastery, number>;
}

export async function computeStats(): Promise<ProgressStats> {
  const [expressions, logs, sessions, settings] = await Promise.all([
    getAllExpressions(),
    getAllReviewLogs(),
    getAllSessions(),
    getSettings(),
  ]);

  const masteryBreakdown: Record<Mastery, number> = {
    New: 0,
    Learning: 0,
    Usable: 0,
    Fluent: 0,
    Forgotten: 0,
  };
  for (const e of expressions) masteryBreakdown[e.mastery]++;

  const graded = logs.filter((l) => l.rating === 'Good' || l.rating === 'Easy');
  const accuracy = logs.length > 0 ? graded.length / logs.length : null;

  const latencies = logs
    .map((l) => l.latencyMs)
    .filter((x): x is number => typeof x === 'number' && x >= 0)
    .sort((a, b) => a - b);
  const medianLatencyMs =
    latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)]! : null;

  return {
    streak: settings.streakCount,
    sessionsLogged: sessions.length,
    expressionsLearned: expressions.length,
    reviewsDone: logs.length,
    accuracy,
    medianLatencyMs,
    masteryBreakdown,
  };
}
