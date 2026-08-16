---
name: signal-forge
description: Ingests trending topics, applies 4-axis scoring (engagement 35% · brand-fit 30% · controversy 20% · recency 15%), strips copyrighted references, routes to channel + mascot assignment, produces SignalManifest.
type: core
version: 0.1.0
when_to_use: |
  Stage 1 of the AnimeLegends pipeline. When user invokes `/new-short` or `/from-signal` or provides a topic URL/string. Does NOT handle script generation or video production — only topic validation and manifest creation.
---

# signal-forge

## Intent

First stage of the AnimeLegends generative pipeline. Ingests trending anime topics from configured sources (Reddit anime communities, AniList trending), applies a weighted 4-axis scoring rubric (engagement 35%, brand-fit 30%, controversy 20%, recency 15%), strips any copyrighted character names or franchise references via legal firewall, assigns appropriate channel (PowerScaling/Philosophy/LoreDrop/TrainingArc/LegendsLabs) and mascot trinity (Mira/Kage/Akashi), and produces a validated `SignalManifest` JSON that feeds downstream to `concept-forge`.

## Inputs

What this skill expects to receive:

```typescript
interface SignalForgeInput {
  source: "url" | "manual" | "ingest";  // input type
  topic?: string;                       // manual topic string if source=manual
  url?: string;                         // Reddit/AniList URL if source=url
  override_legal?: boolean;             // bypass legal firewall (default: false, requires explicit flag)
}
```


Source of input: user prompt via `/from-signal` command, or automatic ingest from configured Reddit/AniList monitors (if configured).

## Outputs

What this skill produces:

```typescript
interface SignalManifest {
  signal_id: string;                    // UUID v4
  topic_raw: string;                    // original topic before legal pass
  topic_clean: string;                  // sanitized topic (copyrighted refs stripped)
  source: string;                       // "reddit" | "anilist" | "manual"
  source_url?: string;                  // original URL if from reddit/anilist
  scores: {
    engagement: number;                 // 0-100
    brand_fit: number;                  // 0-100
    controversy: number;                // 0-100
    recency: number;                    // 0-100, 48h half-life
    weighted_total: number;             // composite score
  };
  channel: string;                      // PowerScaling | Philosophy | LoreDrop | TrainingArc | LegendsLabs
  mascots: string[];                    // ["MIRA", "KAGE", "AKASHI"] trinity in assigned order
  status: "accept" | "defer" | "reject";
  legal_flags: string[];                // detected copyrighted refs (empty if clean)
  timestamp: string;                    // ISO 8601
}
```


Where the output goes: passed to `concept-forge` as input, logged to `grimoire-keeper`, saved to `signals/` directory if configured.

## Core logic / rules

1. **Source resolution** — Determine input source: if `source=url`, extract topic from Reddit post title or AniList entry; if `source=manual`, use provided `topic` string directly; if `source=ingest`, poll configured monitors (Reddit r/anime, r/OnePiece, r/JujutsuKaisen, AniList trending API) every 30 minutes and queue top 5 new entries.

2. **Legal firewall (pre-scoring)** — Before scoring, scan `topic_raw` against the copyrighted reference database (character names from Shonen Jump, Studio Ghibli, Trigger, Ufotable, Mappa franchises). If match found: replace with `[redacted character]` or `[redacted series]` in `topic_clean`, log to `legal_flags` array. If `override_legal=true` (manual only), skip this step but still log detected refs.

3. **4-axis scoring** — Compute weighted scores:
   - **Engagement (35%)**: Reddit upvotes / 1000, AniList favorites / 10000, manual topics default to 50.
   - **Brand-fit (30%)**: keyword match against AnimeLegends brand pillars (training arcs, power systems, philosophy, lore depth) — score 0-100 via keyword density.
   - **Controversy (20%)**: Reddit comment velocity (comments/hour in first 6h), AniList discussion threads — higher = better. Manual topics default to 40.
   - **Recency (15%)**: exponential decay with 48h half-life. Topics >96h old score <10.
   - **Weighted total**: `(engagement * 0.35) + (brand_fit * 0.30) + (controversy * 0.20) + (recency * 0.15)`.

4. **Channel assignment** — Map topic to sub-channel via keyword heuristics:
   - PowerScaling: "power level", "strongest", "vs", "battle"
   - Philosophy: "meaning", "theme", "philosophy", "symbolism"
   - LoreDrop: "explained", "lore", "theory", "timeline"
   - TrainingArc: "training", "growth", "journey", "development"
   - LegendsLabs: "animation", "sakuga", "production", "studio"
   - Default: Philosophy if no strong match.

