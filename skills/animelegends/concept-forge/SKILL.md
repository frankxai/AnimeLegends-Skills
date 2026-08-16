---
name: concept-forge
description: Maps topic to archetype taxonomy, assigns trinity mascots with narrative roles (Mira opens, Kage measures, Akashi closes), selects hook formula, decides duration (30/45/60s), designs payoff, outputs ConceptManifest with A/B hook variants.
type: core
version: 0.1.0
when_to_use: |
  Stage 2 of the AnimeLegends pipeline. Receives SignalManifest from signal-forge or a raw topic string. Does NOT generate scripts or visuals — only narrative structure and concept architecture.
---

# concept-forge

## Intent

Second stage of the AnimeLegends generative pipeline. Receives validated topic from `signal-forge` (or raw topic if invoked directly), maps it to an archetype from the Atlas taxonomy (47 narrative archetypes covering power systems, philosophy, character arcs, world-building), assigns trinity mascot roles (Mira opens with curiosity, Kage measures/analyzes, Akashi closes with synthesis), selects one of six hook formulas optimized for retention (Question Hook, Contradiction Hook, Bold Claim Hook, Unsolved Mystery Hook, Ranked Reveal Hook, Behind-the-Scenes Hook), decides video duration (30s/45s/60s) based on channel and topic depth, designs the payoff beat, and outputs a `ConceptManifest` with A/B hook variants for downstream testing.

## Inputs

What this skill expects to receive:

```typescript
interface ConceptForgeInput {
  signal_manifest?: SignalManifest;     // from signal-forge (preferred)
  topic?: string;                       // raw topic string if invoked directly
  duration_override?: 30 | 45 | 60;     // force specific duration (optional)
  hook_formula_override?: string;       // force specific hook formula (optional)
}
```

Source of input: `SignalManifest` from `signal-forge`, or direct user invocation with topic string.

## Outputs

What this skill produces:

```typescript
interface ConceptManifest {
  concept_id: string;                   // UUID v4
  signal_id?: string;                   // parent signal UUID if from signal-forge
  topic: string;                        // clean topic text
  archetype: {
    name: string;                       // from Atlas taxonomy (e.g., "PowerSystemEvolution")
    category: string;                   // "power" | "philosophy" | "character" | "world"
    atlas_id: string;                   // stable ID from Atlas (e.g., "ATL-PS-07")
  };
  channel: string;                      // PowerScaling | Philosophy | LoreDrop | TrainingArc | LegendsLabs
  duration_sec: 30 | 45 | 60;           // video length
  mascot_roles: {
    opener: string;                     // "MIRA" | "KAGE" | "AKASHI"
    measurer: string;                   // "MIRA" | "KAGE" | "AKASHI"
    closer: string;                     // "MIRA" | "KAGE" | "AKASHI"
  };
  hook_formula: string;                 // "Question" | "Contradiction" | "BoldClaim" | "Mystery" | "Ranked" | "BTS"
  hook_variants: {
    variant_a: string;                  // hook text option A
    variant_b: string;                  // hook text option B
  };
  payoff: {
    beat: string;                       // final reveal / synthesis (1 sentence)
    cta: string;                        // call-to-action (e.g., "Follow for more lore drops")
  };
  narrative_beats: number;              // 3 | 5 | 8 (beat structure based on duration)
  timestamp: string;                    // ISO 8601
}
```

Where the output goes: passed to `script-forge` as input, logged to `grimoire-keeper`.

## Core logic / rules

1. **Input normalization** — If `signal_manifest` provided, extract `topic_clean`, `channel`, `mascots` array, and `signal_id`. If only `topic` provided, assign default channel (Philosophy), default mascots (MIRA, KAGE, AKASHI), set `signal_id=null`.

2. **Archetype mapping** — Query Atlas taxonomy (47 archetypes) via keyword matching. Match topic against archetype keywords:
   - **Power category**: "PowerSystemEvolution" (ATL-PS-07), "TierHierarchy" (ATL-PS-12), "AbilityCounters" (ATL-PS-18), etc.
   - **Philosophy category**: "DualitySymbolism" (ATL-PH-03), "MoralGrayness" (ATL-PH-09), "ExistentialTheme" (ATL-PH-14), etc.
   - **Character category**: "MentorSacrifice" (ATL-CH-05), "FallFromGrace" (ATL-CH-11), "RedemptionArc" (ATL-CH-22), etc.
   - **World category**: "LoreLayering" (ATL-WD-08), "HiddenHistory" (ATL-WD-15), "WorldBuildingEconomy" (ATL-WD-21), etc.
   - Default: "GenericAnalysis" (ATL-GEN-01) if no strong match.

3. **Mascot role assignment** — Assign trinity roles based on channel and archetype:
   - **Opener**: always MIRA for Philosophy/LoreDrop/TrainingArc; AKASHI for PowerScaling/LegendsLabs (expertise assertion).
   - **Measurer**: always KAGE (analytical dissection).
   - **Closer**: AKASHI for PowerScaling/Philosophy (synthesis/verdict); MIRA for TrainingArc (warmth); KAGE for LegendsLabs (technical rigor).

