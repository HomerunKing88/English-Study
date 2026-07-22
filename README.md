# English OS

> A personal English **operating system** for one user.
> ChatGPT Voice is the conversation engine. This app is the OS around it: it
> designs each session's curriculum, captures the results, and compounds them
> into long-term fluency.

English OS never replaces the conversation. It fills the gap ChatGPT Voice
leaves: nothing is remembered, nothing is scheduled for review, and no
curriculum connects one session to the next.

## The core loop

```
1. TODAY    → Generate today's session briefing (scenario × difficulty × 3
              review-due expressions), wrapped in coaching rules. One-tap copy.
2. TALK     → 10-minute voice session in ChatGPT. It ends by emitting one
              fenced JSON correction block (the contract, below).
3. CAPTURE  → Paste the transcript (or just the JSON). The app parses it,
              saves expressions, logs the session, and schedules reviews.
4. REVIEW   → FSRS surfaces due cards daily. Speak-it cards use the Web Speech
              API and measure response latency (the automaticity proxy).
5. COMPOUND → Tomorrow's briefing weaves due expressions back into the talk.
```

## Phase 1 modules (this build)

| Module | What it does |
|---|---|
| **Today** | Briefing generator (full or compact/Custom-GPT), streak, due count, one-tap copy |
| **Capture** | Transcript/JSON paste → zod-validated parse → save expressions + session log + FSRS updates |
| **Explore** | Finance Academy: 20 committed concepts, three definition tiers, related-concept navigation, save-to-review |
| **Review** | `ts-fsrs` scheduler; card types: Recognition, Fill-in-blank, Use-in-sentence, Explain-in-English, Speak-it (latency) |
| **My English** | CRUD over the permanent expression memory with full metadata |
| **Progress** | Streak, sessions, expressions, accuracy, median Speak-it latency, mastery breakdown |
| **Settings** | Daily-plan config + **JSON export/import** (launch blocker — your data is the asset) |
| **PWA** | Installable, offline shell via service worker |

## The ChatGPT contract (§7)

Every briefing instructs ChatGPT to end the session with exactly one fenced
JSON block:

```json
{
  "session": { "topic": "...", "mode": "...", "difficulty": "..." },
  "corrections": [
    { "user_said": "...", "corrected": "...", "natural": "...", "note_en": "..." }
  ],
  "new_expressions": [
    { "expression": "...", "meaning_en": "...", "example": "..." }
  ],
  "target_expression_usage": [
    { "expression": "...", "used_correctly": true }
  ],
  "focus_next": "one sentence"
}
```

The parser finds the **last** fenced JSON block, validates it against a zod
schema, and never loses data silently: on failure it shows the raw block.

## Architecture

- **Next.js (App Router) + TypeScript (strict) + TailwindCSS**
- **IndexedDB** via a thin typed wrapper (`src/lib/db.ts`) — not localStorage
- **`ts-fsrs`** for spaced repetition (`src/lib/fsrs.ts` is the only bridge)
- **zod** for the transcript/JSON contract and concept content
- **Web Speech API** for Speak-it cards and latency measurement
- All data access is client-side; pages guard against SSR where needed
- **Zero recurring cost** — no paid APIs anywhere

### Source map

```
src/
  lib/
    types.ts        canonical data model (source of truth)
    db.ts           typed IndexedDB wrapper
    backup.ts       JSON export / import
    fsrs.ts         ts-fsrs adapter (ISO <-> Card)
    mastery.ts      mastery ladder derived from FSRS
    expressions.ts  expression repository (dedup, review, due)
    sessions.ts     session + review-log repositories
    settings.ts     settings + streak
    contract.ts     §7 zod schema + last-JSON-block extractor
    capture.ts      payload -> durable memory
    briefing.ts     Today briefing generator
    scenarios.ts    finance + general scenario catalog
    review.ts       card construction
    speech.ts       Web Speech wrapper
    concepts.ts     concept content loader + save-to-review
    stats.ts        minimal progress stats
  content/concepts.json   20 committed finance concepts
  components/       Nav, UI primitives, SW registration
  app/             Today / Capture / Explore / Review / My English / Progress / Settings
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

### Quality gate (run before every commit)

```bash
npm run lint && npm run typecheck && npm test
```

## Content pipeline

Concept content is generated offline, reviewed, and committed as JSON
conforming to the `Concept` schema (validated at load time by
`src/lib/concepts.ts`). The initial batch of 20 finance concepts forms a
connected web via `related[]` for Wikipedia-style exploration
(Bond → Coupon → Yield → Duration → …). Expand to 100–200 after review.

## Roadmap

- **Phase 1 (this build):** the full daily loop, offline, single device.
- **Phase 2 (after ≥30 days of daily use):** Custom GPT refinement, Supabase
  free-tier auth + cloud sync/backup, latency trends, English Brain dashboard.

Explicitly **not** on the roadmap: in-app realtime voice, any paid API, or
multi-user/enterprise features.