5. **Mascot trinity assignment** — Assign mascot order based on channel:
   - PowerScaling: Akashi leads (closes with power judgment), Kage measures, Mira opens curiosity.
   - Philosophy: Mira leads (opens with wonder), Kage probes, Akashi synthesizes.
   - LoreDrop: Kage leads (analytical), Mira contextualizes, Akashi delivers verdict.
   - TrainingArc: Mira leads (warm journey framing), Akashi challenges, Kage measures progress.
   - LegendsLabs: Akashi leads (expertise assertion), Kage dissects, Mira humanizes.

6. **Accept/defer/reject** — Set `status` based on weighted_total: ≥60 = accept, 40-59 = defer (low priority queue), <40 = reject. Deferred topics resurface if engagement spikes within 48h.

7. **Manifest generation** — Populate `SignalManifest` with all fields, generate UUID for `signal_id`, set `timestamp` to ISO 8601 UTC.

8. **Grimoire logging** — Log invocation to `grimoire-keeper` with `stage="signal-forge"`, `input_id=null` (first stage), `output_id=signal_id`, `decision=status`, `rationale` (one-line: why accepted/deferred/rejected), `duration_ms`.

## Worked examples

### Example 1: Reddit trending topic (accepted)

**Input:**

```json
{
  "source": "url",
  "url": "https://reddit.com/r/anime/comments/xyz/why_gojos_domain_is_philosophically_perfect"
}
```


**Output:**

```json
{
  "signal_id": "550e8400-e29b-41d4-a716-446655440000",
  "topic_raw": "Why Gojo's Domain is philosophically perfect",
  "topic_clean": "Why [redacted character]'s Domain is philosophically perfect",
  "source": "reddit",
  "source_url": "https://reddit.com/r/anime/comments/xyz/why_gojos_domain_is_philosophically_perfect",
  "scores": {
    "engagement": 78,
    "brand_fit": 92,
    "controversy": 65,
    "recency": 95,
    "weighted_total": 81.65
  },
  "channel": "Philosophy",
  "mascots": ["MIRA", "KAGE", "AKASHI"],
  "status": "accept",
  "legal_flags": ["Gojo (Jujutsu Kaisen)"],
  "timestamp": "2026-08-16T09:15:00Z"
}
```


**Why this output:** High brand-fit (philosophy keyword), strong engagement, recent post. Legal firewall stripped "Gojo" (copyrighted Jujutsu Kaisen character). Philosophy channel assigned → Mira leads trinity.

### Example 2: Manual topic (deferred)

**Input:**

```json
{
  "source": "manual",
  "topic": "Best animation studios ranked by sakuga quality"
}
```


**Output:**

```json
{
  "signal_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "topic_raw": "Best animation studios ranked by sakuga quality",
  "topic_clean": "Best animation studios ranked by sakuga quality",
  "source": "manual",
  "scores": {
    "engagement": 50,
    "brand_fit": 70,
    "controversy": 40,
    "recency": 50,
    "weighted_total": 52.5
  },
  "channel": "LegendsLabs",
  "mascots": ["AKASHI", "KAGE", "MIRA"],
  "status": "defer",
  "legal_flags": [],
  "timestamp": "2026-08-16T09:20:00Z"
}
```


**Why this output:** Manual topics default to mid-range engagement/controversy/recency. Brand-fit moderate (sakuga/animation match). Weighted total 52.5 → defer status (40-59 range). LegendsLabs channel → Akashi leads.

### Example 3: Stale low-engagement topic (rejected)

**Input:**

```json
{
  "source": "url",
  "url": "https://anilist.co/anime/12345/discussions/old-minor-character-discussion"
}
```


**Output:**

```json
{
  "signal_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "topic_raw": "Old minor character discussion from 2024",
  "topic_clean": "Old minor character discussion from 2024",
  "source": "anilist",
  "source_url": "https://anilist.co/anime/12345/discussions/old-minor-character-discussion",
  "scores": {
    "engagement": 15,
    "brand_fit": 25,
    "controversy": 10,
    "recency": 5,
    "weighted_total": 14.75
  },
  "channel": "Philosophy",
  "mascots": ["MIRA", "KAGE", "AKASHI"],
  "status": "reject",
  "legal_flags": [],
  "timestamp": "2026-08-16T09:25:00Z"
}
```


