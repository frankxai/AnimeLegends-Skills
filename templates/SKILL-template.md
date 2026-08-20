---
name: your-skill-name
description: One sentence under 250 chars. What this skill does, when Claude should use it. Active voice. Specific triggers.
type: core
version: 0.1.0
when_to_use: |
  When the user invokes [specific command or pattern]. Fires at [specific pipeline stage]. Excludes [what it does NOT handle].
---

# your-skill-name

## Intent

One paragraph: what this skill does in the pipeline, what stage it occupies, what upstream feeds it, what downstream consumes its output. Be precise — this is the first thing a reader sees.

## Inputs

What this skill expects to receive. Typed shape:

```typescript
interface YourSkillInput {
  // ... fields with inline comments
}
```

Source of input (upstream skill, MCP tool, user prompt, etc.).

## Outputs

What this skill produces. Typed shape:

```typescript
interface YourSkillOutput {
  // ... fields with inline comments
}
```

Where the output goes (downstream skill, file on disk, MCP tool call, etc.).

## Core logic / rules

The structured steps this skill follows. Numbered list. Each step must be actionable.

1. **Step name** — what happens, with any sub-rules
2. **Step name** — what happens
3. ...

## Worked examples

**Minimum 3 worked end-to-end examples.** Real input → real output. No "TODO add example."

### Example 1: [descriptive name]

**Input:**

```json
{ ... }
```

**Output:**

```json
{ ... }
```

**Why this output:** one sentence explaining the key decision(s) the skill made.

### Example 2: [descriptive name]

...

### Example 3: [descriptive name]

...

## Failure modes

What happens when things go wrong. Explicit handling rules.

- **Upstream empty** — return X with status `deferred`
- **External API timeout** — retry once with T, then abort and log
- **Legal-firewall trigger** — abort with reason, log to Grimoire
- ...

## Grimoire logging contract

Every invocation of this skill logs via `grimoire-keeper`. Fields logged:

- `stage` — the pipeline stage name
- `input_id` — UUID of input manifest
- `output_id` — UUID of produced manifest (if produced)
- `decision` — accept / defer / reject
- `rationale` — one-line explanation
- `cost_usd` — if the skill invokes paid providers
- `duration_ms`

## Legal firewall (if applicable)

If this skill handles external content (topics, text, imagery, audio), document the copyright filter:

- What patterns trigger a block / substitution
- Reference to `brand/never-say.md` or equivalent
- Fallback behavior when a copyrighted reference is detected

## Quality gates

What must be true for this skill's output to be considered valid. Checklist format:

- [ ] Output manifest has all required fields
- [ ] Downstream skill can parse the output
- [ ] Cost estimation (if paid providers used) within budget
- [ ] Legal firewall passed
- [ ] ...

## Changelog

### 0.1.0 — YYYY-MM-DD

- Initial release
