---
name: publish-orchestrator
description: Prepares distribution manifest for social platforms (TikTok, YouTube, Instagram, X). Platform-specific captions + hashtags. Scheduled posting times. FAIL-CLOSED: does NOT publish (0 live platforms as of 2026-08-16). Manifest only.
type: core
version: 0.1.0
when_to_use: |
  Stage 7 of the AnimeLegends pipeline. Receives rendered MP4 from remotion-composer. CRITICAL: This skill is FAIL-CLOSED. As of 2026-08-16, AnimeLegends has 0 live shorts published and NO live social platform integrations. This skill prepares distribution manifests for future deployment ONLY. Does NOT publish to TikTok, YouTube, Instagram, X, or Discord.
---

# publish-orchestrator

## Intent

Seventh and final stage of the AnimeLegends generative pipeline. Receives final rendered MP4 from `remotion-composer`, prepares platform-specific captions and hashtags (TikTok Business, YouTube Shorts, Instagram Reels, X vertical video), schedules posting times per platform's optimal engagement windows, and **prepares a `DistributeManifest`** for handoff to external publish systems when they become available.

**CRITICAL CONSTRAINT**: This skill is **FAIL-CLOSED**. As of 2026-08-16, AnimeLegends has **0 live shorts published** and **NO live social platform API integrations**. This skill:
- **DOES NOT** publish to TikTok, YouTube, Instagram, X, or Discord.
- **DOES NOT** open browser automations or post via unofficial APIs.
- **DOES NOT** send to influencer networks or buy domains.
- **DOES** prepare a distribution manifest with platform-ready metadata.
- **DOES** log the "ready-to-publish" status to Grimoire for audit trail.
- **DOES** abort with clear explanation if user attempts to force actual publishing.

When real platform integrations are deployed (TikTok Business API, YouTube Data API v3, Instagram Graph API, X API v2), this skill will orchestrate actual posting via those official APIs. Until then: **manifest preparation only, no publishing**.

## Inputs

What this skill expects to receive:

```typescript
interface PublishOrchestratorInput {
  remotion_output: RemotionComposerOutput;  // from remotion-composer (required)
  script_manifest: ScriptManifest;          // from script-forge (for captions)
  publish_mode: "prepare" | "execute";      // MUST be "prepare" until platforms live (default: prepare)
  scheduled_time?: string;                  // ISO 8601 UTC timestamp for scheduled post (optional)
  platforms?: string[];                     // subset to publish to (default: all)
}
```

Source of input: `RemotionComposerOutput` from `remotion-composer`, with reference to `ScriptManifest` for caption text.

## Outputs

What this skill produces:

```typescript
interface DistributeManifest {
  distribute_id: string;                    // UUID v4
  render_id: string;                        // parent render UUID
  topic: string;                            // clean topic text
  channel: string;                          // PowerScaling | Philosophy | LoreDrop | TrainingArc | LegendsLabs
  video_path: string;                       // final rendered MP4 file path
  status: "prepared" | "scheduled" | "published" | "failed";
  platforms: Array<{
    platform: string;                       // "tiktok" | "youtube" | "instagram" | "x"
    caption: string;                        // platform-specific caption text
    hashtags: string[];                     // platform-optimized hashtags
    scheduled_time?: string;                // ISO 8601 UTC (if scheduled)
    post_url?: string;                      // published URL (null until live)
    status: "prepared" | "scheduled" | "published" | "failed";
    error?: string;                         // error message if publish failed
  }>;
  metrics?: {                               // null until platforms live
    "12h": { views: number; likes: number; comments: number; shares: number; };
    "24h": { views: number; likes: number; comments: number; shares: number; };
    "48h": { views: number; likes: number; comments: number; shares: number; };
  };
  timestamp: string;                        // ISO 8601
}
```

Where the output goes: logged to `grimoire-keeper`, saved to `distribute/manifests/` directory for later handoff to publish systems. **NOT** sent to external platforms (as of 2026-08-16).

## Core logic / rules

### 0. **Platform availability check (FAIL-CLOSED)**

**Before any publish step**, check if social platform integrations are available:

