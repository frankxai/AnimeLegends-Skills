---
name: script-forge
description: Writes dialogue and scene structure in mascot voice (AKASHI 2.0wps deep reverb, KAGE 2.5-3.0wps metallic, MIRA 2.0-2.5wps warm). 3/5/8-beat templates. Outputs ScriptManifest with timed dialogue, scene breakdowns, caption text.
type: core
version: 0.1.0
when_to_use: |
  Stage 3 of the AnimeLegends pipeline. Receives ConceptManifest from concept-forge. Does NOT generate imagery, audio, or video — only dialogue script and scene structure for downstream composition.
---

# script-forge

## Intent

Third stage of the AnimeLegends generative pipeline. Receives narrative architecture from `concept-forge`, writes dialogue in strict mascot voice guidelines (AKASHI: 2.0 words-per-second, deep reverb, authoritative; KAGE: 2.5-3.0 wps, metallic clarity, analytical; MIRA: 2.0-2.5 wps, warm, curious), structures scenes according to beat templates (3-beat for 30s, 5-beat for 45s, 8-beat for 60s), generates platform-specific caption text (with and without emojis), and outputs a `ScriptManifest` with timed dialogue blocks, scene descriptions, and mascot speaker assignments for `storyboard-forge` to translate into visuals.

## Inputs

What this skill expects to receive:

```typescript
interface ScriptForgeInput {
  concept_manifest: ConceptManifest;    // from concept-forge (required)
  caption_style?: "minimal" | "emoji"; // caption preference (default: minimal)
}
```

Source of input: `ConceptManifest` from `concept-forge`.

## Outputs

What this skill produces:

```typescript
interface ScriptManifest {
  script_id: string;                    // UUID v4
  concept_id: string;                   // parent concept UUID
  topic: string;                        // clean topic text
  duration_sec: 30 | 45 | 60;           // video length
  beats: Array<{
    beat_num: number;                   // 1-indexed
    start_sec: number;                  // start timestamp
    end_sec: number;                    // end timestamp
    speaker: string;                    // "MIRA" | "KAGE" | "AKASHI"
    dialogue: string;                   // spoken text
    scene_description: string;          // visual intent (1-2 sentences)
    wps_target: number;                 // words-per-second for this speaker
  }>;
  captions: {
    minimal: string;                    // plain text caption
    emoji: string;                      // caption with channel-appropriate emojis
  };
  total_words: number;                  // sum of all dialogue words
  timestamp: string;                    // ISO 8601
}
```

Where the output goes: passed to `storyboard-forge` as input, logged to `grimoire-keeper`.

## Core logic / rules

1. **Voice profile enforcement** — Apply strict voice rules per mascot:
   - **AKASHI**: 2.0 wps, deep reverb (authority, finality), sentence structure: declarative, uses "we know", "the truth is", "here's why". Vocabulary: elevated, precise. Closes with synthesis.
   - **KAGE**: 2.5-3.0 wps, metallic clarity (analytical speed), sentence structure: questioning, dissecting. Uses "but consider", "the data shows", "measure this". Vocabulary: technical, evidence-based.
   - **MIRA**: 2.0-2.5 wps, warm curious tone (invites exploration), sentence structure: open, wondering. Uses "what if", "imagine", "let's explore". Vocabulary: accessible, vivid.

2. **Beat template selection** — Load template based on `concept_manifest.duration_sec` and `narrative_beats`:
   - **3-beat (30s)**: Hook (0-10s), Analysis (10-23s), Payoff (23-30s)
   - **5-beat (45s)**: Hook (0-9s), Context (9-18s), Analysis (18-30s), Twist (30-38s), Payoff (38-45s)
   - **8-beat (60s)**: Hook (0-7s), Context (7-14s), Evidence 1 (14-23s), Evidence 2 (23-32s), Counterpoint (32-41s), Synthesis (41-50s), Payoff (50-56s), CTA (56-60s)

3. **Mascot speaker assignment** — Map beats to speakers using `concept_manifest.mascot_roles`:
   - Beat 1 (Hook): always `opener` mascot
   - Middle beats (Context/Analysis/Evidence): rotate `measurer` and non-closer mascots
   - Final beat (Payoff): always `closer` mascot
   - CTA beat (if 8-beat): always `closer` mascot

