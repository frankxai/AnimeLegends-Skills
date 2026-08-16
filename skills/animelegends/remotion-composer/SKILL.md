---
name: remotion-composer
description: Composites generated assets into final MP4 via Remotion v4. Five templates mapped to five sub-channels (PowerScaling, Philosophy, LoreDrop, TrainingArc, LegendsLabs). Applies brand LUT + gold particle intro + 3s brand bumper outro.
type: core
version: 0.1.0
when_to_use: |
  Stage 6 of the AnimeLegends pipeline. Receives GenerateManifest from gen-director with artifact paths (images, videos, audio). Does NOT generate new content — only composes existing assets into final video. Requires Remotion v4 and FFmpeg installed.
---

# remotion-composer

## Intent

Sixth stage of the AnimeLegends generative pipeline. Receives artifact paths (generated images, videos, voice audio) from `gen-director`, loads the appropriate Remotion v4 composition template based on channel (PowerScaling / Philosophy / LoreDrop / TrainingArc / LegendsLabs), composites all shots into a single timeline with timing from `ScriptManifest` and `StoryboardManifest`, applies the AnimeLegends brand LUT (color grading), adds gold particle intro animation (2s), appends 3s brand bumper outro with subscribe CTA, renders final MP4 at 1080×1920 vertical format (Day 1-30) or 2160×3840 4K (Day 31+), 30fps (Day 1-30) or 60fps (Day 31+), and outputs the rendered video path for `publish-orchestrator` to distribute.

## Inputs

What this skill expects to receive:

```typescript
interface RemotionComposerInput {
  generate_manifest: GenerateManifest;      // from gen-director (required)
  script_manifest: ScriptManifest;          // from script-forge (for dialogue timing)
  storyboard_manifest: StoryboardManifest;  // from storyboard-forge (for shot metadata)
  render_quality?: "preview" | "production"; // default: production
  output_resolution?: "1080p" | "4K";       // default: 1080p (Day 1-30), 4K (Day 31+)
}
```

Source of input: `GenerateManifest` from `gen-director`, with references to `ScriptManifest` and `StoryboardManifest` for timing and metadata.

## Outputs

What this skill produces:

```typescript
interface RemotionComposerOutput {
  render_id: string;                        // UUID v4
  generate_id: string;                      // parent generate UUID
  topic: string;                            // clean topic text
  channel: string;                          // PowerScaling | Philosophy | LoreDrop | TrainingArc | LegendsLabs
  video_path: string;                       // final rendered MP4 file path
  render_stats: {
    resolution: string;                     // "1080x1920" | "2160x3840"
    fps: number;                            // 30 | 60
    duration_sec: number;                   // total video duration (original + intro + outro)
    file_size_mb: number;                   // final MP4 file size
    render_time_sec: number;                // wall-clock render time
    template_used: string;                  // Remotion template name
  };
  timestamp: string;                        // ISO 8601
}
```

Where the output goes: passed to `publish-orchestrator` as input (if publishing), logged to `grimoire-keeper`, saved to `renders/` directory.

## Core logic / rules

1. **Template selection** — Map `script_manifest.channel` to Remotion composition template:
   - **PowerScaling** → `templates/PowerScaling.tsx` (red/gold accent, dynamic energy, comparison overlays)
   - **Philosophy** → `templates/Philosophy.tsx` (blue/purple gradient, contemplative pacing, symbol overlays)
   - **LoreDrop** → `templates/LoreDrop.tsx` (green/teal accent, archive aesthetic, timeline graphics)
   - **TrainingArc** → `templates/TrainingArc.tsx` (orange/warm gradient, journey framing, progress bars)
   - **LegendsLabs** → `templates/LegendsLabs.tsx` (silver/tech accent, grid overlays, technical diagrams)

2. **Resolution and FPS determination** — Check render date to determine output specs:
   - **Day 1-30** (before 2026-09-16): 1080×1920 vertical, 30fps
   - **Day 31+** (after 2026-09-16): 2160×3840 vertical 4K, 60fps
   - Respect `output_resolution` override if provided (for testing).

