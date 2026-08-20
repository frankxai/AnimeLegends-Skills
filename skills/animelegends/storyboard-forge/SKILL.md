---
name: storyboard-forge
description: Breaks script into shots with camera angles and emotional mapping, generates image prompts using 4-block Archetype Prompt Structure (STYLE LOCK / SUBJECT / LIGHTING / COMPOSITION), specifies motion intent for video generation.
type: core
version: 0.1.0
when_to_use: |
  Stage 4 of the AnimeLegends pipeline. Receives ScriptManifest from script-forge. Does NOT generate actual images or videos — only prompt engineering and shot planning for gen-director to execute.
---

# storyboard-forge

## Intent

Fourth stage of the AnimeLegends generative pipeline. Receives dialogue and scene structure from `script-forge`, breaks the script into individual shots (1 shot per beat, with optional B-roll inserts), designs camera angles and emotional tone mapping for each shot, generates image prompts using the 4-block Archetype Prompt Structure (STYLE LOCK → SUBJECT → LIGHTING → COMPOSITION) to ensure visual consistency across the AnimeLegends brand, specifies motion intent (camera moves, subject motion) for video generation models, injects LoRA trigger keywords for mascot character consistency, and outputs a `StoryboardManifest` for `gen-director` to execute via image/video model APIs.

## Inputs

What this skill expects to receive:

```typescript
interface StoryboardForgeInput {
  script_manifest: ScriptManifest;      // from script-forge (required)
  shot_density?: "standard" | "cinematic"; // shots per beat (default: standard = 1 shot/beat)
  lora_trigger_mode?: "auto" | "manual"; // LoRA keyword injection (default: auto)
}
```

Source of input: `ScriptManifest` from `script-forge`.

## Outputs

What this skill produces:

```typescript
interface StoryboardManifest {
  storyboard_id: string;                // UUID v4
  script_id: string;                    // parent script UUID
  topic: string;                        // clean topic text
  duration_sec: 30 | 45 | 60;           // video length
  shots: Array<{
    shot_num: number;                   // 1-indexed
    beat_ref: number;                   // links to script beat_num
    start_sec: number;                  // shot start timestamp
    end_sec: number;                    // shot end timestamp
    speaker?: string;                   // "MIRA" | "KAGE" | "AKASHI" if on-screen
    shot_type: string;                  // "mascot" | "broll" | "diagram" | "text"
    image_prompt: string;               // 4-block prompt for image gen
    motion_intent: string;              // motion description for video gen (or "static" for still)
    camera_angle: string;               // "close-up" | "medium" | "wide" | "overhead" | "dutch"
    emotional_tone: string;             // "authority" | "curiosity" | "tension" | "synthesis" | "wonder"
    lora_triggers: string[];            // LoRA keywords if mascot on-screen
  }>;
  brand_style_lock: string;             // global style prefix for all prompts
  timestamp: string;                    // ISO 8601
}
```

Where the output goes: passed to `gen-director` as input, logged to `grimoire-keeper`.

## Core logic / rules

1. **Shot density resolution** — Determine shots per beat:
   - **Standard**: 1 shot per beat (for 3-beat = 3 shots, 5-beat = 5 shots, 8-beat = 8 shots)
   - **Cinematic**: 1-2 shots per beat, with B-roll inserts for beats >10s duration (e.g., 5-beat → 7 shots with B-roll)
   - Default: standard unless `shot_density="cinematic"`.

2. **Shot type assignment** — For each beat in `script_manifest.beats`, assign shot type:
   - **Mascot**: if `beat.speaker` is MIRA/KAGE/AKASHI and scene implies mascot on-screen
   - **B-roll**: environmental or symbolic imagery (no mascot), used for context/evidence beats
   - **Diagram**: charts, graphs, timelines (KAGE analytical beats)
   - **Text**: on-screen text reveal (rare, for key quotes or definitions)

3. **Brand style lock** — Define global style prefix applied to all image prompts:

   ```text
   "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field"
   ```

   This prefix ensures visual consistency across all shots and is prepended to every `image_prompt`.

4. **4-block Archetype Prompt Structure** — Generate image prompts using this modular structure:
   - **Block 1: STYLE LOCK** — `brand_style_lock` (always present)
   - **Block 2: SUBJECT** — what is in frame (mascot + pose, or B-roll subject)
   - **Block 3: LIGHTING** — lighting mood (warm glow, metallic sheen, deep reverb darkness, etc.)
   - **Block 4: COMPOSITION** — camera angle, framing, rule-of-thirds, depth elements
   - **Full prompt format**: `[STYLE LOCK], [SUBJECT], [LIGHTING], [COMPOSITION]`

