/**
 * English OS — canonical data model (Phase 1).
 *
 * These strict TypeScript types are the single source of truth for everything
 * persisted in IndexedDB. Every entity carries an `id` and timestamps so the
 * JSON export/import round-trips losslessly. Do not widen these types casually;
 * the durability of learning history depends on them (Principle 3).
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ISO-8601 timestamp string, e.g. "2026-07-22T09:00:00.000Z". */
export type Iso = string;

/** Opaque identifier. We use UUID-ish strings generated at write time. */
export type Id = string;

// ---------------------------------------------------------------------------
// Expression
// ---------------------------------------------------------------------------

/** Where an expression entered the system. */
export type ExpressionSource = 'session' | 'search' | 'manual';

/** Learner-facing mastery ladder. Distinct from the FSRS numeric state. */
export type Mastery = 'New' | 'Learning' | 'Usable' | 'Fluent' | 'Forgotten';

/**
 * The FSRS memory state for a single reviewable item. Mirrors the fields
 * `ts-fsrs` needs to reschedule a card. `due`, `lastReview` are ISO strings so
 * they survive JSON export; the FSRS adapter converts to/from Date.
 */
export interface FsrsState {
  /** Memory stability in days (higher = remembered longer). */
  stability: number;
  /** Item difficulty, roughly 1–10 in FSRS. */
  difficulty: number;
  /** Elapsed days between the last two reviews (FSRS bookkeeping). */
  elapsedDays: number;
  /** Days the card was scheduled to wait before the last review. */
  scheduledDays: number;
  /** Number of times this card has been reviewed. */
  reps: number;
  /** Number of times the card lapsed (rated Again after being learned). */
  lapses: number;
  /** FSRS learning-state enum value (New/Learning/Review/Relearning). */
  state: number;
  /** When the card is next due for review. */
  due: Iso;
  /** When the card was last reviewed, if ever. */
  lastReview: Iso | null;
}

export interface Expression {
  id: Id;
  /** The expression / phrase itself, in English. */
  text: string;
  /** Plain-English meaning. English-first (Principle 1). */
  meaning: string;
  /** Illustrative example sentences. */
  examples: string[];
  /** What the learner originally said (from a session correction). */
  userSentence: string | null;
  /** The grammatically corrected version. */
  correctedSentence: string | null;
  /** The most natural native-sounding version. */
  naturalSentence: string | null;
  source: ExpressionSource;
  /** How many times the learner searched for this (Concept/Explorer signal). */
  searchCount: number;
  /** How many times it has actually been used in a session. */
  usageCount: number;
  mastery: Mastery;
  fsrs: FsrsState;
  createdAt: Iso;
  updatedAt: Iso;
}

// ---------------------------------------------------------------------------
// ReviewLog
// ---------------------------------------------------------------------------

export type CardType =
  | 'Recognition'
  | 'FillInBlank'
  | 'UseInSentence'
  | 'ExplainInEnglish'
  | 'SpeakIt';

/** FSRS grade. Maps to ts-fsrs Rating (Again=1, Hard=2, Good=3, Easy=4). */
export type Rating = 'Again' | 'Hard' | 'Good' | 'Easy';

