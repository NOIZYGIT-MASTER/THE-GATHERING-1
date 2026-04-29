#!/usr/bin/env bash
# update-gitkraken-remotes.sh
# Run on GOD after migration to update all local clones
# Author: RSP_001 — Robert Stephen Plowman | NOIZYFISH INC.

set -euo pipefail

DEST_ORG="NOIZY-ai"
LOCAL_ROOT="${HOME}/Code"

green(){ echo -e "\033[32m  ✓ $1\033[0m"; }
warn(){  echo -e "\033[33m  ⚠ $1\033[0m"; }
info(){  echo -e "\033[90m    $1\033[0m"; }

REPOS=(
  "NOIZYFISH"
  "NOIZYLAB"
  "NOIZYKIDZ"
  "THE-DREAMCHAMBER"
  "DREAMCHAMBER"
)

echo -e "\n\033[1m\033[36m Updating local git remotes → NOIZY-ai org\033[0m\n"

for repo in "${REPOS[@]}"; do
  NEW_REMOTE="git@github.com:${DEST_ORG}/${repo}.git"
  LOCAL="${LOCAL_ROOT}/${repo}"

  if [ -d "${LOCAL}/.git" ]; then
    git -C "$LOCAL" remote set-url origin "$NEW_REMOTE" 2>/dev/null
    green "${repo}"
    info "→ ${NEW_REMOTE}"
    # Verify it works
    git -C "$LOCAL" ls-remote --heads origin &>/dev/null \
      && info "remote reachable ✓" \
      || warn "remote not yet reachable — transfer may still be propagating"
  else
    warn "${repo}: no clone at ${LOCAL}"
    info "Clone with: git clone git@github.com:${DEST_ORG}/${repo}.git ${LOCAL}"
  fi
done

echo ""
echo -e "\033[32m  Done. Run \`gk mcp\` to verify GitKraken sees the new locations.\033[0m"
