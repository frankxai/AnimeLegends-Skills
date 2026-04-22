#!/usr/bin/env bash
# AnimeLegends Skills — one-command installer (macOS / Linux)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/frankxai/AnimeLegends-Skills/main/install.sh | bash
#
# What it does:
#   1. Clones repo into ~/.claude/skills-sources/animelegends-skills/
#   2. Symlinks 8 skills into ~/.claude/skills/animelegends/*
#   3. Validates frontmatter
#   4. Prints next steps

set -euo pipefail

REPO_URL="https://github.com/frankxai/AnimeLegends-Skills.git"
SOURCES_DIR="$HOME/.claude/skills-sources/animelegends-skills"
SKILLS_DIR="$HOME/.claude/skills"

color_cyan() { printf "\033[36m%s\033[0m\n" "$*"; }
color_green() { printf "\033[32m%s\033[0m\n" "$*"; }
color_red() { printf "\033[31m%s\033[0m\n" "$*" >&2; }

color_cyan "→ AnimeLegends Skills installer"

# 1. Ensure Claude Code skills dir exists
mkdir -p "$SKILLS_DIR"
mkdir -p "$(dirname "$SOURCES_DIR")"

# 2. Clone or update
if [ -d "$SOURCES_DIR/.git" ]; then
  color_cyan "→ Repo already cloned — pulling latest"
  git -C "$SOURCES_DIR" pull --ff-only
else
  color_cyan "→ Cloning $REPO_URL → $SOURCES_DIR"
  git clone --depth 1 "$REPO_URL" "$SOURCES_DIR"
fi

# 3. Symlink every skill
color_cyan "→ Linking skills into $SKILLS_DIR"
linked=0
for skill_dir in "$SOURCES_DIR"/skills/animelegends/*/; do
  skill_name="$(basename "$skill_dir")"
  target="$SKILLS_DIR/$skill_name"

  # Remove existing symlink (fresh install)
  if [ -L "$target" ]; then
    rm "$target"
  elif [ -e "$target" ]; then
    color_red "  ✗ $skill_name exists and is not a symlink — skipping (manual conflict resolution required)"
    continue
  fi

  ln -s "$skill_dir" "$target"
  color_green "  ✓ $skill_name"
  linked=$((linked + 1))
done

if [ "$linked" -eq 0 ]; then
  color_red "No skills linked. Check $SOURCES_DIR/skills/animelegends/ exists and has contents."
  exit 1
fi

# 4. Frontmatter validation
color_cyan "→ Validating frontmatter"
if [ -x "$SOURCES_DIR/tests/validate-skills.sh" ]; then
  if ! "$SOURCES_DIR/tests/validate-skills.sh" "$SOURCES_DIR/skills/animelegends"; then
    color_red "Validation failed — skills linked but may not load correctly."
    exit 2
  fi
else
  color_red "  (validator not executable; skipping — run chmod +x tests/validate-skills.sh manually)"
fi

# 5. Summary + next steps
echo
color_green "✓ $linked skills installed."
echo
echo "Next steps:"
echo "  1. List installed skills:  ls $SKILLS_DIR/ | grep -E 'signal-forge|concept-forge|gen-director'"
echo "  2. Register MCP servers (optional but recommended):"
echo "       edit $HOME/.claude/mcp.json — see INSTALL.md in the source repo"
echo "  3. Try a skill:  in Claude Code, run  /skill signal-forge"
echo
echo "Source repo: $SOURCES_DIR"
echo "Docs:        https://github.com/frankxai/AnimeLegends-Skills"