export interface ReviewLog {
  id: Id;
  expressionId: Id;
  cardType: CardType;
  rating: Rating;
  /** Response latency in ms — only meaningful for Speak-it cards. */
  latencyMs: number | null;
  reviewedAt: Iso;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type SessionMode = 'JustTalk' | 'TopicTalk' | 'ScenarioTalk' | 'ChallengeTalk';
export type Difficulty = 'Comfortable' | 'Natural' | 'Challenging';

export interface Session {
  id: Id;
  /** Calendar date of the session (YYYY-MM-DD, learner's local day). */
  date: string;
  mode: SessionMode;
  topic: string;
  difficulty: Difficulty;
  /** Expressions injected into the briefing for spaced review (the compound step). */
  targetExpressionIds: Id[];
  /** Full pasted transcript, if the learner kept it. Optional by design. */
  transcriptRaw: string | null;
  /** The parsed ChatGPT correction JSON block (see contract, §7). */
  correctionJson: CorrectionPayload | null;
  durationMin: number | null;
  notes: string | null;
  createdAt: Iso;
}

// ---------------------------------------------------------------------------
// ChatGPT contract payload (§7) — the shape we persist after parsing.
// The zod schema in contract.ts validates raw pasted input into this type.
// ---------------------------------------------------------------------------

export interface CorrectionItem {
  user_said: string;
  corrected: string;
  natural: string;
  note_en: string;
}

export interface NewExpressionItem {
  expression: string;
  meaning_en: string;
  example: string;
}

export interface TargetUsageItem {
  expression: string;
  used_correctly: boolean;
}

export interface CorrectionPayload {
  session: {
    topic: string;
    mode: string;
    difficulty: string;
  };
  corrections: CorrectionItem[];
  new_expressions: NewExpressionItem[];
  target_expression_usage: TargetUsageItem[];
  focus_next: string;
}

// ---------------------------------------------------------------------------
// Concept (build-time content, §8)
// ---------------------------------------------------------------------------

export type ConceptCategory =
  | 'Finance Fundamentals'
  | 'Accounting'
  | 'Fixed Income'
  | 'Equity'
  | 'Derivatives'
  | 'Risk'
  | 'Investment Banking'
  | 'Asset Management'
  | 'Strategy'
  | 'Executive English';

export interface ConceptComparison {
  /** Slug or label of the thing being compared against. */
  term: string;
  /** One-line distinction, English-first. */
  distinction: string;
}

export interface Concept {
  slug: string;
  term: string;
  category: ConceptCategory;
  /** Three definition tiers (Principle 1 / §8). */
  easyDef: string;
  standardDef: string;
  professionalDef: string;
  examples: string[];
  collocations: string[];
  /** Slugs of related concepts, for Wikipedia-style exploration. */
  related: string[];
  /** Fine-grained "X vs Y" distinctions. */
  compare: ConceptComparison[];
  commonMistakes: string[];
  /** Whether the learner has pinned this concept into their review queue. */
  savedForReview: boolean;
}

// ---------------------------------------------------------------------------
// Settings / Stats
// ---------------------------------------------------------------------------

export interface DailyPlanConfig {
  /** Target number of review cards per day. */
  reviewTarget: number;
  /** Default session length in minutes for the briefing. */
  sessionMinutes: number;
  /** Preferred default mode and difficulty for one-tap generation. */
  defaultMode: SessionMode;
  defaultDifficulty: Difficulty;
}

export interface Settings {
  /** Singleton row — always id "settings". */
  id: 'settings';
  streakCount: number;
  /** Last calendar date (YYYY-MM-DD) the streak was advanced. */
  lastActiveDate: string | null;
  dailyPlan: DailyPlanConfig;
  /** Optional: allow the "Need help in Korean?" affordance (Principle 1). */
  koreanHelpEnabled: boolean;
  /**
   * Whether the learner has set up a ChatGPT Custom GPT holding the standing
   * coaching instructions. When true, Today defaults to the compact briefing
   * (just the day's parameters) instead of the full one (friction budget, §2).
   */
  usesCustomGpt: boolean;
  createdAt: Iso;
  updatedAt: Iso;
}

// ---------------------------------------------------------------------------
// Export envelope
// ---------------------------------------------------------------------------

/** Bump when the on-disk shape changes so import can migrate/refuse safely. */
export const BACKUP_VERSION = 1 as const;

export interface BackupEnvelope {
  app: 'english-os';
  version: typeof BACKUP_VERSION;
  exportedAt: Iso;
  data: {
    expressions: Expression[];
    reviewLogs: ReviewLog[];
    sessions: Session[];
    concepts: Concept[];
    settings: Settings | null;
  };
}
