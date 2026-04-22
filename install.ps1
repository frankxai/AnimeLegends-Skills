# AnimeLegends Skills — one-command installer (Windows PowerShell 7+)
#
# Usage:
#   iwr -useb https://raw.githubusercontent.com/frankxai/AnimeLegends-Skills/main/install.ps1 | iex
#
# What it does:
#   1. Clones repo into %USERPROFILE%\.claude\skills-sources\animelegends-skills\
#   2. Symlinks 8 skills into %USERPROFILE%\.claude\skills\*
#      (requires elevated PowerShell OR Developer Mode enabled)
#   3. Validates frontmatter
#   4. Prints next steps

$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/frankxai/AnimeLegends-Skills.git'
$SourcesDir = Join-Path $env:USERPROFILE '.claude\skills-sources\animelegends-skills'
$SkillsDir = Join-Path $env:USERPROFILE '.claude\skills'

function Write-Cyan($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Green($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Red($msg) { Write-Host $msg -ForegroundColor Red }

Write-Cyan '→ AnimeLegends Skills installer'

# Elevation / Developer Mode check
$canSymlink = $false
try {
    $testPath = Join-Path $env:TEMP "alskills-symlink-test-$(Get-Random)"
    $testTarget = Join-Path $env:TEMP 'alskills-symlink-target-test'
    New-Item -ItemType Directory -Path $testTarget -Force | Out-Null
    New-Item -ItemType SymbolicLink -Path $testPath -Target $testTarget -ErrorAction Stop | Out-Null
    Remove-Item $testPath
    Remove-Item $testTarget
    $canSymlink = $true
} catch {
    Write-Red '  ✗ Cannot create symbolic links. Either:'
    Write-Red '     a) Run this as Administrator, OR'
    Write-Red '     b) Enable Developer Mode: Settings → Privacy & Security → For Developers'
    exit 1
}

# 1. Ensure dirs exist
New-Item -ItemType Directory -Path $SkillsDir -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path -Parent $SourcesDir) -Force | Out-Null

# 2. Clone or update
if (Test-Path (Join-Path $SourcesDir '.git')) {
    Write-Cyan '→ Repo already cloned — pulling latest'
    git -C $SourcesDir pull --ff-only
} else {
    Write-Cyan "→ Cloning $RepoUrl → $SourcesDir"
    git clone --depth 1 $RepoUrl $SourcesDir
}

# 3. Symlink every skill
Write-Cyan "→ Linking skills into $SkillsDir"
$linked = 0
$skillSources = Get-ChildItem -Directory (Join-Path $SourcesDir 'skills\animelegends')
foreach ($skill in $skillSources) {
    $target = Join-Path $SkillsDir $skill.Name

    if (Test-Path $target) {
        $item = Get-Item $target -Force
        if ($item.LinkType) {
            Remove-Item $target
        } else {
            Write-Red "  ✗ $($skill.Name) exists and is not a symlink — skipping (manual conflict resolution required)"
            continue
        }
    }

    New-Item -ItemType SymbolicLink -Path $target -Target $skill.FullName | Out-Null
    Write-Green "  ✓ $($skill.Name)"
    $linked++
}

if ($linked -eq 0) {
    Write-Red 'No skills linked.'
    exit 1
}

# 4. Frontmatter validation (portable bash required — typically available via Git Bash)
$validator = Join-Path $SourcesDir 'tests\validate-skills.sh'
if (Test-Path $validator) {
    Write-Cyan '→ Validating frontmatter'
    try {
        bash $validator (Join-Path $SourcesDir 'skills\animelegends')
    } catch {
        Write-Red '  (validator requires bash — install Git Bash or skip this step)'
    }
}

# 5. Summary
Write-Host ''
Write-Green "✓ $linked skills installed."
Write-Host ''
Write-Host 'Next steps:'
Write-Host "  1. List installed skills:  ls $SkillsDir"
Write-Host '  2. Register MCP servers (optional but recommended):'
Write-Host "       edit $env:USERPROFILE\.claude\mcp.json — see INSTALL.md in the source repo"
Write-Host '  3. Try a skill:  in Claude Code, run  /skill signal-forge'
Write-Host ''
Write-Host "Source repo: $SourcesDir"
Write-Host 'Docs:        https://github.com/frankxai/AnimeLegends-Skills'