4. **Duration selection** — Assign video length based on topic complexity and channel:
   - **30s**: PowerScaling simple comparisons, quick LoreDrop facts, single-beat reveals.
   - **45s**: Philosophy mid-depth, character arc summaries, multi-factor analysis.
   - **60s**: complex power systems, deep lore theories, production breakdowns (LegendsLabs).
   - Respect `duration_override` if provided.

5. **Hook formula selection** — Choose from six retention-optimized formulas:
   - **Question Hook**: "What if I told you [surprising claim]?" (Philosophy, LoreDrop)
   - **Contradiction Hook**: "Everyone thinks X, but actually Y" (PowerScaling, Philosophy)
   - **Bold Claim Hook**: "This is the most [superlative] in all of anime" (PowerScaling, LegendsLabs)
   - **Unsolved Mystery Hook**: "No one talks about [hidden detail]" (LoreDrop, TrainingArc)
   - **Ranked Reveal Hook**: "Here's why [X] ranks above [Y]" (PowerScaling, LegendsLabs)
   - **Behind-the-Scenes Hook**: "The studio did something genius here" (LegendsLabs only)
   - Respect `hook_formula_override` if provided.

6. **Hook variant generation** — Generate two hook text variants (A/B) using selected formula. Each variant must be ≤15 words, start with mascot opener's voice style, and front-load the surprise/tension.

7. **Payoff design** — Craft the final beat (synthesis or reveal that resolves the hook tension) and a channel-appropriate CTA (e.g., "Follow for power system breakdowns", "Drop your theory below").

8. **Narrative beat structure** — Assign beat count based on duration:
   - 30s → 3 beats (hook, analysis, payoff)
   - 45s → 5 beats (hook, context, analysis, twist, payoff)
   - 60s → 8 beats (hook, context, evidence 1, evidence 2, counterpoint, synthesis, payoff, CTA)

9. **Manifest generation** — Populate `ConceptManifest` with all fields, generate UUID for `concept_id`, set `timestamp` to ISO 8601 UTC.

10. **Grimoire logging** — Log invocation to `grimoire-keeper` with `stage="concept-forge"`, `input_id=signal_id`, `output_id=concept_id`, `decision="accept"` (no rejection at this stage), `rationale` (one-line: archetype + hook selected), `duration_ms`.

## Worked examples

### Example 1: Philosophy topic, 45s duration

**Input:**
```json
{
  "signal_manifest": {
    "signal_id": "550e8400-e29b-41d4-a716-446655440000",
    "topic_clean": "Why [redacted character]'s Domain is philosophically perfect",
    "channel": "Philosophy",
    "mascots": ["MIRA", "KAGE", "AKASHI"]
  }
}
```

**Output:**
```json
{
  "concept_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "signal_id": "550e8400-e29b-41d4-a716-446655440000",
  "topic": "Why [redacted character]'s Domain is philosophically perfect",
  "archetype": {
    "name": "DualitySymbolism",
    "category": "philosophy",
    "atlas_id": "ATL-PH-03"
  },
  "channel": "Philosophy",
  "duration_sec": 45,
  "mascot_roles": {
    "opener": "MIRA",
    "measurer": "KAGE",
    "closer": "AKASHI"
  },
  "hook_formula": "Question",
  "hook_variants": {
    "variant_a": "What if a Domain could express pure philosophy through technique alone?",
    "variant_b": "Can a single ability contain an entire worldview? Let's explore."
  },
  "payoff": {
    "beat": "The Domain isn't just power—it's the character's philosophy made tangible, proving theme and technique are one.",
    "cta": "Follow for more philosophy deep-dives"
  },
  "narrative_beats": 5,
  "timestamp": "2026-08-16T09:30:00Z"
}
```

**Why this output:** Philosophy topic → DualitySymbolism archetype. 45s for mid-depth analysis. MIRA opens (Philosophy channel), KAGE measures, AKASHI closes. Question Hook chosen for philosophical intrigue. 5-beat structure for 45s.

### Example 2: PowerScaling topic, 30s duration

**Input:**
```json
{
  "topic": "Why speed doesn't always beat raw power in battle",
  "duration_override": 30
}
```

**Output:**
```json
{
  "concept_id": "f7e6d5c4-b3a2-9180-7654-321098fedcba",
  "topic": "Why speed doesn't always beat raw power in battle",
  "archetype": {
    "name": "AbilityCounters",
    "category": "power",
    "atlas_id": "ATL-PS-18"
  },
  "channel": "PowerScaling",
  "duration_sec": 30,
  "mascot_roles": {
    "opener": "AKASHI",
    "measurer": "KAGE",
    "closer": "AKASHI"
  },
  "hook_formula": "Contradiction",
  "hook_variants": {
    "variant_a": "Everyone says speed wins—but they're missing something critical.",
    "variant_b": "Speed versus power? The answer isn't what you think."
  },
  "payoff": {
    "beat": "AOE attacks, prediction, and zone control neutralize speed—raw power wins through board dominance.",
    "cta": "Follow for power system analysis"
  },
  "narrative_beats": 3,
  "timestamp": "2026-08-16T09:35:00Z"
}
```

