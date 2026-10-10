# @anime-legends/cli

> Unified CLI cockpit and Model Context Protocol (MCP) server for autonomous anime production.

Part of the **AnimeLegends.ai** studio ecosystem.

## Features

- **CLI Binary**: Quick terminal commands for mascot identity inspection, legal firewall sanitization, screenplay storyboarding, and multi-engine formatting.
- **Native MCP Server**: Complete Model Context Protocol integration exposing 5 tools (`anime_mascot_get`, `anime_prompt_build`, `anime_firewall_sanitize`, `anime_storyboard_create`, `anime_media_format`) for Claude, Cursor, Codex, and Antigravity.

## Installation

```bash
npm install -g @anime-legends/cli
```

## CLI Usage

```bash
# Inspect Mascot Visual Invariants
anime-legends mascot akashi

# Test and Sanitize Prompts via the Legal Firewall
anime-legends firewall "Goku fighting with Naruto in a Studio Ghibli style"

# Generate a Timed Storyboard
anime-legends storyboard --title "Solar Slash" --mascot akashi --scenario "Defending Neo Kyoto"

# Format for Kling / Runway / Fal.ai Flux
anime-legends format --engine kling --prompt "Akashi leaping into battle"
```

## MCP Configuration

Add to your `claude_desktop_config.json` or `cursor.json`:

```json
{
  "mcpServers": {
    "anime-legends": {
      "command": "npx",
      "args": ["-y", "@anime-legends/cli", "mcp"]
    }
  }
}
```

## License

MIT © Frank Riemer / Arcanea