3. **Asset loading** — For each shot in `generate_manifest.artifacts`:
   - Load `image_path` (PNG/JPG) as still frame or I-frame for video
   - Load `video_path` (MP4) if shot has motion
   - Load `audio_path` (WAV/MP3) voice audio
   - Verify file exists and is readable; if missing, **skip shot** and log warning to Grimoire.

4. **Timeline composition** — Arrange shots on Remotion timeline:
   - **Intro sequence** (0-2s): gold particle burst animation + AnimeLegends logo fade-in
   - **Shot sequence** (2s to 2s+duration_sec): each shot placed at `shot.start_sec + 2s` (offset by intro)
     - Layer video (or static image) on video track
     - Layer voice audio on audio track
     - Apply shot-specific transitions (crossfade between shots, 0.3s overlap)
   - **Outro sequence** (2s+duration_sec to 5s+duration_sec): 3s brand bumper with subscribe CTA
     - Gold particle outro animation
     - "Follow for more [channel] content" text overlay
     - AnimeLegends logo hold

5. **Brand LUT application** — Apply color grading via LUT (look-up table):
   - **AnimeLegends LUT**: contrast +15%, saturation +10%, shadows lifted +8%, gold particle hue preserved (±5° tolerance)
   - LUT applied globally to all shots (except intro/outro which have pre-graded assets)

6. **Audio mixing** — Mix voice audio tracks:
   - Normalize voice audio to -3dB peak (prevent clipping)
   - Apply per-mascot reverb/EQ (already in `gen-director` voice files, but re-verify)
   - Add background music bed (optional, low-level ambient drone at -18dB if available in `assets/music/`)
   - Master output to -1dB peak

7. **Remotion render** — Invoke Remotion CLI to render composition:
   ```bash
   npx remotion render [template] [output_path] \
     --props='{"artifacts": [...], "channel": "PowerScaling", ...}' \
     --codec=h264 \
     --crf=18 \
     --preset=slow \
     --audio-codec=aac \
     --audio-bitrate=192k
   ```

   - CRF 18 for high quality (lower = higher quality, 18-23 range recommended)
   - Preset "slow" for better compression (acceptable for production)
   - Audio codec AAC at 192kbps (standard for social media)

8. **Output verification** — After render completes:
   - Verify `video_path` file exists and size >0 bytes
   - Verify duration matches expected: `intro(2s) + duration_sec + outro(3s)`
   - Compute file size in MB
   - If render failed (file missing or zero size), **abort** and log error to Grimoire.

9. **Manifest generation** — Populate `RemotionComposerOutput` with all fields, generate UUID for `render_id`, set `timestamp` to ISO 8601 UTC.

10. **Grimoire logging** — Log invocation to `grimoire-keeper` with `stage="remotion-composer"`, `input_id=generate_id`, `output_id=render_id`, `decision="accept"` (if successful) or `"error"` (if render failed), `rationale` (one-line: template + resolution + render time), `duration_ms`.

## Worked examples

### Example 1: 30s PowerScaling video, 1080p render

**Input:**

```json
{
  "generate_manifest": {
    "generate_id": "dddd4444-eeee-5555-ffff-666677778888",
    "topic": "Why speed doesn't beat power",
    "duration_sec": 30,
    "artifacts": [
      { "shot_num": 1, "video_path": "/workspace/artifacts/gen/shot_001_video.mp4", "audio_path": "/workspace/artifacts/gen/shot_001_audio.wav" },
      { "shot_num": 2, "video_path": "/workspace/artifacts/gen/shot_002_video.mp4", "audio_path": "/workspace/artifacts/gen/shot_002_audio.wav" },
      { "shot_num": 3, "video_path": "/workspace/artifacts/gen/shot_003_video.mp4", "audio_path": "/workspace/artifacts/gen/shot_003_audio.wav" }
    ]
  },
  "script_manifest": { "channel": "PowerScaling" },
  "storyboard_manifest": { /* shot metadata */ }
}
```

**Output:**