5. **Mascot LoRA trigger injection** — If `shot_type="mascot"`, inject LoRA trigger keywords for character consistency:
   - **AKASHI**: `lora_triggers: ["akashi_animelegends", "gold_eyes", "deep_authority"]`
   - **KAGE**: `lora_triggers: ["kage_animelegends", "silver_metallic", "analytical_gaze"]`
   - **MIRA**: `lora_triggers: ["mira_animelegends", "warm_amber", "curious_expression"]`
   - These keywords reference LoRA models trained on AnimeLegends mascot designs (assumed available in `gen-director` model router).

6. **Camera angle mapping** — Assign camera angle per shot based on emotional intent:
   - **Close-up**: authority, intimacy, emotional weight (AKASHI synthesis, MIRA wonder)
   - **Medium**: standard dialogue, neutral analysis (KAGE dissection)
   - **Wide**: environmental context, scope (B-roll, establishing shots)
   - **Overhead**: power dynamics, hierarchy (PowerScaling comparisons)
   - **Dutch**: tension, disorientation (controversial topics, counterpoints)

7. **Emotional tone mapping** — Assign emotional tone per shot based on speaker and beat purpose:
   - **Authority**: AKASHI final beats, synthesis, verdict
   - **Curiosity**: MIRA opening beats, exploration, invitation
   - **Tension**: counterpoints, controversial claims, challenge beats
   - **Synthesis**: resolution beats, payoff, CTA
   - **Wonder**: philosophical reveals, lore drops, awe moments

8. **Motion intent specification** — Define motion for video generation:
   - **Mascot shots**: "Subtle camera push-in, mascot slight head turn, background particles drift"
   - **B-roll**: "Slow pan left, depth-of-field rack focus, ambient motion"
   - **Diagram shots**: "Elements animate on-screen sequentially, camera static"
   - **Static**: "No motion, single frame hold" (text reveals, certain diagrams)
   - Motion intent is model-agnostic (interpreted by `gen-director` based on selected video gen model).

9. **Timestamp assignment** — For each shot, calculate `start_sec` and `end_sec` based on linked `beat_ref`:
   - If 1 shot per beat: shot duration = beat duration (`beat.end_sec - beat.start_sec`)
   - If multiple shots per beat (cinematic): split beat duration evenly (e.g., 10s beat → two 5s shots)

10. **Manifest generation** — Populate `StoryboardManifest` with all fields, generate UUID for `storyboard_id`, set `timestamp` to ISO 8601 UTC.

11. **Grimoire logging** — Log invocation to `grimoire-keeper` with `stage="storyboard-forge"`, `input_id=script_id`, `output_id=storyboard_id`, `decision="accept"`, `rationale` (one-line: shot count + style lock applied), `duration_ms`.

## Worked examples

### Example 1: 30s PowerScaling, 3 shots (standard density)

**Input:**

```json
{
  "script_manifest": {
    "script_id": "abc12345-6789-def0-1234-56789abcdef0",
    "topic": "Why speed doesn't always beat raw power in battle",
    "duration_sec": 30,
    "beats": [
      { "beat_num": 1, "start_sec": 0, "end_sec": 10, "speaker": "AKASHI", "dialogue": "Everyone believes speed always wins. They're wrong. Here's the truth most miss.", "scene_description": "AKASHI center frame, dark void with golden particles. Camera tight on eyes, authority radiating." },
      { "beat_num": 2, "start_sec": 10, "end_sec": 23, "speaker": "KAGE", "dialogue": "Speed means nothing against area-of-effect...", "scene_description": "KAGE appears, metallic echo chamber. Floating diagrams: AOE circle vs speed vector. Camera orbits the analysis." },
      { "beat_num": 3, "start_sec": 23, "end_sec": 30, "speaker": "AKASHI", "dialogue": "Board control beats footwork...", "scene_description": "AKASHI returns, chessboard shatters underfoot. Camera pull-back to reveal dominance. Gold brand bumper fades in." }
    ]
  }
}
```

**Output:**

