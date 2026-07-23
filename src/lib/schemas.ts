/**
 * Runtime zod schemas for every persisted entity.
 *
 * These are the record-level validators used when importing a backup, so a
 * structurally-plausible but internally-broken file is rejected BEFORE any
 * existing data is touched (Principle 3: never lose learning history). The
 * static TypeScript types in types.ts remain the source of truth; these mirror
 * them for runtime checking.
 */

import { z } from 'zod';
import { correctionPayloadSchema } from './contract';
import { conceptSchema } from './concepts';
import { BACKUP_VERSION } from './types';

/**
 * An ISO-8601 timestamp. We validate that it actually parses as a date (not
 * just any non-empty string), so a hand-edited backup with `"not-a-date"` in a
 * timestamp field is rejected. Note: plain calendar-day fields (Session.date,
 * Settings.lastActiveDate — "YYYY-MM-DD") intentionally use a looser string.
 */
const iso = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'must be a valid date' });

export const fsrsStateSchema = z.object({
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number(),
  due: iso,
  lastReview: iso.nullable(),
});

export const expressionSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  meaning: z.string(),
  examples: z.array(z.string()),
  userSentence: z.string().nullable(),
  correctedSentence: z.string().nullable(),
  naturalSentence: z.string().nullable(),
  source: z.enum(['session', 'search', 'manual']),
  searchCount: z.number(),
  usageCount: z.number(),
  mastery: z.enum(['New', 'Learning', 'Usable', 'Fluent', 'Forgotten']),
  fsrs: fsrsStateSchema,
  createdAt: iso,
  updatedAt: iso,
});

export const reviewLogSchema = z.object({
  id: z.string().min(1),
  expressionId: z.string().min(1),
  cardType: z.enum([
    'Recognition',
    'FillInBlank',
    'UseInSentence',
    'ExplainInEnglish',
    'SpeakIt',
  ]),
  rating: z.enum(['Again', 'Hard', 'Good', 'Easy']),
  latencyMs: z.number().nullable(),
  reviewedAt: iso,
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  date: z.string(),
  mode: z.enum(['JustTalk', 'TopicTalk', 'ScenarioTalk', 'ChallengeTalk']),
  topic: z.string(),
  difficulty: z.enum(['Comfortable', 'Natural', 'Challenging']),
  targetExpressionIds: z.array(z.string()),
  transcriptRaw: z.string().nullable(),
  correctionJson: correctionPayloadSchema.nullable(),
  durationMin: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: iso,
});

export const settingsSchema = z.object({
  id: z.literal('settings'),
  streakCount: z.number(),
  lastActiveDate: z.string().nullable(),
  dailyPlan: z.object({
    reviewTarget: z.number(),
    sessionMinutes: z.number(),
    defaultMode: z.enum(['JustTalk', 'TopicTalk', 'ScenarioTalk', 'ChallengeTalk']),
    defaultDifficulty: z.enum(['Comfortable', 'Natural', 'Challenging']),
  }),
  koreanHelpEnabled: z.boolean(),
  createdAt: iso,
  updatedAt: iso,
});

/** Flag any duplicate key within a store array — always corruption, since the
 * app exports from key-path stores where keys are unique by construction. Left
 * unchecked, a `put` would silently overwrite, so the reported import count
 * would exceed the rows actually stored. */
function reportDuplicates<T>(
  rows: T[],
  key: (row: T) => string,
  collection: string,
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const k = key(row);
    if (seen.has(k)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data', collection, i],
        message: `duplicate ${collection} key "${k}"`,
      });
    }
    seen.add(k);
  });
}

/**
 * Full backup envelope, including every record inside each data array.
 *
 * `version` must be a number no newer than this app supports. A `superRefine`
 * pass additionally rejects duplicate primary keys within any store.
 *
 * Referential integrity (e.g. every `ReviewLog.expressionId` pointing to a live
 * Expression) is deliberately NOT enforced: deleting an expression legitimately
 * leaves its past review logs and session references behind, so a valid
 * app-exported backup can contain such "orphans". They do not break stats or
 * the review queue, so rejecting them would only reject good backups.
 */
export const backupEnvelopeSchema = z
  .object({
    app: z.literal('english-os'),
    version: z.number().int().max(BACKUP_VERSION),
    exportedAt: z.string(),
    data: z.object({
      expressions: z.array(expressionSchema),
      reviewLogs: z.array(reviewLogSchema),
      sessions: z.array(sessionSchema),
      concepts: z.array(conceptSchema),
      settings: settingsSchema.nullable(),
    }),
  })
  .superRefine((val, ctx) => {
    reportDuplicates(val.data.expressions, (e) => e.id, 'expressions', ctx);
    reportDuplicates(val.data.reviewLogs, (r) => r.id, 'reviewLogs', ctx);
    reportDuplicates(val.data.sessions, (s) => s.id, 'sessions', ctx);
    reportDuplicates(val.data.concepts, (c) => c.slug, 'concepts', ctx);
  });