- **As of 2026-08-16**: TikTok Business API, YouTube Data API v3, Instagram Graph API, X API v2 are **NOT configured** for AnimeLegends.
- **Studio status**: 0 live shorts published. 5 scripted shorts exist in private repo but not deployed.
- **Discovery page**: https://www.animelegends.ai/discovery is live with static content, but NO embedded shorts.
- **Subscribe page**: https://www.animelegends.ai/subscribe is 404 (not live).

**If `publish_mode="execute"`**:
- **ABORT immediately** with error: `"publish-orchestrator BLOCKED: No live social platform integrations configured. AnimeLegends has 0 published shorts as of 2026-08-16. This skill prepares distribution manifests only. Set publish_mode='prepare' to continue."`
- Log to `grimoire-keeper` with `stage="publish-orchestrator"`, `decision="blocked"`, `rationale="no_live_platforms"`.
- **Do NOT** attempt to publish to TikTok, YouTube, Instagram, X, or Discord.
- **Do NOT** open Discord bots, browser automations, or unofficial APIs.
- **Return error to user** with clear explanation and future roadmap.

**If `publish_mode="prepare"` (default)**:
- Proceed to manifest preparation steps below.
- Set all platform `status="prepared"` (not "published").
- Set overall manifest `status="prepared"`.
- Log to Grimoire that distribution manifest was created for future handoff.

### 1. **Platform-specific caption generation**

For each target platform in `platforms` array (default: ["tiktok", "youtube", "instagram", "x"]), generate optimized caption:

