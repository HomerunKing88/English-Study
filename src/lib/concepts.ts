/**
 * Concept content pipeline (§8).
 *
 * Concepts are generated offline, reviewed, and committed to the repo as JSON.
 * At runtime we import that JSON, validate it against the zod schema (so a
 * malformed hand-edit fails loudly), and expose lookups. Saved-for-review state
 * lives in IndexedDB and is merged over the static content.
 */

import { z } from 'zod';
import rawConcepts from '@/content/concepts.json';
import * as db from './db';
import { upsertExpression } from './expressions';
import type { Concept, ConceptCategory } from './types';

const CATEGORIES: ConceptCategory[] = [
  'Finance Fundamentals',
  'Accounting',
  'Fixed Income',
  'Equity',
  'Derivatives',
  'Risk',
  'Investment Banking',
  'Asset Management',
  'Strategy',
  'Executive English',
];

export const conceptSchema = z.object({
  slug: z.string().min(1),
  term: z.string().min(1),
  category: z.enum(CATEGORIES as [ConceptCategory, ...ConceptCategory[]]),
  easyDef: z.string().min(1),
  standardDef: z.string().min(1),
  professionalDef: z.string().min(1),
  examples: z.array(z.string()),
  collocations: z.array(z.string()),
  related: z.array(z.string()),
  compare: z.array(z.object({ term: z.string(), distinction: z.string() })),
  commonMistakes: z.array(z.string()),
  savedForReview: z.boolean(),
});

export const conceptsSchema = z.array(conceptSchema);

/** Validated static content. Parsed once at module load. */
export const STATIC_CONCEPTS: Concept[] = conceptsSchema.parse(rawConcepts);

const BY_SLUG = new Map(STATIC_CONCEPTS.map((c) => [c.slug, c]));

export function getStaticConcept(slug: string): Concept | undefined {
  return BY_SLUG.get(slug);
}

/**
 * All concepts, with each `savedForReview` flag overridden by whatever is in
 * IndexedDB (falls back to the static default when the db is unavailable, e.g.
 * during SSR).
 */
export async function getConcepts(): Promise<Concept[]> {
  if (!db.isBrowser()) return STATIC_CONCEPTS;
  const saved = await db.getAll('concepts');
  const savedSlugs = new Set(saved.filter((c) => c.savedForReview).map((c) => c.slug));
  return STATIC_CONCEPTS.map((c) => ({ ...c, savedForReview: savedSlugs.has(c.slug) }));
}

export async function getConcept(slug: string): Promise<Concept | undefined> {
  const base = getStaticConcept(slug);
  if (!base) return undefined;
  if (!db.isBrowser()) return base;
  const stored = await db.get('concepts', slug);
  return { ...base, savedForReview: stored?.savedForReview ?? false };
}

export function conceptCategories(): ConceptCategory[] {
  return CATEGORIES;
}

/**
 * Toggle a concept into/out of the review queue. When saved, its term is also
 * added to My Expressions so it enters the FSRS rotation (everything routes back
 * to speaking, Principle 2).
 */
export async function toggleSavedForReview(slug: string): Promise<boolean> {
  const base = getStaticConcept(slug);
  if (!base) throw new Error(`Unknown concept: ${slug}`);
  const stored = await db.get('concepts', slug);
  const nextSaved = !(stored?.savedForReview ?? false);

  await db.put('concepts', { ...base, savedForReview: nextSaved });

  if (nextSaved) {
    await upsertExpression({
      text: base.term,
      meaning: base.easyDef,
      examples: base.examples.slice(0, 2),
      source: 'search',
    });
  }
  return nextSaved;
}
