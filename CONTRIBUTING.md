# Contributing

Thanks for considering a contribution. This marketplace is the public face of the AnimeLegends.ai pipeline — quality bar is high, review is fast.

## How to propose a new skill

1. **Open a "Skill Proposal" issue first.** Before writing code, describe: what pipeline gap it fills, what manifest it consumes/produces, what existing skill it replaces or complements. Skills that duplicate existing functionality are closed. Skills that extend the 7+1 pipeline contract need a maintainer's pre-approval — open the issue.

2. **Fork `templates/SKILL-template.md`.** Copy it to `skills/animelegends/<your-skill-name>/SKILL.md`. Fill every section. Zero placeholders.

3. **Run `./tests/validate-skills.sh`.** CI runs this on every PR. If it fails locally, it fails in CI. Fix before pushing.

4. **Open the PR.** Use the PR template. Link the proposal issue.

## Quality bar

Every skill in this marketplace must have:

- **Production-grade prompt engineering** — if the skill invokes an LLM or generation model, show the exact prompt structure with a ≥3 worked examples
- **Typed manifest contract** — `Inputs:` and `Outputs:` sections with JSON/TypeScript-equivalent shape
- **Failure modes documented** — what happens when upstream fails, timeout, empty response, etc.
- **Grimoire logging contract** — what the skill logs (via `grimoire-keeper`) on every invocation
- **Legal firewall** — if the skill touches external content, how it handles copyright references
- **≥5 worked end-to-end examples** — not "TODO add example"; real text showing inputs → outputs

Reference: `skills/animelegends/script-forge/` and `skills/animelegends/storyboard-forge/` are the quality benchmarks.

## PR review SLA

- **≤24h** — triage (label, assign reviewer, request changes if CI fails)
- **≤72h** — first substantive review
- **≤7 days** — merge or close with explanation

Reviewers won't rewrite your skill for you. If the bar isn't met, the PR will be marked `needs:rework` and closed after 14 days of inactivity.

## Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/). Examples:

```
feat(skills): add signal-forge with 4-axis scoring
fix(skills): gen-director — Kling poll timeout bumped to 180s
docs(skills): concept-forge — add example for Mirror Rival archetype
chore(ci): bump validate-skills.sh ripgrep dep
```

Every commit must include `Co-Authored-By:` if produced with an AI assistant.

## Review checklist

Reviewers use this checklist. Self-check before requesting review:

- [ ] Frontmatter valid (run `./tests/validate-skills.sh`)
- [ ] Description ≤250 chars
- [ ] Name in frontmatter matches directory name
- [ ] No `TODO`, `TBD`, or placeholder text anywhere
- [ ] All markdown links resolve
- [ ] Mascot references (if any) spelled correctly (AKASHI / KAGE / MIRA — all-caps on first reference, per-sentence-case afterward optional)
- [ ] Legal firewall section present if skill touches external content
- [ ] CHANGELOG entry added under `[Unreleased]`
- [ ] If new manifest shape: updated in both the skill AND in AnimeLegends monorepo `AGENT.md`

## Reporting issues

- **Bug in a skill** — open a "Bug Report" issue; include: skill name, invocation, expected vs actual, Claude Code version
- **Skill improvement idea** — open a "Feature Request" issue
- **Security vulnerability** — email `security@animelegends.ai` — do NOT open a public issue
- **Mascot canon question / concern** — open a "Mascot Canon Proposal" issue (template provided)

## Code of conduct

Be kind. Be specific. Assume the other person is smart and busy.

## Maintainer

- [Frank Riemer](https://github.com/frankxai) — `frankxai` on GitHub, `hello@animelegends.ai`

Expect responses within 48h on weekdays. Labs posts include the current "what I'm prioritizing" list for maintainer transparency.