```json
{
  "render_id": "eeee5555-ffff-6666-aaaa-777788889999",
  "generate_id": "dddd4444-eeee-5555-ffff-666677778888",
  "topic": "Why speed doesn't beat power",
  "channel": "PowerScaling",
  "video_path": "/workspace/renders/powerscaling_20260816_103000.mp4",
  "render_stats": {
    "resolution": "1080x1920",
    "fps": 30,
    "duration_sec": 35,
    "file_size_mb": 18.7,
    "render_time_sec": 120,
    "template_used": "PowerScaling"
  },
  "timestamp": "2026-08-16T10:30:00Z"
}
```

**Why this output:** PowerScaling template selected. 1080p@30fps (Day 1-30 default). 3 shots composited: intro (2s) + 30s content + outro (3s) = 35s total. Render time 120s (4× real-time, typical for Remotion h264 slow preset). File size 18.7 MB (~0.53 MB/s bitrate).

### Example 2: 45s Philosophy video, 4K render (Day 31+)

**Input:**

```json
{
  "generate_manifest": {
    "generate_id": "ffff6666-aaaa-7777-bbbb-888899990000",
    "topic": "Why Domain is philosophically perfect",
    "duration_sec": 45,
    "artifacts": [ /* 5 shots */ ]
  },
  "script_manifest": { "channel": "Philosophy" },
  "output_resolution": "4K"
}
```

**Output:**

```json
{
  "render_id": "aaaa7777-bbbb-8888-cccc-999900001111",
  "generate_id": "ffff6666-aaaa-7777-bbbb-888899990000",
  "topic": "Why Domain is philosophically perfect",
  "channel": "Philosophy",
  "video_path": "/workspace/renders/philosophy_20260916_140000_4k.mp4",
  "render_stats": {
    "resolution": "2160x3840",
    "fps": 60,
    "duration_sec": 50,
    "file_size_mb": 67.3,
    "render_time_sec": 310,
    "template_used": "Philosophy"
  },
  "timestamp": "2026-09-16T14:00:00Z"
}
```

**Why this output:** Philosophy template selected. 4K@60fps (Day 31+ or explicit override). 5 shots composited: intro (2s) + 45s content + outro (3s) = 50s total. Render time 310s (~6× real-time for 4K 60fps). File size 67.3 MB (~1.35 MB/s bitrate, higher for 4K).

### Example 3: Render failed (missing artifact)

**Input:**

```json
{
  "generate_manifest": {
    "generate_id": "gggg8888-cccc-9999-dddd-000011112222",
    "topic": "Test topic",
    "duration_sec": 30,
    "artifacts": [
      { "shot_num": 1, "video_path": "/workspace/artifacts/gen/shot_001_video.mp4", "audio_path": "/workspace/artifacts/gen/shot_001_audio.wav" },
      { "shot_num": 2, "video_path": "/workspace/artifacts/gen/shot_002_MISSING.mp4", "audio_path": "/workspace/artifacts/gen/shot_002_audio.wav" },
      { "shot_num": 3, "video_path": "/workspace/artifacts/gen/shot_003_video.mp4", "audio_path": "/workspace/artifacts/gen/shot_003_audio.wav" }
    ]
  },
  "script_manifest": { "channel": "PowerScaling" }
}
```

**Output:**

```json
{
  "error": "Render failed: missing artifact /workspace/artifacts/gen/shot_002_MISSING.mp4 for shot 2",
  "stage": "remotion-composer",
  "decision": "error",
  "rationale": "missing_artifact_shot_2",
  "remediation": "Re-run gen-director to regenerate missing shot 2 artifacts."
}
```

**Why this output:** Shot 2 video file missing. Asset loading step failed. Render aborted. Error logged to Grimoire with specific missing file path.

## Failure modes

- **Missing artifact files** — If any `video_path` or `audio_path` in `generate_manifest.artifacts` does not exist on disk, **skip that shot** and log warning to Grimoire with `rationale="missing_artifact_shot_N"`. If >50% of shots are missing, **abort render** and return error: `"Render failed: too many missing artifacts (X/Y shots)"`.

