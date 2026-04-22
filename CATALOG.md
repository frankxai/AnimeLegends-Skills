# Skill Catalog

Index of every skill in this marketplace with frontmatter metadata and one-line intent.

---

## Core Pipeline Skills — AnimeLegends.ai

### `signal-forge`
**Stage:** 1 — SIGNAL
**Type:** core
**Source:** [`skills/animelegends/signal-forge/SKILL.md`](./skills/animelegends/signal-forge/SKILL.md)
**Description:** Ingests trending topics from Reddit + AniList, applies 4-axis scoring (engagement 35% · brand-fit 30% · controversy 20% · recency 15%), strips copyrighted references, routes to channel + mascot assignment, hands off a `SignalManifest` to concept-forge.
**Inputs:** topic URL / manual string / `from-signal` command
**Outputs:** `SignalManifest` JSON
**Decay:** 48h half-life on trend recency

### `concept-forge`
**Stage:** 2 — CONCEPT
**Type:** core
**Source:** [`skills/animelegends/concept-forge/SKILL.md`](./skills/animelegends/concept-forge/SKILL.md)
**Description:** Maps topic → archetype (via Atlas taxonomy), assigns trinity mascots (Mira opens · Kage measures · Akashi closes), selects one of 6 hook formulas, decides duration (30/45/60s) per channel, designs payoff, outputs `ConceptManifest`.
**Inputs:** `SignalManifest` OR raw topic
**Outputs:** `ConceptManifest` JSON with hook_variants for A/B testing

### `script-forge`
**Stage:** 3 — SCRIPT
**Type:** core
**Source:** [`skills/animelegends/script-forge/SKILL.md`](./skills/animelegends/script-forge/SKILL.md)
**Description:** Writes dialogue + scene structure in mascot voice. Strict voice rules per mascot (AKASHI: 2.0 wps deep reverb; KAGE: 2.5-3.0 wps clear metallic; MIRA: 2.0-2.5 wps warm curious). 3/5/8-beat templates.
**Inputs:** `ConceptManifest`
**Outputs:** `ScriptManifest` with timed dialogue, scene breakdowns, caption text

### `storyboard-forge`
**Stage:** 4 — STORYBOARD
**Type:** core
**Source:** [`skills/animelegends/storyboard-forge/SKILL.md`](./skills/animelegends/storyboard-forge/SKILL.md)
**Description:** Breaks script into shots with camera angle emotional map, generates image prompts using 4-block Archetype Prompt Structure (STYLE LOCK / SUBJECT / LIGHTING / COMPOSITION), specifies motion intent for video gen.
**Inputs:** `ScriptManifest`
**Outputs:** `StoryboardManifest` with shot list, per-shot prompts, LoRA trigger injections

### `gen-director`
**Stage:** 5 — GENERATE
**Type:** core
**Source:** [`skills/animelegends/gen-director/SKILL.md`](./skills/animelegends/gen-director/SKILL.md)
**Description:** Orchestrates all external model calls via `animelegends-gen` MCP. Model router with fallback chains (Flux dev+LoRA → Flux 1.1 Pro Ultra → Ideogram v3 → Wan 2.2; Kling 2.5 → 2.0 → Runway Gen-4 Turbo → Wan 2.2). CLIP quality gate at 7/10 with max 3 retries. Per-mascot voice routing + reverb profiles.
**Inputs:** `StoryboardManifest`
**Outputs:** `GenerateManifest` with artifact paths + quality scores + cost breakdown
**Cost gate:** blocks batches >$5 without explicit manifest override

### `remotion-composer`
**Stage:** 6 — ASSEMBLE
**Type:** core
**Source:** [`skills/animelegends/remotion-composer/SKILL.md`](./skills/animelegends/remotion-composer/SKILL.md)
**Description:** Composites generated assets into final MP4 via Remotion v4. Five templates mapped to five sub-channels (PowerScaling, Philosophy, LoreDrop, TrainingArc, LegendsLabs). Applies brand LUT + gold particle intro + 3s brand bumper outro.
**Inputs:** `GenerateManifest`
**Outputs:** rendered MP4 at 1080×1920 (Day 1-30) or 2160×3840 (Day 31+) / 60fps from Day 31

