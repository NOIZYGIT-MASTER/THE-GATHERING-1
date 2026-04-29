#!/bin/bash
# ═══════════════════════════════════════════════════════════
# GIT HEAL — NOIZY EMPIRE REPO STABILIZER
# Robert Stephen Plowman | NOIZYFISH INC.
# Heals all 5 local dirty repos, pushes to NOIZY.AI Enterprise
# Run from GOD terminal: bash git_heal.sh
# ═══════════════════════════════════════════════════════════

set -e
GITHUB_ORG="NOIZY.AI"     # GitHub Enterprise org
PERSONAL_ORG="RSPNOIZY"   # Personal GitHub org

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GIT HEAL — NOIZY EMPIRE"
echo "  $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check SSH auth
echo "→ Checking GitHub SSH auth..."
ssh -T git@github.com 2>&1 | grep -i "authenticated\|Hi " || {
  echo "❌ GitHub SSH not authenticated."
  echo "   Run: ssh-keygen -t ed25519 -C 'rsp@noizy.ai'"
  echo "   Then add public key at: https://github.com/settings/keys"
  exit 1
}

# Git identity
git config --global user.name "Robert Stephen Plowman"
git config --global user.email "rsp@noizy.ai"
echo "✅ Git identity: Robert Stephen Plowman <rsp@noizy.ai>"
echo ""

# Discover repos
echo "→ Discovering local repos on GOD..."
REPOS=$(find ~ /Users -name ".git" -maxdepth 5 -type d 2>/dev/null | sed 's|/.git||' | grep -v node_modules | grep -v ".Trash" | sort -u)

echo "  Found repos:"
echo "$REPOS" | while read r; do echo "    $r"; done
echo ""

# Heal each known repo
declare -A REMOTE_MAP=(
  ["noizy-command-center"]="git@github.com:RSPNOIZY/noizy-command-center.git"
  ["noizyanthropic"]="git@github.com:RSPNOIZY/noizyanthropic.git"
  ["documents"]="git@github.com:RSPNOIZY/documents.git"
  ["swift-library"]="git@github.com:RSPNOIZY/swift-library.git"
  ["project"]="git@github.com:RSPNOIZY/noizy.git"
)

for REPO_PATH in $REPOS; do
  REPO_NAME=$(basename "$REPO_PATH")
  REMOTE=${REMOTE_MAP[$REPO_NAME]}

  echo "━━━ $REPO_NAME ━━━"
  cd "$REPO_PATH"

  # Set remote if mapped
  if [ -n "$REMOTE" ]; then
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REMOTE"
    echo "  Remote: $REMOTE"
  else
    echo "  ⚠️  No remote mapping — skipping push"
    cd ~
    continue
  fi

  # Stage and commit any dirty state
  if ! git diff --quiet || ! git diff --staged --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add -A
    git commit -m "chore: heal commit — RSP_001 $(date +%Y-%m-%d)" || echo "  Nothing to commit"
  fi

  # Push
  BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
  git push -u origin "$BRANCH" --force-with-lease 2>/dev/null || git push -u origin "$BRANCH" --force
  echo "  ✅ Pushed $BRANCH → $REMOTE"
  echo ""
  cd ~
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ GIT HEAL COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
