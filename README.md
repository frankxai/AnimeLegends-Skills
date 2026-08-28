# AnimeLegends Skills — Claude Code Marketplace

> The eight skills that power [AnimeLegends.ai](https://animelegends.ai) — a generative-native anime studio with an open orchestration layer.

Fork them. Run your own studio. Contribute back.

```sh
npx skills add frankxai/AnimeLegends-Skills
```

Pack contract: [`SKILLPACK.md`](./SKILLPACK.md). Not `awesome-anime-agent-skills`.

---

## What this is

A curated set of Claude Code skills implementing the **7+1 stage generative-anime pipeline**:

```
SIGNAL → CONCEPT → SCRIPT → STORYBOARD → GENERATE → ASSEMBLE → DISTRIBUTE
                                                                      ↓
                                                                  GRIMOIRE
```

Each stage is a real `SKILL.md` — not a stub, not a sketch. Every skill has:
- Production-grade prompt engineering
- Manifest contracts for typed stage-to-stage handoff
- Mascot-aware logic (AKASHI · KAGE · MIRA)
- Grimoire logging via the [Starlight Intelligence System](https://github.com/frankxai/starlight-intelligence-system)
- Legal-firewall enforcement (original-IP only)

## The eight skills

| Stage | Skill | Purpose |
|---|---|---|
| 1 | `signal-forge` | Trend ingest (Reddit + AniList), 4-axis scoring, copyright filter |
| 2 | `concept-forge` | Archetype routing, hook formulas, trinity mascot logic |
| 3 | `script-forge` | Dialogue + scene breakdown in mascot voice |
| 4 | `storyboard-forge` | Shot-by-shot prompts with camera-angle emotional map |
| 5 | `gen-director` | Image/video/voice/music routing, LoRA injection, quality gates |
| 6 | `remotion-composer` | TypeScript/React composition, typed manifests, render |
| 7 | `publish-orchestrator` | TikTok + YouTube Shorts + Instagram + X distribution |
| +1 | `grimoire-keeper` | SIS-substrate logging, audit export, seed-curation loop |

See [CATALOG.md](./CATALOG.md) for the full index with frontmatter metadata.

## Quick start

**One-command install:**

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/frankxai/AnimeLegends-Skills/main/install.sh | bash

# Windows (PowerShell 7+)
iwr -useb https://raw.githubusercontent.com/frankxai/AnimeLegends-Skills/main/install.ps1 | iex
```

**Manual install:**

```bash
git clone https://github.com/frankxai/AnimeLegends-Skills
cd AnimeLegends-Skills
./install.sh          # symlinks skills into ~/.claude/skills/animelegends/
```

Full install instructions, MCP server registration, and troubleshooting: [INSTALL.md](./INSTALL.md).

## What makes this different

Most "AI video pipeline" repos ship a frontend wrapper around a SaaS aggregator. This one ships:

- **Typed manifests between every stage** (`AGENT.md` in the full studio repo)
- **Provider-routed I/O** — Flux.1 (fal.ai), Kling v2, ElevenLabs, Suno v4.5, each behind an MCP server
- **Mascot canon enforcement** — every generated frame logs mascot assignment for consistency tracking
- **CLIP-scored quality gates** — generations below 7/10 on brand-fidelity auto-regenerate
- **Original-IP-only legal posture** — copyright firewall runs at signal stage AND generate stage

You can fork the skills alone or the full [AnimeLegends](https://github.com/frankxai/AnimeLegends) studio monorepo.

## Trinity mascots (original IP)

Skills reference these mascots by name. They're trademark-filed originals.

- **AKASHI** — *The Threshold*. Cosmic narrator, dark robes + gold sigils, galaxy-eyes. Voice: deep, resonant, reverbed. Closes every scene.
- **KAGE** — *The Ledger*. Shadow analyst, chrome android, red optical sensor, blue circuit traces. Voice: clear, metallic. Counts every battle.
- **MIRA** — *The Spark*. Wonder companion, cream-white + pale-blue core droid. Voice: warm, curious. Opens scenes.

Trinity logic: **Mira wonders → Kage measures → Akashi remembers.**

You may use skills to generate your own mascots. You may not use AKASHI / KAGE / MIRA names or likenesses commercially — see [LICENSE.md](./LICENSE.md) for the mascot IP carve-out.

## Substrate dependencies

Skills in this marketplace delegate to two upstream substrate layers:

- **[Starlight Intelligence System (SIS)](https://github.com/frankxai/starlight-intelligence-system)** — memory, attestation, vault routing, contradiction detection. `grimoire-keeper` is a facade over SIS.
- **[Arcanea](https://github.com/frankxai/arcanea)** — parent ecosystem. Design tokens, NFT forge, agent primitives.

Both are optional — skills degrade gracefully to local file storage when substrate is unavailable.

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the skill quality bar, review SLA, and CI gates.

New skill proposals: use the template at [`templates/SKILL-template.md`](./templates/SKILL-template.md). Run `tests/validate-skills.sh` before submitting.

## License

MIT with mascot IP carve-out. See [LICENSE.md](./LICENSE.md).

TL;DR: skills are MIT. Mascot names (AKASHI, KAGE, MIRA) and character designs are not licensed for commercial use without written permission. Fork the pipeline; don't clone the mascots.

## Related

- **[AnimeLegends.ai](https://animelegends.ai)** — the studio this pipeline powers
- **[AnimeLegends monorepo](https://github.com/frankxai/AnimeLegends)** — full studio (Remotion templates, MCP servers, brand kit)
- **[Starlight Intelligence System](https://github.com/frankxai/starlight-intelligence-system)** — substrate memory layer
- **[Arcanea](https://github.com/frankxai/arcanea)** — parent ecosystem

---

*Built in the void. Lit in gold.*
*— AnimeLegends.ai*