```json
{
  "storyboard_id": "aaaa1111-bbbb-2222-cccc-333344445555",
  "script_id": "abc12345-6789-def0-1234-56789abcdef0",
  "topic": "Why speed doesn't always beat raw power in battle",
  "duration_sec": 30,
  "shots": [
    {
      "shot_num": 1,
      "beat_ref": 1,
      "start_sec": 0,
      "end_sec": 10,
      "speaker": "AKASHI",
      "shot_type": "mascot",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, AKASHI mascot center frame with gold eyes and deep authority expression, dark void background with floating golden particles, close-up camera angle, rule-of-thirds composition with eyes on upper third, dramatic rim lighting",
      "motion_intent": "Subtle camera push-in on AKASHI's eyes, golden particles drift slowly upward, mascot slight head tilt for emphasis",
      "camera_angle": "close-up",
      "emotional_tone": "authority",
      "lora_triggers": ["akashi_animelegends", "gold_eyes", "deep_authority"]
    },
    {
      "shot_num": 2,
      "beat_ref": 2,
      "start_sec": 10,
      "end_sec": 23,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE mascot with silver metallic sheen and analytical gaze, metallic echo chamber environment, floating holographic diagrams showing AOE circle vs speed vector illustration, medium camera angle, technical composition with diagrams in foreground, cool blue-silver lighting",
      "motion_intent": "KAGE gestures, diagrams animate on-screen sequentially (AOE circle expands, speed vector traces path), camera slow orbit around analysis",
      "camera_angle": "medium",
      "emotional_tone": "tension",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 3,
      "beat_ref": 3,
      "start_sec": 23,
      "end_sec": 30,
      "speaker": "AKASHI",
      "shot_type": "mascot",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, AKASHI mascot standing dominant, chessboard shattering underfoot, wide camera angle pulling back to reveal full scene, gold brand bumper fading in at edges, triumphant golden lighting washing over scene",
      "motion_intent": "Chessboard shatters in slow-motion, AKASHI stands firm, camera pull-back to wide shot, brand bumper fades in with gold particle burst",
      "camera_angle": "wide",
      "emotional_tone": "synthesis",
      "lora_triggers": ["akashi_animelegends", "gold_eyes", "deep_authority"]
    }
  ],
  "brand_style_lock": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field",
  "timestamp": "2026-08-16T10:00:00Z"
}
```

**Why this output:** 3 beats → 3 shots (standard density). Shot 1: AKASHI close-up (authority tone). Shot 2: KAGE diagram (analytical tension). Shot 3: AKASHI wide (synthesis). Each image prompt follows 4-block structure. LoRA triggers injected for mascot consistency. Motion intent specified for video gen.

### Example 2: 45s Philosophy, 5 shots with B-roll (standard density)

**Input:**

```json
{
  "script_manifest": {
    "script_id": "def67890-abcd-1234-ef56-7890abcdef12",
    "topic": "Why [redacted character]'s Domain is philosophically perfect",
    "duration_sec": 45,
    "beats": [
      { "beat_num": 1, "start_sec": 0, "end_sec": 9, "speaker": "MIRA", "scene_description": "MIRA emerges in soft library glow. Ancient texts float." },
      { "beat_num": 2, "start_sec": 9, "end_sec": 18, "speaker": "KAGE", "scene_description": "KAGE steps into frame, metallic void. Geometric Domain blueprint unfolds." },
      { "beat_num": 3, "start_sec": 18, "end_sec": 30, "speaker": "MIRA", "scene_description": "MIRA gestures, philosophical symbols materialize: dualism, infinity, truth." },
      { "beat_num": 4, "start_sec": 30, "end_sec": 38, "speaker": "KAGE", "scene_description": "KAGE analyzes, Domain cracks appear." },
      { "beat_num": 5, "start_sec": 38, "end_sec": 45, "speaker": "AKASHI", "scene_description": "AKASHI appears, golden synthesis glow. Domain and philosophy symbol merge." }
    ]
  }
}
```

**Output:**

