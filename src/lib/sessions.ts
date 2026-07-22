/**
 * Session + ReviewLog repositories.
 */

import * as db from './db';
import { localDay, newId, nowIso } from './id';
import type {
  CardType,
  CorrectionPayload,
  Difficulty,
  Rating,
  ReviewLog,
  Session,
  SessionMode,
} from './types';

export interface NewSessionInput {
  mode: SessionMode;
  topic: string;
  difficulty: Difficulty;
  targetExpressionIds?: string[];
  transcriptRaw?: string | null;
  correctionJson?: CorrectionPayload | null;
  durationMin?: number | null;
  notes?: string | null;
  date?: string;
}

export async function createSession(input: NewSessionInput): Promise<Session> {
  const session: Session = {
    id: newId(),
    date: input.date ?? localDay(),
    mode: input.mode,
    topic: input.topic,
    difficulty: input.difficulty,
    targetExpressionIds: input.targetExpressionIds ?? [],
    transcriptRaw: input.transcriptRaw ?? null,
    correctionJson: input.correctionJson ?? null,
    durationMin: input.durationMin ?? null,
    notes: input.notes ?? null,
    createdAt: nowIso(),
  };
  return db.put('sessions', session);
}

export async function getAllSessions(): Promise<Session[]> {
  const all = await db.getAll('sessions');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.get('sessions', id);
}

// ---------------------------------------------------------------------------
// Review logs
// ---------------------------------------------------------------------------

export interface NewReviewLogInput {
  expressionId: string;
  cardType: CardType;
  rating: Rating;
  latencyMs?: number | null;
}

export async function logReview(input: NewReviewLogInput): Promise<ReviewLog> {
  const log: ReviewLog = {
    id: newId(),
    expressionId: input.expressionId,
    cardType: input.cardType,
    rating: input.rating,
    latencyMs: input.latencyMs ?? null,
    reviewedAt: nowIso(),
  };
  return db.put('reviewLogs', log);
}

export async function getAllReviewLogs(): Promise<ReviewLog[]> {
  return db.getAll('reviewLogs');
}