#### TikTok caption rules:
- **Length**: 150 chars max (TikTok truncates longer captions)
- **Structure**: Hook line + topic rephrased + CTA + hashtags
- **Hashtags**: 3-5 tags (e.g., #PowerScaling #AnimeAnalysis #AnimeTikTok)
- **Emojis**: 2-3 channel-appropriate emojis
- **Example**: "Everyone thinks speed wins—but they're missing something 💥⚡ Why raw power beats speed in anime battles. Follow for more! #PowerScaling #AnimeTheory #AnimeTikTok"

#### YouTube Shorts caption rules:
- **Length**: 100 chars max (Shorts UI truncates aggressively)
- **Structure**: Topic statement + CTA + hashtags
- **Hashtags**: 2-3 tags (e.g., #Shorts #AnimeAnalysis)
- **Emojis**: 1-2 (more subtle than TikTok)
- **Example**: "Why speed doesn't beat power in anime 💥 Subscribe for analysis! #Shorts #AnimeAnalysis"

#### Instagram Reels caption rules:
- **Length**: 125 chars visible before "more" (full 2200 chars supported but truncated)
- **Structure**: Hook line + topic + CTA + hashtags
- **Hashtags**: 5-8 tags (Instagram favors more tags than TikTok)
- **Emojis**: 2-4 (Instagram audience expects more visual flair)
- **Example**: "Speed vs Power: the battle everyone gets wrong ⚡💪 Why raw power dominates in anime. Follow for deep dives! #PowerScaling #AnimeAnalysis #AnimeReels #AnimeTheory #AnimeCommunity"

#### X (Twitter) caption rules:
- **Length**: 280 chars max
- **Structure**: Topic + insight tease + CTA + hashtags
- **Hashtags**: 2-3 tags (X penalizes hashtag spam)
- **Emojis**: 1-2 (more professional tone)
- **Example**: "Why speed doesn't always beat raw power in anime battles ⚡ AOE attacks and zone control neutralize speed every time. Watch the breakdown: [video] #AnimeAnalysis #PowerScaling"

### 2. **Platform-specific hashtag optimization**

Generate hashtag sets per platform:

- **TikTok**: Mix of broad (#anime, #fyp, #foryou) + niche (#PowerScaling, #AnimeTheory, #AnimeLegends)
- **YouTube**: Minimal hashtags (#Shorts, #Anime, #[Channel]) — YouTube favors watch time over hashtags
- **Instagram**: Broad + niche + community tags (#AnimeReels, #AnimeCommunity, #AnimeLovers, #PowerScaling, #AnimeLegends)
- **X**: Niche + trending tags (#AnimeAnalysis, #PowerScaling, #AnimeLegends)

Pull trending hashtags from channel-specific lists (maintained in `brand/hashtags.json` if available, else use defaults above).

### 3. **Scheduled posting time calculation**

If `scheduled_time` not provided, calculate optimal posting time per platform:

- **TikTok**: 6-9 PM user local time (peak engagement). Default: 8 PM UTC (covers US evening + EU late evening).
- **YouTube Shorts**: 12-3 PM UTC (lunch break peak, global).
- **Instagram Reels**: 9 AM - 12 PM UTC (morning scroll peak).
- **X**: 9 AM - 11 AM UTC (commute + work break peak).

If `scheduled_time` provided, use same time for all platforms (unless platform-specific overrides provided).

### 4. **Manifest preparation**

- Populate `DistributeManifest` with all fields.
- For each platform in `platforms` array:
  - Set `platform`, `caption`, `hashtags`, `scheduled_time`.
  - Set `status="prepared"` (NOT "published" — platforms not live).
  - Set `post_url=null` (no URLs until actual publishing).
  - Set `error=null`.
- Set overall manifest `status="prepared"`.
- Set `metrics=null` (no metrics until actual publishing).
- Generate UUID for `distribute_id`, set `timestamp` to ISO 8601 UTC.

### 5. **Manifest persistence**

- Save `DistributeManifest` JSON to `distribute/manifests/{distribute_id}.json`.
- This manifest serves as handoff artifact for future publish systems (when TikTok Business API, YouTube Data API v3, Instagram Graph API, X API v2 are deployed).
- Copy rendered MP4 from `remotion_output.video_path` to `distribute/videos/{distribute_id}.mp4` (archive for publish systems).

### 6. **Grimoire logging**

- Log invocation to `grimoire-keeper` with `stage="publish-orchestrator"`, `input_id=render_id`, `output_id=distribute_id`, `decision="prepared"` (not "published"), `rationale="manifest_prepared_for_future_publish"`, `duration_ms`.

### 7. **User notification**

Return success message:
```
"Distribution manifest prepared: {distribute_id}. Status: PREPARED (not published).
As of 2026-08-16, AnimeLegends has 0 live shorts. Platforms (TikTok, YouTube, Instagram, X) are NOT configured for live publishing.
This manifest is ready for handoff to publish systems when platform integrations are deployed.
Manifest saved to: distribute/manifests/{distribute_id}.json
Video archived to: distribute/videos/{distribute_id}.mp4"
```

## Worked examples

### Example 1: Prepare manifest (default, fail-closed)

**Input:**
```json
{
  "remotion_output": {
    "render_id": "eeee5555-ffff-6666-aaaa-777788889999",
    "topic": "Why speed doesn't beat power",
    "channel": "PowerScaling",
    "video_path": "/workspace/renders/powerscaling_20260816_103000.mp4"
  },
  "script_manifest": {
    "captions": {
      "minimal": "Why speed doesn't always beat raw power in anime battles.",
      "emoji": "Why speed doesn't always beat raw power in anime battles ⚡💥"
    }
  },
  "publish_mode": "prepare"
}
```

**Output:**
```json
{
  "distribute_id": "ffff6666-aaaa-7777-bbbb-888899990000",
  "render_id": "eeee5555-ffff-6666-aaaa-777788889999",
  "topic": "Why speed doesn't beat power",
  "channel": "PowerScaling",
  "video_path": "/workspace/renders/powerscaling_20260816_103000.mp4",
  "status": "prepared",
  "platforms": [
    {
      "platform": "tiktok",
      "caption": "Everyone thinks speed wins—but they're missing something 💥⚡ Why raw power beats speed in anime battles. Follow for more! #PowerScaling #AnimeTheory #AnimeTikTok",
      "hashtags": ["PowerScaling", "AnimeTheory", "AnimeTikTok", "anime", "fyp"],
      "scheduled_time": "2026-08-16T20:00:00Z",
      "post_url": null,
      "status": "prepared"
    },
    {
      "platform": "youtube",
      "caption": "Why speed doesn't beat power in anime 💥 Subscribe! #Shorts #AnimeAnalysis",
      "hashtags": ["Shorts", "AnimeAnalysis", "AnimeLegends"],
      "scheduled_time": "2026-08-16T13:00:00Z",
      "post_url": null,
      "status": "prepared"
    },
    {
      "platform": "instagram",
      "caption": "Speed vs Power: the battle everyone gets wrong ⚡💪 Why raw power dominates. Follow! #PowerScaling #AnimeReels #AnimeTheory",
      "hashtags": ["PowerScaling", "AnimeReels", "AnimeTheory", "AnimeCommunity", "AnimeLegends"],
      "scheduled_time": "2026-08-16T10:00:00Z",
      "post_url": null,
      "status": "prepared"
    },
    {
      "platform": "x",
      "caption": "Why speed doesn't always beat raw power in anime battles ⚡ AOE and zone control neutralize speed. #AnimeAnalysis #PowerScaling",
      "hashtags": ["AnimeAnalysis", "PowerScaling", "AnimeLegends"],
      "scheduled_time": "2026-08-16T10:00:00Z",
      "post_url": null,
      "status": "prepared"
    }
  ],
  "metrics": null,
  "timestamp": "2026-08-16T10:35:00Z"
}
```

**Why this output:** `publish_mode="prepare"` (default). Manifest prepared with platform-specific captions and hashtags. All platforms `status="prepared"`, `post_url=null`. Overall `status="prepared"`. Metrics null. Video NOT published to any platform. Manifest saved for future handoff.

### Example 2: Attempt execute mode (BLOCKED)

**Input:**
```json
{
  "remotion_output": { /* ... */ },
  "script_manifest": { /* ... */ },
  "publish_mode": "execute"
}
```

**Output:**
```json
{
  "error": "publish-orchestrator BLOCKED: No live social platform integrations configured. AnimeLegends has 0 published shorts as of 2026-08-16. This skill prepares distribution manifests only. Set publish_mode='prepare' to continue.",
  "stage": "publish-orchestrator",
  "decision": "blocked",
  "rationale": "no_live_platforms",
  "studio_status": {
    "live_shorts": 0,
    "scripted_shorts": 5,
    "platforms_configured": [],
    "discovery_page": "https://www.animelegends.ai/discovery (static content, no embedded shorts)",
    "subscribe_page": "https://www.animelegends.ai/subscribe (404 not live)"
  },
  "remediation": "AnimeLegends social platform integrations (TikTok Business API, YouTube Data API v3, Instagram Graph API, X API v2) are not yet deployed. When deployed, this skill will support publish_mode='execute'. Until then, use publish_mode='prepare' to generate distribution manifests for later handoff."
}
```

**Why this output:** User attempted `publish_mode="execute"`. Skill is fail-closed: no live platform integrations. Abort immediately with clear error explaining studio status (0 live shorts) and remediation (wait for platform API deployment). Do NOT publish.

### Example 3: Prepare manifest for single platform subset

**Input:**
```json
{
  "remotion_output": { /* ... */ },
  "script_manifest": { /* ... */ },
  "publish_mode": "prepare",
  "platforms": ["youtube"]
}
```

**Output:**
```json
{
  "distribute_id": "gggg7777-bbbb-8888-cccc-999900001111",
  "render_id": "eeee5555-ffff-6666-aaaa-777788889999",
  "topic": "Why speed doesn't beat power",
  "channel": "PowerScaling",
  "video_path": "/workspace/renders/powerscaling_20260816_103000.mp4",
  "status": "prepared",
  "platforms": [
    {
      "platform": "youtube",
      "caption": "Why speed doesn't beat power in anime 💥 Subscribe! #Shorts #AnimeAnalysis",
      "hashtags": ["Shorts", "AnimeAnalysis", "AnimeLegends"],
      "scheduled_time": "2026-08-16T13:00:00Z",
      "post_url": null,
      "status": "prepared"
    }
  ],
  "metrics": null,
  "timestamp": "2026-08-16T10:40:00Z"
}
```

**Why this output:** User specified `platforms=["youtube"]` only. Manifest prepared for YouTube Shorts only, not TikTok/Instagram/X. Status "prepared", not published.

## Failure modes

- **Execute mode attempted (BLOCKED)** — If `publish_mode="execute"`, **ABORT** with error: `"publish-orchestrator BLOCKED: No live social platform integrations configured."` (see Example 2 above). Log to Grimoire with `decision="blocked"`, `rationale="no_live_platforms"`. **Do NOT proceed to publish**.

- **Missing video file** — If `remotion_output.video_path` does not exist on disk, **ABORT** with error: `"Video file not found: {video_path}. Re-run remotion-composer."`. Log to Grimoire with `decision="error"`, `rationale="missing_video_file"`.

- **Invalid platform** — If `platforms` array contains unknown platform (not "tiktok" / "youtube" / "instagram" / "x"), **skip that platform** and log warning to Grimoire. Proceed with valid platforms only.

- **Caption generation failure** — If `script_manifest.captions` is malformed or empty, **generate generic caption** from topic (e.g., `"{topic}. Follow for more anime analysis! #AnimeLegends"`), log warning.

- **Scheduled time in past** — If `scheduled_time` is earlier than current UTC time, **adjust to +1 hour from now**, log warning: `"Scheduled time adjusted: was in past, set to {new_time}"`.

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage`: `"publish-orchestrator"`
- `input_id`: `render_id` from input
- `output_id`: `distribute_id` from generated manifest (or `null` if aborted)
- `decision`: `"prepared"` (manifest created) | `"blocked"` (execute mode rejected) | `"error"` (missing video file)
- `rationale`: one-line explanation (e.g., `"manifest_prepared_4platforms"`, `"no_live_platforms"`, `"missing_video_file"`)
- `cost_usd`: `0.00` (no publish costs until platforms live)
- `duration_ms`: elapsed time from input receipt to manifest generation (or abort)
- `platforms_prepared`: count of platforms in manifest
- `status`: `"prepared"` | `"blocked"`

## Legal firewall

This skill does not generate new content. It only prepares captions (text rewriting of existing sanitized topic) and metadata for distribution. Legal filtering was applied upstream in `signal-forge` (topic sanitization) and `script-forge` (dialogue sanitization). Captions reference only AnimeLegends original IP (channel names, mascots). No copyrighted character names or franchise references in captions.

**Platform-specific content policies** (when platforms go live):
- **TikTok**: no violence, no adult content, no copyrighted music (use AnimeLegends original soundtrack or licensed music)
- **YouTube**: no strikes for copyright, no misleading metadata
- **Instagram**: no spammy hashtags (max 30 tags), no impersonation
- **X**: no hate speech, no spam

All content produced upstream (gen-director, remotion-composer) adheres to these policies.

## Quality gates

- [ ] Output `DistributeManifest` has all required fields (distribute_id, render_id, topic, channel, video_path, status, platforms, timestamp)
- [ ] `distribute_id` is valid UUID v4
- [ ] `status` is "prepared" (NOT "published" — platforms not live as of 2026-08-16)
- [ ] `platforms` array is non-empty
- [ ] Each platform entry has: platform, caption, hashtags, scheduled_time, status ("prepared"), post_url (null)
- [ ] Each platform `caption` adheres to platform-specific length limits (TikTok 150, YouTube 100, Instagram 125 visible, X 280)
- [ ] Each platform `hashtags` array is non-empty and channel-appropriate
- [ ] `metrics` is null (no metrics until actual publishing)
- [ ] Manifest JSON saved to `distribute/manifests/{distribute_id}.json`
- [ ] Video file copied to `distribute/videos/{distribute_id}.mp4`
- [ ] Grimoire log entry created with all required fields
- [ ] If `publish_mode="execute"` attempted, skill aborts with clear error (fail-closed behavior)

## Changelog

### 0.1.0 — 2026-08-16
- Initial release
- **FAIL-CLOSED**: No live platform publishing until TikTok, YouTube, Instagram, X APIs deployed
- Distribution manifest preparation for future handoff
- Platform-specific caption generation (TikTok 150 chars, YouTube 100 chars, Instagram 125 visible, X 280 chars)
- Platform-specific hashtag optimization
- Scheduled posting time calculation per platform engagement windows
- Manifest persistence to `distribute/manifests/` for later publish systems
- Grimoire logging integration with "prepared" status (not "published")
- Clear error messaging when execute mode attempted (studio has 0 live shorts as of 2026-08-16)
