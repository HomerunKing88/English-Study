/**
 * ChatGPT contract (§7) — the bridge format.
 *
 * The briefing instructs ChatGPT to end every session with exactly one fenced
 * JSON block matching this schema. This module owns:
 *   1. the zod schema that validates that block, and
 *   2. `extractLastJsonBlock`, which pulls the final fenced block out of an
 *      arbitrary pasted transcript.
 *
 * Parser rules (from the spec):
 *   - Find the LAST fenced JSON block; ignore everything else.
 *   - Validate against the schema; on failure the caller shows the raw block
 *     and offers manual save (never lose data silently).
 */

import { z } from 'zod';
import type { CorrectionPayload } from './types';

export const correctionItemSchema = z.object({
  user_said: z.string(),
  corrected: z.string(),
  natural: z.string(),
  note_en: z.string(),
});

export const newExpressionItemSchema = z.object({
  expression: z.string(),
  meaning_en: z.string(),
  example: z.string(),
});

export const targetUsageItemSchema = z.object({
  expression: z.string(),
  used_correctly: z.boolean(),
});

export const correctionPayloadSchema = z.object({
  session: z.object({
    topic: z.string(),
    mode: z.string(),
    difficulty: z.string(),
  }),
  corrections: z.array(correctionItemSchema),
  new_expressions: z.array(newExpressionItemSchema),
  target_expression_usage: z.array(targetUsageItemSchema),
  focus_next: z.string(),
});

/**
 * Extract the last fenced JSON block from pasted text.
 *
 * Accepts three shapes, in priority order:
 *   1. ```json … ``` fenced blocks (preferred — the contract asks for this)
 *   2. any ``` … ``` fenced block whose body parses as JSON
 *   3. the entire input, if it is itself a bare JSON object
 *
 * Returns the raw string of the last matching block, or null if none found.
 */
export function extractLastJsonBlock(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1 & 2: scan all fenced code blocks, keep the last one that looks like JSON.
  const fenceRe = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let lastJson: string | null = null;
  while ((match = fenceRe.exec(trimmed)) !== null) {
    const lang = (match[1] ?? '').toLowerCase();
    const body = (match[2] ?? '').trim();
    if (!body) continue;
    if (lang === 'json' || looksLikeJson(body)) {
      lastJson = body;
    }
  }
  if (lastJson) return lastJson;

  // 3: the whole thing is a bare JSON object.
  if (looksLikeJson(trimmed)) return trimmed;

  return null;
}

function looksLikeJson(s: string): boolean {
  const t = s.trim();
  if (!(t.startsWith('{') && t.endsWith('}'))) return false;
  try {
    const v: unknown = JSON.parse(t);
    return typeof v === 'object' && v !== null;
  } catch {
    return false;
  }
}

export type ContractParseResult =
  | { ok: true; block: string; payload: CorrectionPayload }
  | { ok: false; block: string | null; error: string };

/**
 * Full pipeline: find the block, JSON.parse it, validate against the schema.
 * Returns a discriminated union so the UI can branch cleanly. The raw block is
 * always returned when found, so the learner can fall back to manual save.
 */
export function parseContract(text: string): ContractParseResult {
  const block = extractLastJsonBlock(text);
  if (!block) {
    return { ok: false, block: null, error: 'No JSON block found in the pasted text.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch {
    return { ok: false, block, error: 'The JSON block could not be parsed.' };
  }

  const result = correctionPayloadSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join('.') || 'payload';
    const why = first?.message ?? 'invalid';
    return { ok: false, block, error: `Validation failed at "${where}": ${why}.` };
  }

  return { ok: true, block, payload: result.data };
}