4. **Dialogue generation** — Write dialogue for each beat following these rules:
   - **Word count per beat**: `(end_sec - start_sec) * wps_target` (±10% tolerance)
   - **Hook beat**: must integrate one of the `hook_variants` from concept, rephrase in speaker's voice
   - **Payoff beat**: must deliver `payoff.beat` from concept, rephrase in speaker's voice
   - **Scene transitions**: when speaker changes between beats, add vocal handoff cue (e.g., MIRA: "Kage, break it down" → KAGE: "Look at the evidence...")

5. **Scene descriptions** — For each beat, write 1-2 sentence visual intent:
   - Describe mascot (if on-screen), environment tone (dark/bright/abstract), key visual element (chart, symbol, character silhouette), camera intent (close-up, wide, dynamic pan).
   - Example: "MIRA on-screen, warm library glow, ancient scroll unfurling. Camera slow push-in to emphasize curiosity."

6. **Caption generation** — Produce two caption variants:
   - **Minimal**: topic rephrased as statement + channel tag. 120-150 chars. No emojis. Example: "Why speed doesn't always beat power in anime battles. #PowerScaling"
   - **Emoji**: same as minimal but with 2-3 channel-appropriate emojis. Example: "Why speed doesn't always beat power in anime battles ⚡💥 #PowerScaling"

7. **Word count validation** — Sum `dialogue` words across all beats, store in `total_words`. Compare to expected: `duration_sec * 2.0` (conservative average wps). If off by >20%, log warning to Grimoire but proceed.

8. **Manifest generation** — Populate `ScriptManifest` with all fields, generate UUID for `script_id`, set `timestamp` to ISO 8601 UTC.

9. **Grimoire logging** — Log invocation to `grimoire-keeper` with `stage="script-forge"`, `input_id=concept_id`, `output_id=script_id`, `decision="accept"`, `rationale` (one-line: beat template + word count), `duration_ms`.

## Worked examples

### Example 1: 30s PowerScaling script, 3-beat

**Input:**

```json
{
  "concept_manifest": {
    "concept_id": "f7e6d5c4-b3a2-9180-7654-321098fedcba",
    "topic": "Why speed doesn't always beat raw power in battle",
    "channel": "PowerScaling",
    "duration_sec": 30,
    "mascot_roles": { "opener": "AKASHI", "measurer": "KAGE", "closer": "AKASHI" },
    "hook_variants": { "variant_a": "Everyone says speed wins—but they're missing something critical." },
    "payoff": { "beat": "AOE attacks, prediction, and zone control neutralize speed—raw power wins through board dominance." },
    "narrative_beats": 3
  }
}
```

**Output:**

```json
{
  "script_id": "abc12345-6789-def0-1234-56789abcdef0",
  "concept_id": "f7e6d5c4-b3a2-9180-7654-321098fedcba",
  "topic": "Why speed doesn't always beat raw power in battle",
  "duration_sec": 30,
  "beats": [
    {
      "beat_num": 1,
      "start_sec": 0,
      "end_sec": 10,
      "speaker": "AKASHI",
      "dialogue": "Everyone believes speed always wins. They're wrong. Here's the truth most miss.",
      "scene_description": "AKASHI center frame, dark void with golden particles. Camera tight on eyes, authority radiating.",
      "wps_target": 2.0
    },
    {
      "beat_num": 2,
      "start_sec": 10,
      "end_sec": 23,
      "speaker": "KAGE",
      "dialogue": "Speed means nothing against area-of-effect. A fast fighter can't dodge an attack that covers the entire field. Add prediction and zone control, and raw power dominates every time.",
      "scene_description": "KAGE appears, metallic echo chamber. Floating diagrams: AOE circle vs speed vector. Camera orbits the analysis.",
      "wps_target": 2.5
    },
    {
      "beat_num": 3,
      "start_sec": 23,
      "end_sec": 30,
      "speaker": "AKASHI",
      "dialogue": "Board control beats footwork. Power doesn't chase speed—it removes the board. Follow for more breakdowns.",
      "scene_description": "AKASHI returns, chessboard shatters underfoot. Camera pull-back to reveal dominance. Gold brand bumper fades in.",
      "wps_target": 2.0
    }
  ],
  "captions": {
    "minimal": "Why speed doesn't always beat raw power in anime battles. #PowerScaling",
    "emoji": "Why speed doesn't always beat raw power in anime battles ⚡💥 #PowerScaling"
  },
  "total_words": 62,
  "timestamp": "2026-08-16T09:45:00Z"
}
```

