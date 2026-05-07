#!/usr/bin/env bash
# commit-and-push.sh — one-shot finalize of the DREAMCHAMBER consolidation
#
# Creates a branch, stages the new DREAMCHAMBER artifacts, commits, and pushes.
# Safe-by-default: shows `git status` first, asks before pushing.
#
# Usage:
#   ./commit-and-push.sh              # interactive
#   ./commit-and-push.sh --yes        # non-interactive (commits + pushes)
#   ./commit-and-push.sh --no-push    # commit only, don't push
#
# After push, open:
#   gh pr create --web
# to open a pull request in the browser for review.

set -euo pipefail

REPO="/Users/m2ultra/NOIZYLAB/_consolidation/THE-GATHERING"
BRANCH="consolidation/dreamchamber-2026-04-17"
COMMIT_TITLE="feat(dreamchamber): consolidate MASTER GABRIEL with 63 canonical files"

AUTO_YES=false
PUSH=true
for arg in "$@"; do
  case "$arg" in
    --yes|-y)  AUTO_YES=true ;;
    --no-push) PUSH=false ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

cd "$REPO"

if [[ -t 1 ]]; then G=$'\033[0;32m' Y=$'\033[1;33m' B=$'\033[1;34m' N=$'\033[0m'
else                G='' Y='' B='' N=''; fi

echo ""
echo "🜂 THE-GATHERING consolidation commit — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ─── Branch ──────────────────────────────────────────────────────────────────
current=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current" == "$BRANCH" ]]; then
  echo "  ${G}already on branch${N}  $BRANCH"
elif git show-ref --quiet --heads "$BRANCH"; then
  echo "  ${Y}switching to existing branch${N}  $BRANCH"
  git checkout "$BRANCH"
else
  echo "  ${B}creating branch${N}  $BRANCH  (from $current)"
  git checkout -b "$BRANCH"
fi

# ─── Stage the new artifacts ─────────────────────────────────────────────────
FILES=(
  "DREAMCHAMBER_DISCOVERY_2026-04-17.md"
  "DREAMCHAMBER/GABRIEL/MASTER_GABRIEL.md"
  "DREAMCHAMBER/GABRIEL/README.md"
  "DREAMCHAMBER/GABRIEL/consolidate.sh"
  "commit-and-push.sh"
)

echo ""
echo "  staging:"
for f in "${FILES[@]}"; do
  if [[ -e "$f" ]]; then
    git add "$f"
    echo "    ${G}+${N} $f"
  else
    echo "    ${Y}?${N} $f (missing — skipped)"
  fi
done

# If consolidate.sh has been run, there will also be DREAMCHAMBER/GABRIEL/ content.
if [[ -d "DREAMCHAMBER/GABRIEL/daemon" || -d "DREAMCHAMBER/GABRIEL/turbo-scripts" ]]; then
  echo "    ${G}+${N} DREAMCHAMBER/GABRIEL/  (full tree — from consolidate.sh)"
  git add "DREAMCHAMBER/GABRIEL/"
fi

echo ""
echo "  status:"
git status --short | sed 's/^/    /'

# ─── Commit ──────────────────────────────────────────────────────────────────
if git diff --cached --quiet; then
  echo ""
  echo "  ${Y}nothing staged — nothing to commit${N}"
  exit 0
fi

if [[ "$AUTO_YES" != "true" ]]; then
  echo ""
  read -r -p "  commit & proceed? [y/N] " reply
  if [[ ! "$reply" =~ ^[Yy]$ ]]; then
    echo "  ${Y}aborted before commit${N}"
    exit 0
  fi
fi

git commit -m "$(cat <<EOF
$COMMIT_TITLE

Consolidates ~400 scattered GABRIEL files + 100+ MC96ECOUNIVERSE artifacts
into a single canonical home under DREAMCHAMBER/GABRIEL/.

New:
- MASTER_GABRIEL.md  — unified doctrine (supersedes GABRIEL_MASTER.md,
  GABRIEL_EXECUTOR_v1.0.txt, registry/agents/GABRIEL.md, and the
  GABRIEL ALMEIDA system-bridge fragment)
- README.md          — directory map + 30-file copy manifest
- consolidate.sh     — safe dry-run copy script for bulk consolidation
- DREAMCHAMBER_DISCOVERY_2026-04-17.md — full inventory: 3 GitHub accounts,
  19 repos, 10+ local repos, 400+ GABRIEL files, 100+ MC96 files

Resolves version conflicts:
- email: rsp@noizy.ai (authoritative per identity/contact rules)
- royalty: 75/25 standard + 85/15 RSP_001 founding actor tier
- acronym: "Generative Adaptive Bridge for Intelligent Expression and Learning"
  (+ ALMEIDA as the System Bridge persona)
- role: Commander + Executor + Conscience + Bridge (all four, per tier)
- 9 Never Clauses canonical, 4 Sacred Doctrines canonical

Prompt version: GABRIEL_MASTER_2026-04-17
Date locked: 2026-04-17 (NOIZY launch milestone)
Author: RSP_001

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

echo ""
echo "  ${G}✓ committed${N}"

# ─── Push ────────────────────────────────────────────────────────────────────
if [[ "$PUSH" != "true" ]]; then
  echo "  ${Y}--no-push set — done locally${N}"
  exit 0
fi

if [[ "$AUTO_YES" != "true" ]]; then
  echo ""
  read -r -p "  push to origin/$BRANCH? [y/N] " reply
  if [[ ! "$reply" =~ ^[Yy]$ ]]; then
    echo "  ${Y}not pushed — push manually with:  git push -u origin $BRANCH${N}"
    exit 0
  fi
fi

# First push needs -u; subsequent pushes don't. Handle both.
if git push -u origin "$BRANCH" 2>&1; then
  echo ""
  echo "  ${G}✓ pushed${N}"
  echo ""
  echo "  open a PR:"
  echo "    cd $REPO"
  echo "    gh pr create --web --base main --head $BRANCH \\"
  echo "                  --title \"$COMMIT_TITLE\""
fi