```json
{
  "storyboard_id": "bbbb2222-cccc-3333-dddd-444455556666",
  "script_id": "def67890-abcd-1234-ef56-7890abcdef12",
  "topic": "Why [redacted character]'s Domain is philosophically perfect",
  "duration_sec": 45,
  "shots": [
    {
      "shot_num": 1,
      "beat_ref": 1,
      "start_sec": 0,
      "end_sec": 9,
      "speaker": "MIRA",
      "shot_type": "mascot",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, MIRA mascot with warm amber glow and curious expression, soft library environment with floating ancient texts, close-up camera angle, warm golden lighting, rule-of-thirds composition with MIRA offset left",
      "motion_intent": "MIRA emerges from darkness, ancient texts float gently into frame, camera slow drift forward",
      "camera_angle": "close-up",
      "emotional_tone": "curiosity",
      "lora_triggers": ["mira_animelegends", "warm_amber", "curious_expression"]
    },
    {
      "shot_num": 2,
      "beat_ref": 2,
      "start_sec": 9,
      "end_sec": 18,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE mascot with silver metallic sheen, metallic void environment, geometric Domain blueprint unfolding in holographic projection, medium camera angle, cool blue-silver lighting, technical composition",
      "motion_intent": "KAGE steps into frame, Domain blueprint unfolds in layers, camera slow pull-back to reveal symmetry",
      "camera_angle": "medium",
      "emotional_tone": "tension",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 3,
      "beat_ref": 3,
      "start_sec": 18,
      "end_sec": 30,
      "speaker": "MIRA",
      "shot_type": "broll",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, floating philosophical symbols: yin-yang dualism, infinity loop, glowing truth glyph, abstract space, medium camera angle, warm contemplative lighting, symbols arranged in triangular composition",
      "motion_intent": "Philosophical symbols materialize one by one, camera slow orbit around symbol cluster, gentle rotation",
      "camera_angle": "medium",
      "emotional_tone": "wonder",
      "lora_triggers": []
    },
    {
      "shot_num": 4,
      "beat_ref": 4,
      "start_sec": 30,
      "end_sec": 38,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE mascot analyzing, Domain structure with visible cracks and fractures, each crack representing counter-argument, close-up camera zooming into fracture detail, cool analytical lighting with red warning highlights on cracks",
      "motion_intent": "Domain cracks spread in slow-motion, camera zooms into fracture lines, KAGE gestures dissecting weakness",
      "camera_angle": "close-up",
      "emotional_tone": "tension",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 5,
      "beat_ref": 5,
      "start_sec": 38,
      "end_sec": 45,
      "speaker": "AKASHI",
      "shot_type": "mascot",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, AKASHI mascot center frame with deep authority expression, golden synthesis glow, Domain blueprint and philosophy symbol merging into unified image, close-up camera holding firm, warm golden triumphant lighting",
      "motion_intent": "Domain and philosophy symbol converge into one, golden light burst, AKASHI holds frame with authority, brand bumper fades in",
      "camera_angle": "close-up",
      "emotional_tone": "synthesis",
      "lora_triggers": ["akashi_animelegends", "gold_eyes", "deep_authority"]
    }
  ],
  "brand_style_lock": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field",
  "timestamp": "2026-08-16T10:05:00Z"
}
```

**Why this output:** 5 beats → 5 shots. Shot 3 is B-roll (no mascot, philosophical symbols only). Each mascot shot includes LoRA triggers. 4-block prompt structure applied to all shots. Motion intent guides video generation. Emotional tone mapped: curiosity (MIRA) → tension (KAGE) → wonder (B-roll) → tension (KAGE) → synthesis (AKASHI).

### Example 3: 60s LegendsLabs, 8 shots (standard density)

**Input:**

```json
{
  "script_manifest": {
    "script_id": "fedcba98-7654-3210-fedc-ba9876543210",
    "topic": "How one studio perfected the sakuga slow-motion cut",
    "duration_sec": 60,
    "beats": [
      { "beat_num": 1, "start_sec": 0, "end_sec": 7, "speaker": "AKASHI", "scene_description": "AKASHI center, dark studio space. Animator desk glows." },
      { "beat_num": 2, "start_sec": 7, "end_sec": 14, "speaker": "KAGE", "scene_description": "KAGE appears, frame-by-frame timeline." },
      { "beat_num": 3, "start_sec": 14, "end_sec": 23, "speaker": "KAGE", "scene_description": "KAGE dissects: 3-frame window highlighted." },
      { "beat_num": 4, "start_sec": 23, "end_sec": 32, "speaker": "MIRA", "scene_description": "MIRA enters, particle effects bloom in slow-mo." },
      { "beat_num": 5, "start_sec": 32, "end_sec": 41, "speaker": "KAGE", "scene_description": "KAGE presents cost chart vs engagement spike graph." },
      { "beat_num": 6, "start_sec": 41, "end_sec": 50, "speaker": "KAGE", "scene_description": "KAGE shows comparison: original vs imitations." },
      { "beat_num": 7, "start_sec": 50, "end_sec": 56, "speaker": "KAGE", "scene_description": "KAGE final analysis, formula overlays the frame." },
      { "beat_num": 8, "start_sec": 56, "end_sec": 60, "speaker": "KAGE", "scene_description": "KAGE holds frame, brand bumper fades in." }
    ]
  }
}
```

