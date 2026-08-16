---
name: gen-director
description: Orchestrates external model calls via animelegends-gen MCP. Model router with fallbacks (Flux+LoRA → Ideogram → Wan; Kling → Runway). CLIP quality gate 7/10. Voice routing. Cost gate blocks batches >$5. Fail-closed if MCP unavailable.
type: core
version: 0.1.0
when_to_use: |
  Stage 5 of the AnimeLegends pipeline. Receives StoryboardManifest from storyboard-forge. CRITICAL: This skill orchestrates paid external APIs (image/video/audio generation). Must verify animelegends-gen MCP availability and cost gate before execution. Does NOT proceed if MCP unavailable.
---

# gen-director

## Intent

Fifth stage of the AnimeLegends generative pipeline. Receives shot-by-shot prompts and specifications from `storyboard-forge`, orchestrates all external model API calls via the `animelegends-gen` MCP server (image generation: Flux dev+LoRA → Flux 1.1 Pro Ultra → Ideogram v3 → Wan 2.2; video generation: Kling 2.5 → Kling 2.0 → Runway Gen-4 Turbo → Wan 2.2; voice synthesis: per-mascot voice routing + reverb profiles), applies CLIP quality gate at 7/10 threshold with max 3 retries per shot, enforces cost gate (blocks batches >$5 without explicit manifest override), and outputs a `GenerateManifest` with artifact file paths, quality scores, and cost breakdown for `remotion-composer` to assemble.

**CRITICAL CONSTRAINT**: This skill is **fail-closed**. If the `animelegends-gen` MCP server is not available or provider API keys are missing, the skill **aborts immediately** with a detailed error explaining what is unavailable. It does **not** proceed with generation, does **not** invent successful outputs, and does **not** simulate artifact creation.

## Inputs

What this skill expects to receive:

```typescript
interface GenDirectorInput {
  storyboard_manifest: StoryboardManifest;  // from storyboard-forge (required)
  cost_override?: number;                   // raise cost gate threshold (default: 5.00 USD)
  quality_override?: number;                // lower quality gate threshold (default: 7.0/10)
  force_models?: {                          // force specific model overrides
    image?: string;                         // "flux-dev" | "flux-pro" | "ideogram-v3" | "wan-2.2"
    video?: string;                         // "kling-2.5" | "kling-2.0" | "runway-gen4" | "wan-2.2"
  };
}
```


Source of input: `StoryboardManifest` from `storyboard-forge`.

## Outputs

What this skill produces (only if MCP is available and execution succeeds):

```typescript
interface GenerateManifest {
  generate_id: string;                      // UUID v4
  storyboard_id: string;                    // parent storyboard UUID
  topic: string;                            // clean topic text
  duration_sec: 30 | 45 | 60;               // video length
  artifacts: Array<{
    shot_num: number;                       // links to storyboard shot
    image_path?: string;                    // generated image file path (if static)
    video_path?: string;                    // generated video file path (if motion)
    audio_path?: string;                    // voice synthesis audio file path (if dialogue)
    model_used: {
      image?: string;                       // model that generated image (e.g., "flux-dev-lora")
      video?: string;                       // model that generated video
      voice?: string;                       // TTS model used
    };
    quality_score: number;                  // CLIP score 0-10
    retry_count: number;                    // how many retries required (0-3)
    generation_time_sec: number;            // wall-clock time for this shot
    cost_usd: number;                       // cost for this shot
  }>;
  total_cost_usd: number;                   // sum of all artifact costs
  total_generation_time_sec: number;        // sum of all generation times
  cost_gate_passed: boolean;                // true if total_cost <= cost_override
  timestamp: string;                        // ISO 8601
}
```


Where the output goes: passed to `remotion-composer` as input (if successful), logged to `grimoire-keeper`.

## Core logic / rules

### 0. **MCP availability check (FAIL-CLOSED)**

**Before any generation step**, check if the `animelegends-gen` MCP server is available:

- Call `GetMcpTools(server="animelegends-gen")` to enumerate available tools.
- Expected tools: `gen_image`, `gen_video`, `gen_voice`, `check_provider_status`, `estimate_cost`.
- If MCP server is **not available** (404 / auth error / no tools returned):
  - **ABORT immediately** with error: `"gen-director BLOCKED: animelegends-gen MCP server not available. Cannot proceed with generation. Check MCP configuration and provider credentials."`
  - Log to `grimoire-keeper` with `stage="gen-director"`, `decision="error"`, `rationale="mcp_unavailable"`.
  - **Do NOT** proceed to cost estimation, model routing, or generation steps.
  - **Do NOT** invent artifact paths or quality scores.
  - **Return error to user** with clear explanation and remediation steps.