**Why this output:** Topic is >96h old (recency score 5), low engagement (15), weak brand-fit. Weighted total 14.75 < 40 → reject. Not queued for downstream processing.

## Failure modes

- **No configured ingest sources** — If `source=ingest` but Reddit API keys or AniList access is not configured, log error to Grimoire with `status="error"`, return empty manifest, and notify user that manual topic input is required.
- **URL fetch timeout** — If Reddit/AniList URL fetch times out (>10s), retry once after 2s delay. If second attempt fails, log error, set `status="defer"`, and queue for retry in 30 minutes.
- **Legal firewall too aggressive** — If topic is reduced to <5 words after stripping copyrighted refs (e.g., "Why [redacted] is [redacted]"), set `status="reject"`, log to Grimoire with `rationale="topic_too_vague_after_legal_pass"`, do not proceed downstream.
- **All scores zero** — If engagement, brand-fit, controversy, recency all compute to 0 (malformed input), set `status="reject"`, log `rationale="insufficient_signal_data"`.
- **Missing topic** — If `source=manual` but `topic` field is empty or null, return error: `"Manual source requires non-empty topic string"`.

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage`: `"signal-forge"`
- `input_id`: `null` (first stage, no upstream manifest)
- `output_id`: `signal_id` from generated `SignalManifest`
- `decision`: `"accept"` | `"defer"` | `"reject"` | `"error"`
- `rationale`: one-line explanation (e.g., `"high_engagement_philosophy_topic"`, `"stale_low_engagement"`, `"legal_firewall_blocked"`)
- `cost_usd`: `0.00` (no paid API calls at this stage)
- `duration_ms`: elapsed time from input receipt to manifest generation
- `legal_flags`: array of detected copyrighted references (empty if none)

## Legal firewall

This skill enforces strict copyright filtering on all external content.

### Copyrighted reference database

Maintained in `brand/never-say.md` (not in this repo — see AnimeLegends studio monorepo). Database includes:
- Character names from Shonen Jump franchises (Naruto, One Piece, Bleach, Jujutsu Kaisen, My Hero Academia, Dragon Ball, etc.)
- Studio Ghibli, Trigger, Ufotable, Mappa character and series names
- Franchise-specific terminology (e.g., "Sharingan", "Hollow", "Quirk", "Stand", "Bankai")

### Replacement behavior

- Character name → `[redacted character]`
- Series name → `[redacted series]`
- Franchise term → `[generic equivalent]` (e.g., "Sharingan" → "special eye technique")

### Override

Manual topics can set `override_legal=true` to bypass substitution (e.g., for fair-use commentary), but detected refs are still logged to `legal_flags` array for audit trail.

### AnimeLegends original IP

The following are AnimeLegends original characters and are NEVER filtered:
- **AKASHI** — wisdom keeper, deep reverb voice
- **KAGE** — shadow analyst, metallic clarity
- **MIRA** — wonder guide, warm curious tone

## Quality gates

- [ ] Output `SignalManifest` has all required fields (signal_id, topic_raw, topic_clean, source, scores, channel, mascots, status, legal_flags, timestamp)
- [ ] `signal_id` is valid UUID v4
- [ ] `topic_clean` is non-empty and ≥5 words after legal pass
- [ ] `scores.weighted_total` is correctly computed: `(engagement * 0.35) + (brand_fit * 0.30) + (controversy * 0.20) + (recency * 0.15)`
- [ ] `status` matches weighted_total thresholds: ≥60 accept, 40-59 defer, <40 reject
- [ ] `channel` is one of: PowerScaling, Philosophy, LoreDrop, TrainingArc, LegendsLabs
- [ ] `mascots` array has exactly 3 elements from {MIRA, KAGE, AKASHI}
- [ ] `legal_flags` array populated if copyrighted refs detected
- [ ] Grimoire log entry created with all required fields
- [ ] No copyrighted character names in `topic_clean` unless `override_legal=true`

## Changelog


### 0.1.0 — 2026-08-16

- Initial release
- 4-axis scoring rubric (engagement 35%, brand-fit 30%, controversy 20%, recency 15%)
- Legal firewall with copyrighted reference stripping
- Channel and mascot assignment logic
- Accept/defer/reject status based on weighted score thresholds
- Grimoire logging integration