- **Remotion render timeout** — If `npx remotion render` command times out (>600s for 1080p, >1200s for 4K), **abort render** and log error: `"Render timeout exceeded"`. User may need to reduce quality preset (slow → medium) or resolution.

- **Remotion CLI not installed** — If `npx remotion` command not found, **abort** with error: `"Remotion v4 CLI not installed. Run: npm install -g remotion"`. Log to Grimoire with `decision="error"`, `rationale="remotion_not_installed"`.

- **FFmpeg not installed** — If FFmpeg not available (required by Remotion for video encoding), **abort** with error: `"FFmpeg not installed. Install via system package manager."`. Log to Grimoire with `decision="error"`, `rationale="ffmpeg_not_installed"`.

- **Insufficient disk space** — If render output directory has <1GB free space, **abort** with error: `"Insufficient disk space for render. Require 1GB free, found X MB."`. Log to Grimoire.

- **Invalid template** — If `script_manifest.channel` does not match one of the five templates (PowerScaling / Philosophy / LoreDrop / TrainingArc / LegendsLabs), **fall back to "PowerScaling"** template (default) and log warning.

- **Audio sync issue** — If voice audio duration does not match expected shot duration (±1s tolerance), **stretch or compress audio** to fit (via FFmpeg atempo filter), log warning to Grimoire with `rationale="audio_resampled_shot_N"`.

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage`: `"remotion-composer"`
- `input_id`: `generate_id` from input
- `output_id`: `render_id` from generated output (or `null` if aborted)
- `decision`: `"accept"` (success) | `"error"` (render failed)
- `rationale`: one-line explanation (e.g., `"PowerScaling_1080p30_120s"`, `"missing_artifact_shot_2"`, `"remotion_not_installed"`)
- `cost_usd`: `0.00` (no external API costs; compute is local or via internal render farm)
- `duration_ms`: elapsed time from input receipt to render completion (or abort)
- `file_size_mb`: final MP4 file size (or `0` if aborted)
- `resolution`: `"1080x1920"` | `"2160x3840"`
- `fps`: `30` | `60`
- `render_time_sec`: wall-clock render time (or `0` if aborted)

## Legal firewall

This skill does not generate new content or invoke external APIs. It only composites assets generated upstream by `gen-director`, which already enforced legal filtering. Intro/outro brand assets (logo, particle animations) are AnimeLegends original IP. No copyrighted material is introduced at composition stage.

## Quality gates

- [ ] Output `RemotionComposerOutput` has all required fields (render_id, generate_id, topic, channel, video_path, render_stats, timestamp)
- [ ] `render_id` is valid UUID v4
- [ ] `video_path` file exists on disk and size >0 bytes
- [ ] `render_stats.duration_sec` equals `intro(2s) + generate_manifest.duration_sec + outro(3s)` (±1s tolerance)
- [ ] `render_stats.resolution` matches expected format: "1080x1920" or "2160x3840"
- [ ] `render_stats.fps` is 30 or 60
- [ ] `render_stats.file_size_mb` >0
- [ ] `render_stats.template_used` is one of: PowerScaling, Philosophy, LoreDrop, TrainingArc, LegendsLabs
- [ ] Grimoire log entry created with all required fields
- [ ] Final MP4 plays back successfully in standard video player (manual verification recommended)
- [ ] Audio tracks are in sync with video (±0.1s tolerance)
- [ ] Brand LUT applied (verify color grading matches AnimeLegends aesthetic)
- [ ] Intro and outro sequences present (intro 0-2s, outro last 3s)

## Changelog

### 0.1.0 — 2026-08-16

- Initial release
- Five Remotion v4 templates (PowerScaling, Philosophy, LoreDrop, TrainingArc, LegendsLabs)
- Resolution progression: 1080p@30fps (Day 1-30) → 4K@60fps (Day 31+)
- Brand LUT color grading (+15% contrast, +10% saturation, +8% shadow lift)
- Gold particle intro (2s) and brand bumper outro (3s)
- Audio mixing with per-mascot reverb/EQ
- H.264 codec, CRF 18, slow preset for high quality
- Asset loading with missing file handling
- Grimoire logging integration with render stats