- If MCP server is available, call `check_provider_status()` to verify provider API keys:
  - Required providers: at least one image model (Flux / Ideogram / Wan), at least one video model (Kling / Runway / Wan), voice synthesis (ElevenLabs or equivalent).
  - If **all providers are unavailable** (no API keys configured):
    - **ABORT immediately** with error: `"gen-director BLOCKED: No image/video generation providers configured. Requires at least one of: Flux, Ideogram, Kling, Runway, Wan. Check provider API keys."`
    - Log to `grimoire-keeper` with `decision="error"`, `rationale="no_providers_configured"`.
    - **Do NOT** proceed to generation.

### 1. **Cost estimation**

- Call `estimate_cost(storyboard_manifest)` via `animelegends-gen` MCP to get pre-generation cost estimate.
- Estimate includes:
  - Image generation: ~$0.10-0.50 per shot (Flux dev+LoRA cheapest, Flux Pro most expensive)
  - Video generation: ~$1.00-3.00 per shot (Kling 2.5 most expensive, Wan 2.2 cheapest)
  - Voice synthesis: ~$0.02-0.05 per shot (ElevenLabs pricing)
- Sum estimated costs across all shots in `storyboard_manifest.shots`.

### 2. **Cost gate enforcement**

- **Default threshold**: $5.00 USD per batch (one video = one batch)
- If `total_estimated_cost > cost_override` (default $5.00):
  - **BLOCK generation** and return error: `"Cost gate exceeded: estimated $X.XX > threshold $5.00. Set cost_override to proceed, or reduce shot count/duration."`
  - Log to `grimoire-keeper` with `decision="blocked"`, `rationale="cost_gate_exceeded"`.
  - **Do NOT** proceed to generation unless user provides `cost_override` in input.
- If `cost_override` provided and estimate within threshold: proceed to generation.

### 3. **Model router and fallback chains**

For each shot in `storyboard_manifest.shots`, determine which models to use:

#### Image generation fallback chain

1. **Flux dev + LoRA** (preferred for mascot shots with `lora_triggers`): fast, LoRA-compatible, $0.10/image. Use for `shot_type="mascot"`.
2. **Flux 1.1 Pro Ultra** (fallback if Flux dev fails or no LoRA needed): highest quality, $0.50/image. Use for complex compositions.
3. **Ideogram v3** (fallback if Flux unavailable): good typography, $0.25/image.
4. **Wan 2.2** (final fallback): cheapest, $0.05/image, lower quality.

#### Video generation fallback chain

1. **Kling 2.5** (preferred): best motion quality, 1080p@60fps, $3.00/5s. Use for cinematic shots.
2. **Kling 2.0** (fallback): slightly lower quality, $2.00/5s.
3. **Runway Gen-4 Turbo** (fallback): fast, $1.50/5s, shorter max duration (4s).
4. **Wan 2.2** (final fallback): cheapest, $0.50/5s, lower motion quality.

#### Voice synthesis routing

- **AKASHI**: ElevenLabs "deep_reverb" voice preset, 2.0 wps, +8dB bass boost
- **KAGE**: ElevenLabs "metallic_clear" voice preset, 2.8 wps, +2dB treble boost
- **MIRA**: ElevenLabs "warm_curious" voice preset, 2.25 wps, neutral EQ

### 4. **Shot generation loop**

For each shot in `storyboard_manifest.shots`:

1. **Generate image** (if shot requires visuals):
   - Call `gen_image(prompt=shot.image_prompt, lora_triggers=shot.lora_triggers, model=selected_image_model)` via MCP.
   - Receive `image_path` (file path to generated PNG/JPG).
   - Compute CLIP quality score via `animelegends-gen.compute_clip_score(image_path, shot.image_prompt)`.

2. **Quality gate check**:
   - If `quality_score < quality_override` (default 7.0/10):
     - Retry up to **3 times** with adjusted prompt (add "high detail, sharp focus, professional" to prompt).
     - If still below threshold after 3 retries: **accept lower quality** and log warning to Grimoire, proceed to next shot.
   - If `quality_score >= 7.0/10`: accept, proceed to video generation.