**Why this output:** 3-beat template for 30s. AKASHI opens (10s, 2.0 wps = ~20 words) and closes (7s, 2.0 wps = ~14 words). KAGE measures (13s, 2.5 wps = ~32 words). Hook and payoff integrated. Total 62 words ≈ 2.07 wps average.

### Example 2: 45s Philosophy script, 5-beat

**Input:**

```json
{
  "concept_manifest": {
    "concept_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "topic": "Why [redacted character]'s Domain is philosophically perfect",
    "channel": "Philosophy",
    "duration_sec": 45,
    "mascot_roles": { "opener": "MIRA", "measurer": "KAGE", "closer": "AKASHI" },
    "hook_variants": { "variant_a": "What if a Domain could express pure philosophy through technique alone?" },
    "payoff": { "beat": "The Domain isn't just power—it's the character's philosophy made tangible, proving theme and technique are one." },
    "narrative_beats": 5
  }
}
```

**Output:**

```json
{
  "script_id": "def67890-abcd-1234-ef56-7890abcdef12",
  "concept_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "topic": "Why [redacted character]'s Domain is philosophically perfect",
  "duration_sec": 45,
  "beats": [
    {
      "beat_num": 1,
      "start_sec": 0,
      "end_sec": 9,
      "speaker": "MIRA",
      "dialogue": "Imagine a technique that embodies an entire worldview. What if a Domain could be pure philosophy?",
      "scene_description": "MIRA emerges in soft library glow. Ancient texts float. Camera drifts forward with gentle curiosity.",
      "wps_target": 2.0
    },
    {
      "beat_num": 2,
      "start_sec": 9,
      "end_sec": 18,
      "speaker": "KAGE",
      "dialogue": "Most abilities reflect personality. But this Domain reflects belief. The structure, the rules, even the space itself—every element mirrors a philosophical stance.",
      "scene_description": "KAGE steps into frame, metallic void. Geometric Domain blueprint unfolds. Camera pulls back to reveal symmetry.",
      "wps_target": 2.5
    },
    {
      "beat_num": 3,
      "start_sec": 18,
      "end_sec": 30,
      "speaker": "MIRA",
      "dialogue": "It's not decoration. The Domain's mechanics force opponents to confront the user's truth. Accept the philosophy, or lose. That's the genius—combat becomes dialogue.",
      "scene_description": "MIRA gestures, philosophical symbols materialize: dualism, infinity, truth. Camera slow orbit, contemplative.",
      "wps_target": 2.25
    },
    {
      "beat_num": 4,
      "start_sec": 30,
      "end_sec": 38,
      "speaker": "KAGE",
      "dialogue": "Consider this: the Domain's weakness is also philosophical. To counter it, you must deconstruct the belief itself. Meta-combat.",
      "scene_description": "KAGE analyzes, Domain cracks appear. Camera zooms into fractures—each crack a counter-argument.",
      "wps_target": 2.5
    },
    {
      "beat_num": 5,
      "start_sec": 38,
      "end_sec": 45,
      "speaker": "AKASHI",
      "dialogue": "The Domain isn't power. It's philosophy made real. Technique and theme—one truth. Follow for deeper dives.",
      "scene_description": "AKASHI appears, golden synthesis glow. Domain and philosophy symbol merge. Camera holds, authority confirmed.",
      "wps_target": 2.0
    }
  ],
  "captions": {
    "minimal": "Why this Domain is philosophically perfect in anime storytelling. #Philosophy",
    "emoji": "Why this Domain is philosophically perfect in anime storytelling 🧠✨ #Philosophy"
  },
  "total_words": 95,
  "timestamp": "2026-08-16T09:50:00Z"
}
```

