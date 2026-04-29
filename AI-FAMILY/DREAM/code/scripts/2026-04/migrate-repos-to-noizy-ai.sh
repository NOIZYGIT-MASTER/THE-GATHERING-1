#!/usr/bin/env bash
# migrate-repos-to-noizy-ai.sh
# NOIZY Repo Migration — RSPNOIZY personal → NOIZY-ai org
# Author: RSP_001 — Robert Stephen Plowman | NOIZYFISH INC.
# Run on: GOD (M2 Ultra)
#
# Usage:
#   export GITHUB_TOKEN="ghp_your_token_here"
#   ./migrate-repos-to-noizy-ai.sh
#
# What it does:
#   1. Pre-flight checks (token, org access, repo list)
#   2. Transfers each eligible repo to NOIZY-ai org via GitHub API
#   3. Updates local git remotes on GOD
#   4. Writes a transfer receipt to the log
#
# What it SKIPS (with explanation):
#   RSPNOIZY/RSPNOIZY  — profile README repo (GitHub special repo, non-transferable)
#   THE-GATHERING      — 421MB fork (forks transfer differently; handled separately)
#
# Repos being transferred:
#   NOIZYFISH, NOIZYLAB, THE-DREAMCHAMBER, DREAMCHAMBER, NOIZYKIDZ

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SOURCE_USER="RSPNOIZY"
DEST_ORG="NOIZY-ai"
GITHUB_API="https://api.github.com"
LOG="/tmp/noizy-migration-$(date +%Y%m%d-%H%M%S).log"

# Local clone root on GOD — update if your repos live elsewhere
LOCAL_ROOT="${HOME}/Code"

# Repos to transfer (ordered by size ascending — smallest first)
REPOS_TO_TRANSFER=(
  "NOIZYFISH"
  "NOIZYLAB"
  "NOIZYKIDZ"
  "THE-DREAMCHAMBER"
  "DREAMCHAMBER"
)

# ── Colour output ─────────────────────────────────────────────────────────────
green(){ echo -e "\033[32m  ✓ $1\033[0m" | tee -a "$LOG"; }
red(){   echo -e "\033[31m  ✗ $1\033[0m" | tee -a "$LOG"; }
warn(){  echo -e "\033[33m  ⚠ $1\033[0m" | tee -a "$LOG"; }
info(){  echo -e "\033[90m    $1\033[0m"  | tee -a "$LOG"; }
step(){  echo -e "\n\033[1m\033[36m▶ $1\033[0m" | tee -a "$LOG"; }
banner(){
  echo -e "\n\033[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m" | tee -a "$LOG"
  echo -e "\033[1m\033[36m  $1\033[0m" | tee -a "$LOG"
  echo -e "\033[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m" | tee -a "$LOG"
}