**Output:**

```json
{
  "storyboard_id": "cccc3333-dddd-4444-eeee-555566667777",
  "script_id": "fedcba98-7654-3210-fedc-ba9876543210",
  "topic": "How one studio perfected the sakuga slow-motion cut",
  "duration_sec": 60,
  "shots": [
    {
      "shot_num": 1,
      "beat_ref": 1,
      "start_sec": 0,
      "end_sec": 7,
      "speaker": "AKASHI",
      "shot_type": "mascot",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, AKASHI mascot center frame in dark studio space, glowing animator desk in background, close-up camera tight on AKASHI, warm studio glow lighting, authoritative composition",
      "motion_intent": "AKASHI steady presence, animator desk glows in background, camera holds tight authority",
      "camera_angle": "close-up",
      "emotional_tone": "authority",
      "lora_triggers": ["akashi_animelegends", "gold_eyes", "deep_authority"]
    },
    {
      "shot_num": 2,
      "beat_ref": 2,
      "start_sec": 7,
      "end_sec": 14,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE mascot with silver metallic sheen, frame-by-frame animation timeline in holographic projection showing 12fps cuts, medium camera angle, cool technical lighting, timeline composition across frame",
      "motion_intent": "KAGE enters, timeline materializes, camera pans across 12fps frame sequence",
      "camera_angle": "medium",
      "emotional_tone": "tension",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 3,
      "beat_ref": 3,
      "start_sec": 14,
      "end_sec": 23,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE dissecting animation, 3-frame smear window highlighted in red outline, motion blur layers isolated and labeled, close-up camera zooming into frame precision, technical blue lighting with red highlight accents",
      "motion_intent": "3-frame window highlights, smear layers peel apart in slow-motion, camera zooms into frame detail",
      "camera_angle": "close-up",
      "emotional_tone": "tension",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 4,
      "beat_ref": 4,
      "start_sec": 23,
      "end_sec": 32,
      "speaker": "MIRA",
      "shot_type": "broll",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, particle effects blooming in slow-motion: light bloom, dust trails, impact sparks on layered composition, no mascot visible, medium camera angle orbiting particle cluster, warm magical lighting",
      "motion_intent": "Particle effects bloom in slow-motion, each layer appears sequentially, camera orbits the layered composition",
      "camera_angle": "medium",
      "emotional_tone": "wonder",
      "lora_triggers": []
    },
    {
      "shot_num": 5,
      "beat_ref": 5,
      "start_sec": 32,
      "end_sec": 41,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE presenting dual-axis chart: production cost vs audience engagement, intersection point highlighted in gold, medium camera angle, technical lighting, chart composition center frame",
      "motion_intent": "Chart animates on-screen, cost line rises, engagement line spikes, intersection point glows gold",
      "camera_angle": "medium",
      "emotional_tone": "synthesis",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 6,
      "beat_ref": 6,
      "start_sec": 41,
      "end_sec": 50,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE analyzing split-screen comparison: original studio cut (left, precise timing) vs imitation cuts (right, sloppy timing), medium camera angle, technical lighting with green checkmark on original and red X on imitations",
      "motion_intent": "Split-screen comparison appears, original plays smooth, imitations stutter, camera holds on precision difference",
      "camera_angle": "medium",
      "emotional_tone": "tension",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 7,
      "beat_ref": 7,
      "start_sec": 50,
      "end_sec": 56,
      "speaker": "KAGE",
      "shot_type": "diagram",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE final analysis, formula overlay: '3-frame smear + layered particles + timing discipline = signature', close-up camera slow zoom, technical mastery lighting, formula glows gold",
      "motion_intent": "Formula overlays frame, each component appears sequentially, camera slow zoom emphasizing mastery",
      "camera_angle": "close-up",
      "emotional_tone": "synthesis",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    },
    {
      "shot_num": 8,
      "beat_ref": 8,
      "start_sec": 56,
      "end_sec": 60,
      "speaker": "KAGE",
      "shot_type": "mascot",
      "image_prompt": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field, KAGE mascot holding frame with authority, brand bumper fading in at edges with gold particle burst, medium camera angle, triumphant golden lighting, CTA composition",
      "motion_intent": "KAGE holds steady, brand bumper fades in with gold particle burst, camera static emphasizing CTA",
      "camera_angle": "medium",
      "emotional_tone": "synthesis",
      "lora_triggers": ["kage_animelegends", "silver_metallic", "analytical_gaze"]
    }
  ],
  "brand_style_lock": "Anime art style, cinematic lighting, high detail, AnimeLegends brand aesthetic: dark gradient backgrounds with gold particle accents, sharp character outlines, depth of field",
  "timestamp": "2026-08-16T10:10:00Z"
}
```

