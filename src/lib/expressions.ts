/**
 * Expression repository — the learner's permanent memory of phrases (the asset,
 * Principle 3). Wraps the generic db layer with domain logic: id assignment,
 * FSRS bootstrapping, mastery derivation, dedup by text, and review updates.
 */

import * as db from './db';
import { newId, nowIso } from './id';
import { grade, isDue, newFsrsState } from './fsrs';
import { deriveMastery } from './mastery';
import type { Expression, ExpressionSource, Rating } from './types';

export interface NewExpressionInput {
  text: string;
  meaning: string;
  examples?: string[];
  userSentence?: string | null;
  correctedSentence?: string | null;
  naturalSentence?: string | null;
  source: ExpressionSource;
}

function normalizeKey(text: string): string {
  return text.trim().toLowerCase();
}

export async function getAllExpressions(): Promise<Expression[]> {
  const all = await db.getAll('expressions');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getExpression(id: string): Promise<Expression | undefined> {
  return db.get('expressions', id);
}

export async function findByText(text: string): Promise<Expression | undefined> {
  const key = normalizeKey(text);
  const all = await db.getAll('expressions');
  return all.find((e) => normalizeKey(e.text) === key);
}

/**
 * Create an expression, or if one with the same text already exists, merge in
 * new details and bump usage. Returns the stored expression. This is what keeps
 * the Capture step from creating duplicates across sessions.
 */
export async function upsertExpression(input: NewExpressionInput): Promise<Expression> {
  const existing = await findByText(input.text);
  const now = nowIso();

  if (existing) {
    const merged: Expression = {
      ...existing,
      meaning: input.meaning || existing.meaning,
      examples: dedupeStrings([...existing.examples, ...(input.examples ?? [])]),
      userSentence: input.userSentence ?? existing.userSentence,
      correctedSentence: input.correctedSentence ?? existing.correctedSentence,
      naturalSentence: input.naturalSentence ?? existing.naturalSentence,
      usageCount: existing.usageCount + 1,
      updatedAt: now,
    };
    return db.put('expressions', merged);
  }

  const fsrs = newFsrsState(new Date());
  const created: Expression = {
    id: newId(),
    text: input.text.trim(),
    meaning: input.meaning,
    examples: input.examples ?? [],
    userSentence: input.userSentence ?? null,
    correctedSentence: input.correctedSentence ?? null,
    naturalSentence: input.naturalSentence ?? null,
    source: input.source,
    searchCount: 0,
    usageCount: input.source === 'session' ? 1 : 0,
    mastery: deriveMastery(fsrs),
    fsrs,
    createdAt: now,
    updatedAt: now,
  };
  return db.put('expressions', created);
}

export async function updateExpression(
  id: string,
  patch: Partial<Omit<Expression, 'id' | 'createdAt'>>,
): Promise<Expression | undefined> {
  const existing = await db.get('expressions', id);
  if (!existing) return undefined;
  const updated: Expression = { ...existing, ...patch, updatedAt: nowIso() };
  return db.put('expressions', updated);
}

export async function deleteExpression(id: string): Promise<void> {
  await db.remove('expressions', id);
}

export async function incrementSearchCount(id: string): Promise<void> {
  const existing = await db.get('expressions', id);
  if (!existing) return;
  await db.put('expressions', {
    ...existing,
    searchCount: existing.searchCount + 1,
    updatedAt: nowIso(),
  });
}

/**
 * Record a review outcome: reschedule via FSRS, re-derive mastery, and persist.
 * Returns the updated expression so the UI can show the next-due interval.
 */
export async function recordReview(
  id: string,
  rating: Rating,
  now: Date = new Date(),
): Promise<Expression | undefined> {
  const existing = await db.get('expressions', id);
  if (!existing) return undefined;
  const nextFsrs = grade(existing.fsrs, rating, now);
  const updated: Expression = {
    ...existing,
    fsrs: nextFsrs,
    mastery: deriveMastery(nextFsrs),
    updatedAt: nowIso(),
  };
  return db.put('expressions', updated);
}

/** Expressions currently due for review, soonest-due first. */
export async function getDueExpressions(now: Date = new Date()): Promise<Expression[]> {
  const all = await db.getAll('expressions');
  return all
    .filter((e) => isDue(e.fsrs, now))
    .sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due));
}

/**
 * Pick up to `limit` review-due expressions to weave into today's briefing (the
 * compound step, §2). Prefers the most-overdue items.
 */
export async function pickReviewTargets(
  limit: number,
  now: Date = new Date(),
): Promise<Expression[]> {
  const due = await getDueExpressions(now);
  return due.slice(0, limit);
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    out.push(key);
  }
  return out;
}