# ── GitHub API helper ─────────────────────────────────────────────────────────
gh_api() {
  local method="$1"
  local endpoint="$2"
  local data="${3:-}"

  local args=(-s -X "$method"
    -H "Accept: application/vnd.github+json"
    -H "Authorization: Bearer ${GITHUB_TOKEN}"
    -H "X-GitHub-Api-Version: 2022-11-28"
    "${GITHUB_API}${endpoint}")

  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi

  curl "${args[@]}"
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
banner "NOIZY REPO MIGRATION — RSPNOIZY → NOIZY-ai"
echo "  Source:  github.com/${SOURCE_USER}" | tee -a "$LOG"
echo "  Dest:    github.com/${DEST_ORG}"    | tee -a "$LOG"
echo "  Log:     ${LOG}"                    | tee -a "$LOG"
echo "  Time:    $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$LOG"

step "PRE-FLIGHT CHECKS"

# Token set?
if [ -z "${GITHUB_TOKEN:-}" ]; then
  red "GITHUB_TOKEN is not set."
  echo ""
  echo "  Run: export GITHUB_TOKEN=\"ghp_your_token_here\""
  echo "  Then re-run this script."
  echo ""
  echo "  Token needs scopes: repo, admin:org, delete_repo"
  echo "  Create at: https://github.com/settings/tokens/new"
  exit 1
fi
green "GITHUB_TOKEN is set"

# Token valid?
TOKEN_USER=$(gh_api GET "/user" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('login','ERROR'))" 2>/dev/null)
if [ "$TOKEN_USER" != "$SOURCE_USER" ]; then
  red "Token authenticates as '${TOKEN_USER}', expected '${SOURCE_USER}'"
  echo "  Make sure you're using a token from the RSPNOIZY account."
  exit 1
fi
green "Token authenticated as: ${TOKEN_USER}"

# Org exists and token has access?
ORG_CHECK=$(gh_api GET "/orgs/${DEST_ORG}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('login','NOT_FOUND'))" 2>/dev/null)
if [ "$ORG_CHECK" != "$DEST_ORG" ]; then
  red "Cannot access org '${DEST_ORG}' — check token has admin:org scope"
  exit 1
fi
green "Destination org verified: ${DEST_ORG}"

# Verify each repo exists on source account
step "REPO VERIFICATION"
VERIFIED=()
for repo in "${REPOS_TO_TRANSFER[@]}"; do
  STATUS=$(gh_api GET "/repos/${SOURCE_USER}/${repo}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('name','NOT_FOUND'))" 2>/dev/null)
  if [ "$STATUS" = "$repo" ]; then
    green "${repo}: found on ${SOURCE_USER}"
    VERIFIED+=("$repo")
  else
    warn "${repo}: NOT FOUND on ${SOURCE_USER} — skipping"
  fi
done

echo ""
echo "  Repos verified for transfer: ${#VERIFIED[@]}" | tee -a "$LOG"
echo "  Destination: github.com/${DEST_ORG}"          | tee -a "$LOG"
echo ""
echo -e "\033[1m  FINAL CHECK — review the list above.\033[0m"
echo "  Press ENTER to begin transfers, or Ctrl-C to abort."
read -r

# ── Transfer each repo ────────────────────────────────────────────────────────
step "TRANSFERRING REPOS"

TRANSFERRED=()
FAILED=()

for repo in "${VERIFIED[@]}"; do
  echo ""
  info "Transferring ${repo}..."

  RESPONSE=$(gh_api POST "/repos/${SOURCE_USER}/${repo}/transfer" \
    "{\"new_owner\":\"${DEST_ORG}\"}")

  # GitHub returns 202 Accepted for transfer (async operation)
  TRANSFERRED_NAME=$(echo "$RESPONSE" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('name','ERROR'))" 2>/dev/null)
  TRANSFER_URL=$(echo "$RESPONSE" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('html_url',''))" 2>/dev/null)
  ERROR_MSG=$(echo "$RESPONSE" | python3 -c \
    "import json,sys; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null)

  if [ "$TRANSFERRED_NAME" = "$repo" ]; then
    green "${repo} → github.com/${DEST_ORG}/${repo}"
    info "New URL: ${TRANSFER_URL}"
    TRANSFERRED+=("$repo")

    # Brief pause — GitHub needs a moment between transfers
    sleep 3
  else
    red "${repo}: transfer failed — ${ERROR_MSG}"
    FAILED+=("$repo")
  fi
done

# ── Update local git remotes on GOD ──────────────────────────────────────────
step "UPDATING LOCAL GIT REMOTES ON GOD"

for repo in "${TRANSFERRED[@]}"; do
  LOCAL_PATH="${LOCAL_ROOT}/${repo}"
  NEW_REMOTE="git@github.com:${DEST_ORG}/${repo}.git"

  if [ -d "${LOCAL_PATH}/.git" ]; then
    CURRENT_REMOTE=$(git -C "$LOCAL_PATH" remote get-url origin 2>/dev/null || echo "none")
    git -C "$LOCAL_PATH" remote set-url origin "$NEW_REMOTE"
    git -C "$LOCAL_PATH" remote -v >> "$LOG"
    green "${repo}: remote updated → ${NEW_REMOTE}"
    info "was: ${CURRENT_REMOTE}"
  else
    warn "${repo}: no local clone found at ${LOCAL_PATH}"
    info "Run manually: git remote set-url origin ${NEW_REMOTE}"
  fi
done

# ── Check existing NOIZY-ai repos for naming conflicts ───────────────────────
step "POST-TRANSFER VERIFICATION"

echo ""
info "Waiting 10 seconds for GitHub to complete async transfers..."
sleep 10

echo ""
info "Current state of github.com/${DEST_ORG}:"
ORG_REPOS=$(gh_api GET "/orgs/${DEST_ORG}/repos?per_page=100" \
  | python3 -c "
import json, sys
repos = json.load(sys.stdin)
for r in repos:
    priv = '[PRIVATE]' if r['private'] else '[public] '
    print(f\"    {priv}  {r['name']:<35}  {r['updated_at'][:10]}\")
" 2>/dev/null)
echo "$ORG_REPOS" | tee -a "$LOG"

# ── Receipt ───────────────────────────────────────────────────────────────────
banner "MIGRATION RECEIPT"
echo "  Completed:   $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$LOG"
echo "  Transferred: ${#TRANSFERRED[@]} repos"        | tee -a "$LOG"
echo "  Failed:      ${#FAILED[@]} repos"             | tee -a "$LOG"
echo "  Log:         ${LOG}"                          | tee -a "$LOG"
echo ""

if [ ${#TRANSFERRED[@]} -gt 0 ]; then
  echo "  Transferred successfully:" | tee -a "$LOG"
  for r in "${TRANSFERRED[@]}"; do
    echo "    ✓ github.com/${DEST_ORG}/${r}" | tee -a "$LOG"
  done
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "" | tee -a "$LOG"
  echo "  Failed — retry manually:" | tee -a "$LOG"
  for r in "${FAILED[@]}"; do
    echo "    ✗ ${r}" | tee -a "$LOG"
  done
fi

echo ""
echo "  ── Next steps ─────────────────────────────────────────"
echo "  1. Open GitKraken → update workspace to show NOIZY-ai repos"
echo "  2. Run: gk mcp (verify GitKraken MCP sees new org locations)"
echo "  3. Update wrangler.toml GITHUB_ORG if set"
echo "  4. Handle THE-GATHERING fork separately (see notes below)"
echo "  5. RSPNOIZY/RSPNOIZY profile repo stays — GitHub won't transfer it"
echo ""

if [ ${#FAILED[@]} -eq 0 ] && [ ${#TRANSFERRED[@]} -gt 0 ]; then
  echo -e "\033[32m  All transfers complete. NOIZY-ai org is the new home.\033[0m"
else
  echo -e "\033[33m  Partial completion. Review failed repos above.\033[0m"
fi
