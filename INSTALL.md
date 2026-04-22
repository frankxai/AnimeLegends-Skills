# Installation

Three paths: one-command install, manual, or git submodule.

## Prerequisites

- **Claude Code** installed (`claude.ai/code`)
- **Git** 2.25+ (for sparse-checkout in advanced modes)
- **Node.js** 18+ (only needed if you also install the Remotion composition layer)
- **Python** 3.10+ (only needed if you also install the `animelegends-*` MCP servers)
- **`~/.claude/skills/`** directory exists (Claude Code creates this on first run)

## Option 1 — One-command install (recommended)

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/frankxai/AnimeLegends-Skills/main/install.sh | bash
```

### Windows (PowerShell 7+)

```powershell
iwr -useb https://raw.githubusercontent.com/frankxai/AnimeLegends-Skills/main/install.ps1 | iex
```

**What the installer does:**

1. Clones this repo into `~/.claude/skills-sources/animelegends-skills/` (or `%USERPROFILE%\.claude\skills-sources\animelegends-skills\` on Windows)
2. Creates symlinks from `~/.claude/skills/animelegends/*` → the cloned skills
3. Prompts before registering optional MCP servers (SIS, animelegends-gen, animelegends-grimoire, animelegends-signal)
4. Validates frontmatter on every skill

**To uninstall:** delete the symlinks and the clone directory. No system-level state touched.

## Option 2 — Manual install

```bash
git clone https://github.com/frankxai/AnimeLegends-Skills ~/AnimeLegends-Skills
cd ~/AnimeLegends-Skills

# macOS / Linux
for skill in skills/animelegends/*/; do
  ln -s "$(pwd)/$skill" "$HOME/.claude/skills/$(basename $skill)"
done

# Windows (PowerShell, elevated)
Get-ChildItem -Directory skills\animelegends | ForEach-Object {
  New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\skills\$($_.Name)" -Target $_.FullName
}
```

Verify:

```bash
ls ~/.claude/skills/ | grep -E "signal-forge|concept-forge|gen-director|script-forge|storyboard-forge|remotion-composer|publish-orchestrator|grimoire-keeper"
```

Should list all 8.

## Option 3 — Git submodule (for fork-and-extend workflows)

If you're building a fork of AnimeLegends with your own customizations:

```bash
cd your-studio-repo
git submodule add https://github.com/frankxai/AnimeLegends-Skills skills-upstream
ln -s $(pwd)/skills-upstream/skills/animelegends skills/animelegends
```

To pull updates:

```bash
git submodule update --remote --merge
```

## Optional: MCP server registration

The skills can work standalone, but their full power comes with the AnimeLegends MCP servers.

### Claude Code config

Edit `~/.claude/mcp.json` (create if missing):

```json
{
  "mcpServers": {
    "animelegends-gen": {
      "command": "python",
      "args": ["/path/to/AnimeLegends/mcp/animelegends-gen/server.py"],
      "env": {
        "FAL_KEY": "...",
        "KLING_API_KEY": "...",
        "ELEVENLABS_API_KEY": "...",
        "ELEVENLABS_VOICE_AKASHI": "...",
        "ELEVENLABS_VOICE_KAGE": "...",
        "ELEVENLABS_VOICE_MIRA": "...",
        "SUNO_API_KEY": "..."
      }
    },
    "animelegends-grimoire": {
      "command": "python",
      "args": ["/path/to/AnimeLegends/mcp/animelegends-grimoire/server.py"],
      "env": {
        "SUPABASE_URL": "",
        "SUPABASE_ANON_KEY": ""
      }
    },
    "animelegends-signal": {
      "command": "python",
      "args": ["/path/to/AnimeLegends/mcp/animelegends-signal/server.py"]
    },
    "starlight-intelligence-system": {
      "command": "node",
      "args": ["/path/to/Starlight-Intelligence-System/dist/mcp-server.js"]
    }
  }
}
```

The SIS server is **recommended** — it's the substrate the `grimoire-keeper` skill delegates to. Without it, `grimoire-keeper` falls back to local JSON, which works but loses contradiction detection and cross-session memory.

Full MCP server code lives in the [AnimeLegends studio monorepo](https://github.com/frankxai/AnimeLegends).

## Verifying the install

In a Claude Code session, run:

```
/skill signal-forge
```

If the skill frontmatter loads, you're set. Repeat for each skill name. Every skill should show its YAML frontmatter and first few lines of content.

## Troubleshooting

**"Skill not found"** — check that the symlink target exists and that `~/.claude/skills/` is a directory (not a file).

**"Frontmatter invalid"** — run `./tests/validate-skills.sh` from the cloned repo to see which skill has malformed YAML.

**"MCP server not responding"** — the skills work without MCP servers; they just can't call providers. Check `claude-code mcp list` to see registered servers and their status.

**Still stuck?** Open an issue: https://github.com/frankxai/AnimeLegends-Skills/issues

## What to do next

- Read [CATALOG.md](./CATALOG.md) for the full skill index
- Try the `/new-short` flow documented at the [AnimeLegends quickstart](https://github.com/frankxai/AnimeLegends/blob/main/QUICKSTART.md)
- Fork and build your own studio — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the skill template