3. **Generate video** (if `shot.motion_intent != "static"`):
   - Call `gen_video(image_path=image_path, motion_intent=shot.motion_intent, duration_sec=shot.end_sec - shot.start_sec, model=selected_video_model)` via MCP.
   - Receive `video_path` (file path to generated MP4).
   - Video model attempts: try primary model (Kling 2.5), if fails → fallback chain (Kling 2.0 → Runway → Wan).

4. **Generate voice** (if shot has dialogue):
   - Extract dialogue from `script_manifest.beats` where `beat.beat_num == shot.beat_ref`.
   - Call `gen_voice(text=dialogue, voice_preset=mascot_voice_preset, wps=shot.wps_target)` via MCP.
   - Receive `audio_path` (file path to generated WAV/MP3).
   - Apply reverb/EQ post-processing per mascot profile.

5. **Log artifact**:
   - Record `image_path`, `video_path`, `audio_path`, `model_used`, `quality_score`, `retry_count`, `generation_time_sec`, `cost_usd` for this shot.
   - Append to `artifacts` array.

### 5. **Manifest generation**

- Populate `GenerateManifest` with all fields.
- Calculate `total_cost_usd` (sum of all artifact costs).
- Calculate `total_generation_time_sec` (sum of all generation times).
- Set `cost_gate_passed: true` (if we reached this point, cost gate was passed).
- Generate UUID for `generate_id`, set `timestamp` to ISO 8601 UTC.

### 6. **Grimoire logging**

- Log invocation to `grimoire-keeper` with `stage="gen-director"`, `input_id=storyboard_id`, `output_id=generate_id`, `decision="accept"` (if successful) or `"error"` (if failed), `rationale` (one-line: model used + total cost + generation time), `cost_usd=total_cost_usd`, `duration_ms`.

## Worked examples

### Example 1: MCP unavailable (FAIL-CLOSED)

**Input:**

```json
{
  "storyboard_manifest": {
    "storyboard_id": "aaaa1111-bbbb-2222-cccc-333344445555",
    "topic": "Why speed doesn't beat power",
    "duration_sec": 30,
    "shots": [ /* 3 shots */ ]
  }
}
```


**Output:**

```json
{
  "error": "gen-director BLOCKED: animelegends-gen MCP server not available. Cannot proceed with generation. Check MCP configuration and provider credentials.",
  "stage": "gen-director",
  "decision": "error",
  "rationale": "mcp_unavailable",
  "remediation": "Ensure animelegends-gen MCP server is installed and running. Verify provider API keys (Flux, Kling, ElevenLabs) are configured in MCP settings."
}
```


**Why this output:** MCP server not found via `GetMcpTools`. Skill aborts immediately with clear error. No generation attempted. No artifact paths invented.

### Example 2: Cost gate exceeded (BLOCKED)

**Input:**

```json
{
  "storyboard_manifest": {
    "storyboard_id": "bbbb2222-cccc-3333-dddd-444455556666",
    "topic": "Philosophy topic",
    "duration_sec": 45,
    "shots": [ /* 5 shots with video generation */ ]
  }
}
```


**Estimated cost:** $12.50 (5 shots × $2.50 avg per shot)

**Output:**

```json
{
  "error": "Cost gate exceeded: estimated $12.50 > threshold $5.00. Set cost_override to proceed, or reduce shot count/duration.",
  "stage": "gen-director",
  "decision": "blocked",
  "rationale": "cost_gate_exceeded",
  "estimated_cost_usd": 12.50,
  "cost_threshold_usd": 5.00,
  "remediation": "Provide cost_override field with higher threshold (e.g., cost_override: 15.00), or reduce video duration/shot count to lower cost."
}
```


**Why this output:** Estimated cost exceeds $5 default threshold. Skill blocks generation and returns cost breakdown. User must explicitly override to proceed.

### Example 3: Successful generation (MCP available, cost gate passed)

**Input:**