**Why this output:** 8 beats → 8 shots (standard density). Shots 2,3,5,6,7 are diagrams (KAGE analytical beats). Shot 4 is B-roll (particle FX, no mascot). Shots 1,8 are mascot (AKASHI opens, KAGE closes). All prompts follow 4-block structure. LoRA triggers for mascot shots. Motion intent detailed for technical breakdown.

## Failure modes

- **Missing script manifest** — If `script_manifest` is null/empty, abort with error: `"storyboard-forge requires ScriptManifest input"`, log to Grimoire with `decision="error"`.
- **Malformed beats array** — If `script_manifest.beats` is empty or has non-contiguous timestamps, abort with error: `"Invalid beat structure in ScriptManifest"`, log to Grimoire.
- **Unknown shot type** — If scene description is ambiguous and shot type cannot be inferred, default to `shot_type="broll"` and log warning.
- **LoRA triggers unavailable** — If `lora_trigger_mode="manual"` but no manual triggers provided, use auto-generated defaults and log warning.
- **Shot duration mismatch** — If shot timestamps don't align with beat timestamps (e.g., due to cinematic density splits), recalculate shot timing to ensure contiguous coverage and log warning.

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage`: `"storyboard-forge"`
- `input_id`: `script_id` from input
- `output_id`: `storyboard_id` from generated `StoryboardManifest`
- `decision`: `"accept"` (no rejection at storyboard stage)
- `rationale`: one-line explanation (e.g., `"8shots_standard_4block_prompts"`)
- `cost_usd`: `0.00` (no paid API calls at this stage)
- `duration_ms`: elapsed time from input receipt to manifest generation
- `shot_count`: total number of shots generated
- `mascot_shots`: count of shots with mascot on-screen
- `broll_shots`: count of B-roll shots

## Legal firewall

This skill does not generate external content or invoke image/video models. It only generates text prompts for downstream execution. Legal filtering was applied upstream in `signal-forge`, so `topic` field in input is already sanitized. Image prompts reference only AnimeLegends original IP (AKASHI, KAGE, MIRA mascots). No copyrighted character likenesses or franchise-specific visual styles are generated. If a script beat references a copyrighted element (already sanitized as "[redacted]"), the image prompt describes a generic equivalent (e.g., "powerful character silhouette" instead of specific character likeness).

## Quality gates

- [ ] Output `StoryboardManifest` has all required fields (storyboard_id, script_id, topic, duration_sec, shots, brand_style_lock, timestamp)
- [ ] `storyboard_id` is valid UUID v4
- [ ] `shots` array length matches expected count (3/5/8 for standard density, or higher for cinematic)
- [ ] Each shot has: shot_num (1-indexed), beat_ref, start_sec, end_sec, shot_type, image_prompt, motion_intent, camera_angle, emotional_tone, lora_triggers
- [ ] Shot timestamps are contiguous: shot[n].end_sec == shot[n+1].start_sec
- [ ] Final shot.end_sec == duration_sec
- [ ] Each `image_prompt` starts with `brand_style_lock` prefix
- [ ] Each `image_prompt` follows 4-block structure: STYLE LOCK, SUBJECT, LIGHTING, COMPOSITION
- [ ] Mascot shots (`shot_type="mascot"`) have non-empty `lora_triggers` array
- [ ] B-roll shots have empty `lora_triggers` array
- [ ] `camera_angle` is one of: close-up, medium, wide, overhead, dutch
- [ ] `emotional_tone` is one of: authority, curiosity, tension, synthesis, wonder
- [ ] Grimoire log entry created with all required fields

## Changelog

### 0.1.0 — 2026-08-16

- Initial release
- 4-block Archetype Prompt Structure (STYLE LOCK / SUBJECT / LIGHTING / COMPOSITION)
- Brand style lock enforcement for visual consistency
- Mascot LoRA trigger injection (akashi_animelegends, kage_animelegends, mira_animelegends)
- Camera angle and emotional tone mapping
- Motion intent specification for video generation
- Shot type assignment (mascot / broll / diagram / text)
- Standard and cinematic shot density modes
- Grimoire logging integration
