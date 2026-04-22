#!/usr/bin/env bash
# Validate AnimeLegends skill frontmatter and structure.
#
# Usage:
#   ./tests/validate-skills.sh [skills-dir]
# Default skills-dir: ./skills/animelegends

set -euo pipefail

SKILLS_DIR="${1:-./skills/animelegends}"
if [ ! -d "$SKILLS_DIR" ]; then
  echo "✗ Skills directory not found: $SKILLS_DIR" >&2
  exit 1
fi

pass=0
fail=0
errors=()

check() {
  local file="$1"
  local name="$(basename "$(dirname "$file")")"

  # 1. Frontmatter exists (delimited by --- ... ---)
  if ! head -n 1 "$file" | grep -qE '^---[[:space:]]*$'; then
    errors+=("$name: missing frontmatter opener (---) on line 1")
    return 1
  fi

  # Find frontmatter closing line
  closer=$(awk 'NR>1 && /^---[[:space:]]*$/ {print NR; exit}' "$file")
  if [ -z "$closer" ]; then
    errors+=("$name: frontmatter not closed with --- after line 1")
    return 1
  fi

  # 2. Required frontmatter keys
  front=$(sed -n "2,$((closer - 1))p" "$file")
  for key in name description type when_to_use; do
    if ! echo "$front" | grep -qE "^${key}:"; then
      errors+=("$name: missing required frontmatter key: $key")
      return 1
    fi
  done

  # 3. Description ≤ 250 chars (multi-line handled: extract value after 'description:')
  desc=$(echo "$front" | awk '/^description:/ { sub(/^description:[[:space:]]*/, ""); desc=$0; getline nxt; while (nxt !~ /^[a-z_]+:/ && nxt !~ /^---/ && length(nxt) > 0) { desc = desc " " nxt; getline nxt }; print desc }')
  desc=$(echo "$desc" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  len=${#desc}
  if [ "$len" -gt 250 ]; then
    errors+=("$name: description is $len chars (max 250)")
    return 1
  fi

  # 4. Name matches directory name
  fm_name=$(echo "$front" | grep -E '^name:' | head -1 | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//' | tr -d '"')
  if [ "$fm_name" != "$name" ]; then
    errors+=("$name: frontmatter name '$fm_name' does not match directory name")
    return 1
  fi

  # 5. No TODO / TBD / placeholder text (body only — after frontmatter)
  body=$(sed -n "$((closer + 1)),\$p" "$file")
  if echo "$body" | grep -qiE '\b(TODO|TBD|FIXME|placeholder|fill[[:space:]]+in|implement[[:space:]]+later)\b'; then
    # Show line number for first offense
    loc=$(grep -inE '\b(TODO|TBD|FIXME|placeholder|fill[[:space:]]+in|implement[[:space:]]+later)\b' "$file" | head -1)
    errors+=("$name: contains placeholder text — $loc")
    return 1
  fi

  return 0
}

echo "→ Validating skills in $SKILLS_DIR"
echo

for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
  if [ ! -f "$skill_file" ]; then
    continue
  fi
  name="$(basename "$(dirname "$skill_file")")"
  if check "$skill_file"; then
    echo "  ✓ $name"
    pass=$((pass + 1))
  else
    echo "  ✗ $name"
    fail=$((fail + 1))
  fi
done

echo
echo "────────────────────────────"
echo "  Pass: $pass"
echo "  Fail: $fail"
if [ "$fail" -gt 0 ]; then
  echo
  echo "Errors:"
  for err in "${errors[@]}"; do
    echo "  - $err"
  done
  exit 1
fi

exit 0
