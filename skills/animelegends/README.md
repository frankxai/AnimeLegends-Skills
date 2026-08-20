# AnimeLegends core skills

The eight production skills that power the AnimeLegends.ai generative pipeline.

## Directory structure

```text
animelegends/
├── signal-forge/         # Stage 1: Topic ingestion + scoring
│   └── SKILL.md
├── concept-forge/        # Stage 2: Archetype mapping + hook design
│   └── SKILL.md
├── script-forge/         # Stage 3: Dialogue + scene structure
│   └── SKILL.md
├── storyboard-forge/     # Stage 4: Shot planning + prompt engineering
│   └── SKILL.md
├── gen-director/         # Stage 5: Model orchestration + quality gates
│   └── SKILL.md
├── remotion-composer/    # Stage 6: Video composition + brand assets
│   └── SKILL.md
├── publish-orchestrator/ # Stage 7: Distribution manifest preparation
│   └── SKILL.md
└── grimoire-keeper/      # +1 Grimoire: Logging + audit trail
    └── SKILL.md
```

## Skills overview

Each skill is a self-contained contract that defines:

- **Intent**: what the skill does in the pipeline
- **Inputs/Outputs**: typed TypeScript interfaces
- **Core logic**: numbered, actionable steps
- **Worked examples**: minimum 3 real JSON input/output pairs
- **Failure modes**: explicit error handling (fail-closed where required)
- **Grimoire logging**: audit trail requirements
- **Legal firewall**: copyright filtering (where applicable)
- **Quality gates**: validation checklist

## Fail-closed policy

Skills that depend on external tools or APIs are **fail-closed**:

- **gen-director**: requires `animelegends-gen` MCP server and provider API keys. Aborts with clear error if unavailable. Does not invent successful generation.
- **publish-orchestrator**: requires live social platform integrations (TikTok Business API, YouTube Data API v3, Instagram Graph API, X API v2). As of 2026-08-16, AnimeLegends has **0 live shorts** and no configured platforms. Skill prepares distribution manifests only, does not publish.
- **signal-forge**: if Reddit/AniList ingest is not configured, accepts only manual topic input.
- **grimoire-keeper**: falls back to local `grimoire/log.json` if SIS MCP is unavailable (logging never blocks the pipeline).

## What was NOT invented

These skills document the **intended pipeline** as designed in the AnimeLegends studio. The following are NOT live as of 2026-08-16:

- **No public MCP server**: `animelegends-gen` MCP for image/video generation is not deployed. gen-director aborts if MCP unavailable.
- **No live social publishing**: TikTok, YouTube, Instagram, X APIs are not configured. publish-orchestrator prepares manifests only.
- **No public Remotion render service**: remotion-composer expects local Remotion v4 + FFmpeg installation.
- **No Discord bot**: No Discord integration for community engagement or video posting.
- **Studio status**: 0 live shorts published, 5 scripted shorts exist in private monorepo but not deployed to <https://www.animelegends.ai>.

## Original IP only

All skills enforce the AnimeLegends copyright policy:

- **Original mascots**: AKASHI, KAGE, MIRA (AnimeLegends IP)
- **No copyrighted characters**: signal-forge legal firewall strips franchise character names (Naruto, Goku, Luffy, etc.)
- **No studio style imitation**: No Ghibli, Trigger, Ufotable, Mappa style prompts

## Contributing

Skills in this repo define the public contract. Implementations live in the [AnimeLegends studio monorepo](https://github.com/frankxai/AnimeLegends) (private during initial build). When contributing:

1. Ensure skill SKILL.md follows `templates/SKILL-template.md` exactly
2. Run `./tests/validate-skills.sh skills/animelegends` to verify format
3. Maintain fail-closed behavior for external dependencies
4. Add minimum 3 worked examples with real JSON
5. No placeholders (TODO/TBD/FIXME)

## Studio links

- **Live studio**: <https://www.animelegends.ai> (0 live shorts as of 2026-08-16)
- **Discovery page**: <https://www.animelegends.ai/discovery> (static content, no embedded shorts)
- **Monorepo**: <https://github.com/frankxai/AnimeLegends> (private)