```json
{
  "storyboard_manifest": {
    "storyboard_id": "aaaa1111-bbbb-2222-cccc-333344445555",
    "topic": "Why speed doesn't beat power",
    "duration_sec": 30,
    "shots": [
      {
        "shot_num": 1,
        "beat_ref": 1,
        "start_sec": 0,
        "end_sec": 10,
        "speaker": "AKASHI",
        "shot_type": "mascot",
        "image_prompt": "Anime art style, AKASHI mascot center frame...",
        "motion_intent": "Subtle camera push-in, particles drift",
        "lora_triggers": ["akashi_animelegends", "gold_eyes"]
      },
      {
        "shot_num": 2,
        "beat_ref": 2,
        "start_sec": 10,
        "end_sec": 23,
        "speaker": "KAGE",
        "shot_type": "diagram",
        "image_prompt": "Anime art style, KAGE mascot, holographic diagrams...",
        "motion_intent": "Diagrams animate sequentially",
        "lora_triggers": ["kage_animelegends"]
      },
      {
        "shot_num": 3,
        "beat_ref": 3,
        "start_sec": 23,
        "end_sec": 30,
        "speaker": "AKASHI",
        "shot_type": "mascot",
        "image_prompt": "Anime art style, AKASHI standing dominant...",
        "motion_intent": "Chessboard shatters, camera pull-back",
        "lora_triggers": ["akashi_animelegends"]
      }
    ]
  },
  "cost_override": 10.00
}
```


**Output:**

```json
{
  "generate_id": "dddd4444-eeee-5555-ffff-666677778888",
  "storyboard_id": "aaaa1111-bbbb-2222-cccc-333344445555",
  "topic": "Why speed doesn't beat power",
  "duration_sec": 30,
  "artifacts": [
    {
      "shot_num": 1,
      "image_path": "/workspace/artifacts/gen/shot_001_image.png",
      "video_path": "/workspace/artifacts/gen/shot_001_video.mp4",
      "audio_path": "/workspace/artifacts/gen/shot_001_audio.wav",
      "model_used": {
        "image": "flux-dev-lora",
        "video": "kling-2.5",
        "voice": "elevenlabs-deep-reverb"
      },
      "quality_score": 8.2,
      "retry_count": 0,
      "generation_time_sec": 45,
      "cost_usd": 3.12
    },
    {
      "shot_num": 2,
      "image_path": "/workspace/artifacts/gen/shot_002_image.png",
      "video_path": "/workspace/artifacts/gen/shot_002_video.mp4",
      "audio_path": "/workspace/artifacts/gen/shot_002_audio.wav",
      "model_used": {
        "image": "flux-dev-lora",
        "video": "kling-2.0",
        "voice": "elevenlabs-metallic-clear"
      },
      "quality_score": 7.5,
      "retry_count": 1,
      "generation_time_sec": 52,
      "cost_usd": 2.75
    },
    {
      "shot_num": 3,
      "image_path": "/workspace/artifacts/gen/shot_003_image.png",
      "video_path": "/workspace/artifacts/gen/shot_003_video.mp4",
      "audio_path": "/workspace/artifacts/gen/shot_003_audio.wav",
      "model_used": {
        "image": "flux-dev-lora",
        "video": "kling-2.5",
        "voice": "elevenlabs-deep-reverb"
      },
      "quality_score": 8.7,
      "retry_count": 0,
      "generation_time_sec": 43,
      "cost_usd": 3.05
    }
  ],
  "total_cost_usd": 8.92,
  "total_generation_time_sec": 140,
  "cost_gate_passed": true,
  "timestamp": "2026-08-16T10:15:00Z"
}
```


**Why this output:** MCP available, providers configured. Cost estimate $8.92 < $10.00 override → proceed. 3 shots generated: shot 1 (quality 8.2, 0 retries), shot 2 (quality 7.5, 1 retry), shot 3 (quality 8.7, 0 retries). Artifact paths recorded. Total cost $8.92, total time 140s. Cost gate passed.

## Failure modes

- **MCP server unavailable** — If `GetMcpTools(server="animelegends-gen")` returns empty or error, **ABORT** with error: `"gen-director BLOCKED: animelegends-gen MCP server not available"`. Log to Grimoire with `decision="error"`, `rationale="mcp_unavailable"`. **Do NOT proceed**.

- **No providers configured** — If `check_provider_status()` shows zero image/video/voice providers available, **ABORT** with error: `"gen-director BLOCKED: No generation providers configured. Check API keys."`. Log to Grimoire with `decision="error"`, `rationale="no_providers_configured"`. **Do NOT proceed**.

