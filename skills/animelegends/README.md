# AnimeLegends core skills

The eight production skills that power the AnimeLegends.ai generative pipeline.

**This directory is populated during release.** Skills are authored in the [AnimeLegends studio monorepo](https://github.com/frankxai/AnimeLegends) and mirrored to this marketplace via the release workflow on every tagged release.

## Planned contents (mirrored from AnimeLegends monorepo)

```
animelegends/
├── signal-forge/         # Stage 1
│   └── SKILL.md
├── concept-forge/        # Stage 2
│   └── SKILL.md
├── script-forge/         # Stage 3
│   └── SKILL.md
├── storyboard-forge/     # Stage 4
│   └── SKILL.md
├── gen-director/         # Stage 5
│   └── SKILL.md
├── remotion-composer/    # Stage 6
│   └── SKILL.md
├── publish-orchestrator/ # Stage 7
│   └── SKILL.md
└── grimoire-keeper/      # +1 Grimoire (always-on)
    └── SKILL.md
```

## Sync strategy

The AnimeLegends monorepo is the **source of truth**. This marketplace mirrors the skills on tagged releases:

1. In AnimeLegends monorepo: tag a release (e.g., `git tag -a v0.1.0`)
2. A GitHub Actions workflow in the monorepo copies `skills/*/SKILL.md` → this repo's `skills/animelegends/`
3. This repo's CI validates the mirrored files
4. A corresponding tag is pushed here with release notes

**Why mirror instead of symlink?** Marketplace users install this repo standalone — they don't clone the full monorepo. Mirroring keeps install size small (~200KB of markdown) while the full studio stays in its own repo.

## Until the first mirrored release

See the skills directly in the monorepo: https://github.com/frankxai/AnimeLegends/tree/main/skills

(The monorepo is private during initial build — ping maintainer for access if you're contributing.)