**Why this output:** 5-beat template for 45s. MIRA opens and handles beat 3 (exploration). KAGE measures (beats 2 and 4, analytical dissection). AKASHI closes with synthesis. Hook and payoff integrated in mascot voices. Total 95 words ≈ 2.11 wps average.

### Example 3: 60s LegendsLabs script, 8-beat

**Input:**

```json
{
  "concept_manifest": {
    "concept_id": "9876fedc-ba09-8765-4321-0fedcba98765",
    "topic": "How one studio perfected the sakuga slow-motion cut",
    "channel": "LegendsLabs",
    "duration_sec": 60,
    "mascot_roles": { "opener": "AKASHI", "measurer": "KAGE", "closer": "KAGE" },
    "hook_variants": { "variant_a": "This studio broke the rules of animation—and created a signature move." },
    "payoff": { "beat": "By timing smears to 3-frame windows and layering particle FX, they turned technique into art—now every studio copies it." },
    "narrative_beats": 8
  }
}
```

**Output:**

```json
{
  "script_id": "fedcba98-7654-3210-fedc-ba9876543210",
  "concept_id": "9876fedc-ba09-8765-4321-0fedcba98765",
  "topic": "How one studio perfected the sakuga slow-motion cut",
  "duration_sec": 60,
  "beats": [
    {
      "beat_num": 1,
      "start_sec": 0,
      "end_sec": 7,
      "speaker": "AKASHI",
      "dialogue": "One studio broke animation's rules. They created a signature no one else could match.",
      "scene_description": "AKASHI center, dark studio space. Animator desk glows. Camera tight, authority.",
      "wps_target": 2.0
    },
    {
      "beat_num": 2,
      "start_sec": 7,
      "end_sec": 14,
      "speaker": "KAGE",
      "dialogue": "Traditional sakuga uses 8 to 12 frames per second for impact cuts. Standard, clean, predictable. But this studio asked: what if we compress time differently?",
      "scene_description": "KAGE appears, frame-by-frame timeline. Camera pans across traditional 12fps cuts.",
      "wps_target": 2.5
    },
    {
      "beat_num": 3,
      "start_sec": 14,
      "end_sec": 23,
      "speaker": "KAGE",
      "dialogue": "They discovered the 3-frame smear window. Three consecutive frames with motion blur timed to 24fps creates a slow-motion illusion without actually slowing playback. Genius efficiency.",
      "scene_description": "KAGE dissects: 3-frame window highlighted. Smear layers isolated. Camera zooms into frame precision.",
      "wps_target": 2.8
    },
    {
      "beat_num": 4,
      "start_sec": 23,
      "end_sec": 32,
      "speaker": "MIRA",
      "dialogue": "But the secret sauce? Particle FX layering. They add light bloom, dust trails, and impact sparks on separate compositing layers. Each particle timed to the smear window.",
      "scene_description": "MIRA enters, particle effects bloom in slow-mo. Camera orbits the layered composition.",
      "wps_target": 2.25
    },
    {
      "beat_num": 5,
      "start_sec": 32,
      "end_sec": 41,
      "speaker": "KAGE",
      "dialogue": "Critics said it was too expensive. Three animators per cut, compositing overhead doubled. But audience retention spiked. The cut became their brand. Cost justified by engagement.",
      "scene_description": "KAGE presents cost chart vs engagement spike graph. Camera holds on intersection point.",
      "wps_target": 2.5
    },
    {
      "beat_num": 6,
      "start_sec": 41,
      "end_sec": 50,
      "speaker": "KAGE",
      "dialogue": "By 2024, five other studios copied the technique. But they lack the timing discipline. The original studio still owns it because they respect the 3-frame law.",
      "scene_description": "KAGE shows comparison: original vs imitations. Camera split-screen, precision difference clear.",
      "wps_target": 2.5
    },
    {
      "beat_num": 7,
      "start_sec": 50,
      "end_sec": 56,
      "speaker": "KAGE",
      "dialogue": "Three-frame smear. Layered particles. Discipline. That's how you turn technique into signature art.",
      "scene_description": "KAGE final analysis, formula overlays the frame. Camera slow zoom, technical mastery.",
      "wps_target": 2.5
    },
    {
      "beat_num": 8,
      "start_sec": 56,
      "end_sec": 60,
      "speaker": "KAGE",
      "dialogue": "Follow for more animation breakdowns. The craft is in the details.",
      "scene_description": "KAGE holds frame, brand bumper fades in. Camera holds, CTA emphasized.",
      "wps_target": 2.0
    }
  ],
  "captions": {
    "minimal": "How one studio perfected the sakuga slow-motion cut. #LegendsLabs #Animation",
    "emoji": "How one studio perfected the sakuga slow-motion cut 🎬✨ #LegendsLabs #Animation"
  },
  "total_words": 140,
  "timestamp": "2026-08-16T09:55:00Z"
}
```

