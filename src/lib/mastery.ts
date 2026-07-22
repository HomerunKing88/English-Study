/**
 * Mastery derivation.
 *
 * The learner-facing mastery ladder (New → Learning → Usable → Fluent, plus
 * Forgotten) is derived from the underlying FSRS numbers so it always reflects
 * real recall strength rather than a hand-set label. Stability (days the memory
 * is expected to survive) is the primary signal; lapses demote to Forgotten.
 */

import type { FsrsState, Mastery } from './types';

export function deriveMastery(state: FsrsState): Mastery {
  // State 0 = New in FSRS: never reviewed.
  if (state.reps === 0) return 'New';

  // A recent lapse (rated Again after being learned) means it slipped.
  // FSRS state 3 = Relearning.
  if (state.state === 3) return 'Forgotten';

  // Stability thresholds (in days). Tuned for a daily-practice cadence.
  if (state.stability >= 30) return 'Fluent';
  if (state.stability >= 7) return 'Usable';
  return 'Learning';
}
