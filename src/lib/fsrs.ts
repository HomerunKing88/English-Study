/**
 * FSRS adapter.
 *
 * We persist a JSON-friendly `FsrsState` (camelCase, ISO strings). `ts-fsrs`
 * works in `Card` objects (snake_case, Date objects). This module is the only
 * place that bridges the two, so the rest of the app never touches ts-fsrs
 * directly. Per §6 we use the library, not a hand-rolled interval ladder.
 */

import { createEmptyCard, fsrs, Rating as FsrsRating, type Card, type Grade } from 'ts-fsrs';
import type { FsrsState, Rating } from './types';

const scheduler = fsrs();

/** Fresh FSRS state for a brand-new expression, due immediately. */
export function newFsrsState(now: Date = new Date()): FsrsState {
  return cardToState(createEmptyCard(now));
}

function cardToState(card: Card): FsrsState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    due: card.due.toISOString(),
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

function stateToCard(state: FsrsState): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
  };
}

const RATING_MAP: Record<Rating, Grade> = {
  Again: FsrsRating.Again,
  Hard: FsrsRating.Hard,
  Good: FsrsRating.Good,
  Easy: FsrsRating.Easy,
};

/**
 * Apply a grade to an FSRS state and return the rescheduled state. Pure: the
 * caller is responsible for persisting the result.
 */
export function grade(
  state: FsrsState,
  rating: Rating,
  now: Date = new Date(),
): FsrsState {
  const card = stateToCard(state);
  const result = scheduler.repeat(card, now);
  const next = result[RATING_MAP[rating]].card;
  return cardToState(next);
}

/** True when the card is due at or before `now`. */
export function isDue(state: FsrsState, now: Date = new Date()): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}

/**
 * Human-friendly preview of the next interval for each rating, e.g. for
 * showing "Good → 3d" hints on review buttons.
 */
export function intervalPreview(
  state: FsrsState,
  now: Date = new Date(),
): Record<Rating, string> {
  const card = stateToCard(state);
  const result = scheduler.repeat(card, now);
  const fmt = (c: Card): string => {
    const ms = c.due.getTime() - now.getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  };
  return {
    Again: fmt(result[FsrsRating.Again].card),
    Hard: fmt(result[FsrsRating.Hard].card),
    Good: fmt(result[FsrsRating.Good].card),
    Easy: fmt(result[FsrsRating.Easy].card),
  };
}