### `publish-orchestrator`
**Stage:** 7 — DISTRIBUTE
**Type:** core
**Source:** [`skills/animelegends/publish-orchestrator/SKILL.md`](./skills/animelegends/publish-orchestrator/SKILL.md)
**Description:** Publishes final MP4 to TikTok Business + YouTube Shorts + Instagram Reels + X. Platform-specific caption + hashtag generation, scheduled posting, metrics pull at 12h/24h/48h.
**Inputs:** rendered MP4 + metadata
**Outputs:** published URLs per platform + `DistributeManifest` with scheduled timestamps

### `grimoire-keeper`
**Stage:** +1 — GRIMOIRE (always-on)
**Type:** core
**Source:** [`skills/animelegends/grimoire-keeper/SKILL.md`](./skills/animelegends/grimoire-keeper/SKILL.md)
**Description:** Facade over Starlight Intelligence System (SIS). Every pipeline stage logs via this skill. Seed-curation-from-production loop (top 10% engagement → next LoRA retrain). Contradiction detection via `sis_contradict`. Counsel audit export with SHA256 tamper evidence.
**Substrate:** SIS MCP (primary) → local `grimoire/log.json` (fallback)
**Critical for:** legal posture evidence trail, quality ratchet across versions

---

## Substrate Skills (upstream, referenced by AnimeLegends)

### From [Starlight Intelligence System](https://github.com/frankxai/starlight-intelligence-system)

- `sis_vault_search` — semantic search across 6 vaults
- `sis_append_entry` — durable append to named vault
- `sis_contradict` — log a contradiction between prior entries
- `sis_stale` — mark a prior entry as superseded
- *(10 tools total — see SIS repo README)*

### From [Arcanea](https://github.com/frankxai/arcanea)

- `/arcanea-nft-pfp` — PFP generation via Nano Banana 2 + ComfyUI LoRA batch + Pinata IPFS + ERC721A on Base
- `/arcanea-infogenius` — research-grounded visual gen via Gemini 3 Pro
- `/arcanea-author-council` — 5-voice critique pattern

These are **not redistributed here** — install their source repos directly for substrate functionality.

---

## Slash Commands

Command specs that invoke one or more skills:

| Command | File | Invokes |
|---|---|---|
| `/new-short` | [`commands/new-short.md`](./commands/new-short.md) | All 8 skills end-to-end |
| `/from-signal` | [`commands/from-signal.md`](./commands/from-signal.md) | signal-forge → concept-forge → (rest) |
| `/remix` | [`commands/remix.md`](./commands/remix.md) | Starts from an existing ShortManifest, regenerates selected stages |
| `/publish` | [`commands/publish.md`](./commands/publish.md) | publish-orchestrator only (for pre-rendered MP4) |
| `/grimoire-query` | [`commands/grimoire-query.md`](./commands/grimoire-query.md) | grimoire-keeper query operations |

---

## Versioning

Marketplace skills follow semantic versioning per skill. A skill's version lives in its frontmatter as `version: X.Y.Z`.

| Change type | Bump |
|---|---|
| Bug fix, typo, prose improvement | patch |
| New worked example, minor spec extension, non-breaking addition | minor |
| Breaking contract change (manifest shape changed, skill renamed, mandatory new input) | major |

Release notes: [`CHANGELOG.md`](./CHANGELOG.md) — produced on every tagged release.

---

## Quality gates (enforced by CI)

Every skill must pass:

- **Frontmatter valid** — YAML frontmatter present with required keys (`name`, `description`, `type`, `when_to_use`)
- **Description ≤ 250 chars** — Claude Code convention
- **No placeholders** — no `TODO`, no `TBD`, no "implement later"
- **Links resolve** — all markdown links reach a valid target
- **Name matches directory** — `skills/animelegends/foo/SKILL.md` must have `name: foo` in frontmatter

Run locally: `./tests/validate-skills.sh`

---

*Catalog rebuilt on every CI run.*