**Why this output:** PowerScaling topic → AbilityCounters archetype. 30s override respected. AKASHI opens (expertise assertion) and closes (verdict). Contradiction Hook chosen (challenges common belief). 3-beat structure for quick comparison.

### Example 3: LegendsLabs topic, 60s duration

**Input:**
```json
{
  "topic": "How one studio perfected the sakuga slow-motion cut",
  "hook_formula_override": "BTS"
}
```

**Output:**
```json
{
  "concept_id": "9876fedc-ba09-8765-4321-0fedcba98765",
  "topic": "How one studio perfected the sakuga slow-motion cut",
  "archetype": {
    "name": "ProductionInnovation",
    "category": "world",
    "atlas_id": "ATL-WD-28"
  },
  "channel": "LegendsLabs",
  "duration_sec": 60,
  "mascot_roles": {
    "opener": "AKASHI",
    "measurer": "KAGE",
    "closer": "KAGE"
  },
  "hook_formula": "BTS",
  "hook_variants": {
    "variant_a": "This studio broke the rules of animation—and created a signature move.",
    "variant_b": "The secret behind anime's most iconic slow-motion cuts? Pure genius."
  },
  "payoff": {
    "beat": "By timing smears to 3-frame windows and layering particle FX, they turned technique into art—now every studio copies it.",
    "cta": "Follow for animation breakdowns"
  },
  "narrative_beats": 8,
  "timestamp": "2026-08-16T09:40:00Z"
}
```

**Why this output:** LegendsLabs production topic → ProductionInnovation archetype. 60s for deep technical breakdown. AKASHI opens (expertise), KAGE measures and closes (technical rigor). BTS Hook override respected. 8-beat structure for 60s detailed analysis.

## Failure modes

- **Unknown archetype** — If topic keywords don't match any of the 47 Atlas archetypes, assign "GenericAnalysis" (ATL-GEN-01) and log warning to Grimoire. Proceed with concept generation.
- **Invalid duration override** — If `duration_override` is not 30, 45, or 60, ignore override, compute duration from topic complexity, and log warning.
- **Invalid hook formula override** — If `hook_formula_override` is not one of the six valid formulas, ignore override, select formula based on channel, and log warning.
- **Missing mascot roles from signal** — If `signal_manifest.mascots` array is malformed or empty, use default trinity: [MIRA, KAGE, AKASHI] and log warning.
- **Empty topic** — If both `signal_manifest` and `topic` are null/empty, abort with error: `"concept-forge requires SignalManifest or topic string"`, log to Grimoire with `decision="error"`.

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage`: `"concept-forge"`
- `input_id`: `signal_id` from input (or `null` if invoked directly)
- `output_id`: `concept_id` from generated `ConceptManifest`
- `decision`: `"accept"` (no rejection at concept stage)
- `rationale`: one-line explanation (e.g., `"Philosophy_DualitySymbolism_QuestionHook_45s"`)
- `cost_usd`: `0.00` (no paid API calls at this stage)
- `duration_ms`: elapsed time from input receipt to manifest generation
- `archetype`: Atlas archetype ID selected

## Legal firewall

This skill does not generate external content or invoke image/video models. Legal filtering was applied upstream in `signal-forge`, so `topic` field in input is already sanitized. No additional legal checks required at concept stage.

## Quality gates

- [ ] Output `ConceptManifest` has all required fields (concept_id, topic, archetype, channel, duration_sec, mascot_roles, hook_formula, hook_variants, payoff, narrative_beats, timestamp)
- [ ] `concept_id` is valid UUID v4
- [ ] `archetype.atlas_id` matches Atlas taxonomy format (ATL-XX-NN)
- [ ] `duration_sec` is one of: 30, 45, 60
- [ ] `mascot_roles` has exactly three keys: opener, measurer, closer; each value is MIRA, KAGE, or AKASHI
- [ ] `hook_formula` is one of: Question, Contradiction, BoldClaim, Mystery, Ranked, BTS
- [ ] `hook_variants.variant_a` and `hook_variants.variant_b` are each ≤15 words
- [ ] `narrative_beats` matches duration: 30s→3, 45s→5, 60s→8
- [ ] `payoff.beat` is non-empty (≥10 words)
- [ ] `payoff.cta` is non-empty and channel-appropriate
- [ ] Grimoire log entry created with all required fields

## Changelog

### 0.1.0 — 2026-08-16
- Initial release
- Atlas taxonomy integration (47 archetypes across 4 categories)
- Trinity mascot role assignment (opener/measurer/closer)
- Six hook formula types with A/B variant generation
- Duration-based narrative beat structure (3/5/8 beats)
- Payoff design with channel-specific CTAs
- Grimoire logging integration