**Why this output:** 8-beat template for 60s deep dive. AKASHI opens (7s, authority). KAGE dominates (beats 2,3,5,6,7,8—technical dissection, closer role). MIRA interjects (beat 4, humanizing particle detail). Total 140 words ≈ 2.33 wps average. Hook and payoff integrated.

## Failure modes

- **Missing concept manifest** — If `concept_manifest` is null/empty, abort with error: `"script-forge requires ConceptManifest input"`, log to Grimoire with `decision="error"`.
- **Invalid mascot roles** — If `concept_manifest.mascot_roles` is malformed (missing opener/measurer/closer), use default trinity: opener=MIRA, measurer=KAGE, closer=AKASHI, log warning.
- **Word count overshoot** — If generated dialogue exceeds `(duration_sec * wps_target * 1.2)` (20% buffer), truncate final beat dialogue to fit, log warning to Grimoire.
- **Word count undershoot** — If generated dialogue is <`(duration_sec * wps_target * 0.8)` (20% buffer), expand middle beats with additional evidence/examples, log warning.
- **Hook variant missing** — If `concept_manifest.hook_variants.variant_a` is empty, generate generic hook in opener mascot's voice, log warning.

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage`: `"script-forge"`
- `input_id`: `concept_id` from input
- `output_id`: `script_id` from generated `ScriptManifest`
- `decision`: `"accept"` (no rejection at script stage)
- `rationale`: one-line explanation (e.g., `"3-beat_PowerScaling_62words"`)
- `cost_usd`: `0.00` (no paid API calls at this stage)
- `duration_ms`: elapsed time from input receipt to manifest generation
- `total_words`: total dialogue word count
- `wps_average`: `total_words / duration_sec`

## Legal firewall

This skill does not generate external content or invoke image/video models. Legal filtering was applied upstream in `signal-forge`, so `topic` field in input is already sanitized. Dialogue generation adheres to original AnimeLegends mascot IP (AKASHI, KAGE, MIRA). No additional legal checks required at script stage.

## Quality gates

- [ ] Output `ScriptManifest` has all required fields (script_id, concept_id, topic, duration_sec, beats, captions, total_words, timestamp)
- [ ] `script_id` is valid UUID v4
- [ ] `beats` array length matches `concept_manifest.narrative_beats` (3, 5, or 8)
- [ ] Each beat has: beat_num (1-indexed), start_sec, end_sec, speaker, dialogue, scene_description, wps_target
- [ ] Beat timestamps are contiguous: beat[n].end_sec == beat[n+1].start_sec
- [ ] Final beat.end_sec == duration_sec
- [ ] First beat speaker == concept_manifest.mascot_roles.opener
- [ ] Final beat speaker == concept_manifest.mascot_roles.closer
- [ ] `total_words` sum matches actual dialogue word count (±5 words tolerance)
- [ ] Average wps (`total_words / duration_sec`) is between 1.8 and 3.2 wps
- [ ] `captions.minimal` is 120-150 chars, no emojis
- [ ] `captions.emoji` includes 2-3 emojis
- [ ] Grimoire log entry created with all required fields

## Changelog

### 0.1.0 — 2026-08-16

- Initial release
- Strict mascot voice profiles (AKASHI 2.0wps, KAGE 2.5-3.0wps, MIRA 2.0-2.5wps)
- Beat templates: 3-beat (30s), 5-beat (45s), 8-beat (60s)
- Scene descriptions for downstream storyboard generation
- Dual caption variants (minimal and emoji)
- Word count validation with 20% tolerance buffers
- Grimoire logging integration