- **Cost gate exceeded** — If estimated cost > `cost_override` (default $5.00), **BLOCK** with error: `"Cost gate exceeded: estimated $X.XX > threshold $Y.YY"`. Return cost breakdown. Log to Grimoire with `decision="blocked"`, `rationale="cost_gate_exceeded"`. **Do NOT proceed** unless user provides `cost_override`.

- **Quality gate failed after 3 retries** — If CLIP score < 7.0/10 after 3 retry attempts, **accept lower quality** (do not block entire batch), log warning to Grimoire with `rationale="quality_below_threshold_shot_N"`, proceed with generation for remaining shots.

- **Model API timeout** — If `gen_image` / `gen_video` / `gen_voice` call times out (>120s), **retry once** with same model. If second attempt fails, **fall back to next model in chain**. If all models in chain fail, **abort shot** (skip it), log error for that shot, proceed to next shot.

- **Model API rate limit** — If provider returns 429 rate limit error, **wait 60s** and retry once. If still rate-limited, **defer generation** (set `decision="deferred"`), log to Grimoire, notify user that batch will retry later.

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage`: `"gen-director"`
- `input_id`: `storyboard_id` from input
- `output_id`: `generate_id` from generated `GenerateManifest` (or `null` if aborted)
- `decision`: `"accept"` (success) | `"error"` (MCP unavailable) | `"blocked"` (cost gate) | `"deferred"` (rate limit)
- `rationale`: one-line explanation (e.g., `"3shots_flux+kling_$8.92_140s"`, `"mcp_unavailable"`, `"cost_gate_exceeded"`)
- `cost_usd`: `total_cost_usd` from manifest (or `0.00` if aborted)
- `duration_ms`: elapsed time from input receipt to manifest generation (or abort)
- `shots_generated`: count of successfully generated shots
- `shots_failed`: count of shots that failed generation
- `total_retries`: sum of retry_count across all shots

## Legal firewall

This skill invokes external image, video, and voice generation models. Legal filtering was applied upstream in `signal-forge` (topic sanitization) and `script-forge` (dialogue sanitization). Image prompts reference only AnimeLegends original IP (AKASHI, KAGE, MIRA mascots). LoRA models are trained exclusively on AnimeLegends original character designs (no copyrighted franchise characters).

**If a shot's image prompt somehow references copyrighted material** (should not happen if upstream stages worked correctly), the legal firewall in `animelegends-gen` MCP will **block the prompt** and return error: `"Prompt contains copyrighted reference"`. In this case, **skip the shot**, log error to Grimoire with `rationale="legal_firewall_blocked_shot_N"`, proceed to next shot.

## Quality gates

- [ ] MCP server `animelegends-gen` is available and responds to `GetMcpTools` (fail-closed if not)
- [ ] At least one image provider, one video provider, and voice synthesis provider configured (fail-closed if not)
- [ ] Estimated cost ≤ `cost_override` threshold (blocked if exceeded, unless override provided)
- [ ] Output `GenerateManifest` has all required fields (generate_id, storyboard_id, topic, duration_sec, artifacts, total_cost_usd, total_generation_time_sec, cost_gate_passed, timestamp)
- [ ] `generate_id` is valid UUID v4
- [ ] Each artifact in `artifacts` array has: shot_num, model_used, quality_score, retry_count, generation_time_sec, cost_usd
- [ ] Each artifact has at least `image_path` (video_path and audio_path optional depending on shot type)
- [ ] `quality_score` is 0-10 range
- [ ] `retry_count` is 0-3 range
- [ ] `total_cost_usd` equals sum of all artifact costs (±$0.10 tolerance)
- [ ] `total_generation_time_sec` equals sum of all artifact generation times (±5s tolerance)
- [ ] `cost_gate_passed` is `true` (if we reached manifest generation, cost gate passed)
- [ ] Grimoire log entry created with all required fields
- [ ] No copyrighted character likenesses in generated images (legal firewall enforced by MCP)

## Changelog


### 0.1.0 — 2026-08-16

- Initial release
- MCP availability check (fail-closed if unavailable)
- Provider status check (fail-closed if no providers configured)
- Cost estimation and cost gate enforcement ($5 default threshold)
- Model router with fallback chains (Flux → Ideogram → Wan; Kling → Runway → Wan)
- CLIP quality gate at 7/10 with max 3 retries
- Per-mascot voice routing with reverb/EQ profiles
- Shot generation loop with error handling and retry logic
- Grimoire logging integration with cost and quality metrics
- Legal firewall integration via MCP
