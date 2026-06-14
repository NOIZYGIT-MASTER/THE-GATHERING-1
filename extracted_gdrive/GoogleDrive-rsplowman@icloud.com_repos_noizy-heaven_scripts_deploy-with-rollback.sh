#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# HEAVEN — Production Deploy Script
# deploy-with-rollback.sh
#
# Flow:
#   1. Pre-flight (auth, TypeScript, D1 ID fingerprint)
#   2. Snapshot current deployment ID for rollback
#   3. Deploy
#   4. Wait for propagation
#   5. Smoke test (health + GABRIEL ping)
#   6. Auto-rollback on failure
#   7. Print deployment receipt
#
# Usage:
#   npm run deploy            ← this script (safe, with rollback)
#   npm run deploy:force      ← raw wrangler deploy (no guards)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_START=$(date +%s)
TIMESTAMP=$(date '+%Y-%m-%dT%H:%M:%S%z')

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   🌩  HEAVEN — Production Deploy                ║${RESET}"
echo -e "${BOLD}${CYAN}║   noizy.ai  ·  $(date '+%Y-%m-%d %H:%M %Z')          ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Step 1: Pre-flight ────────────────────────────────────────────────────────
echo -e "${BOLD}[1/6] Pre-flight checks${RESET}"

# Node
NODE_VER=$(node -v 2>/dev/null) || { echo -e "  ${RED}✗ Node.js not found${RESET}"; exit 1; }
echo -e "  ${GREEN}✓${RESET} Node $NODE_VER"

# Wrangler
WR_VER=$(npx wrangler --version 2>/dev/null | head -1) || { echo -e "  ${RED}✗ Wrangler not found${RESET}"; exit 1; }
echo -e "  ${GREEN}✓${RESET} $WR_VER"

# Auth check (wrangler whoami is the real gate)
WHOAMI=$(npx wrangler whoami 2>&1) || { echo -e "  ${RED}✗ Wrangler auth failed — run: npx wrangler login${RESET}"; exit 1; }
WR_EMAIL=$(echo "$WHOAMI" | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | head -1 || echo "authenticated")
echo -e "  ${GREEN}✓${RESET} Auth OK — $WR_EMAIL"

# wrangler.toml present and points at correct account
ACCOUNT_ID=$(grep 'account_id' wrangler.toml | head -1 | grep -oE '[a-f0-9]{32}' || echo "")
if [[ "$ACCOUNT_ID" != "5f36aa9795348ea681d0b21910dfc82a" ]]; then
  echo -e "  ${RED}✗ account_id mismatch in wrangler.toml — expected rsp@noizy.ai account${RESET}"
  exit 1
fi
echo -e "  ${GREEN}✓${RESET} Account ID fingerprint OK (${DIM}${ACCOUNT_ID:0:8}...${RESET})"

# D1 fingerprint — GABRIEL brain must be the live ID
GABRIEL_ID=$(grep -A3 'DB_MEMORY' wrangler.toml | grep 'database_id' | grep -oE '[a-f0-9-]{36}' | head -1 || echo "")
if [[ "$GABRIEL_ID" != "b5b58cc9-1f37-4000-adc5-12f9e419662f" ]]; then
  echo -e "  ${RED}✗ DB_MEMORY (agent-memory) ID mismatch!${RESET}"
  echo -e "    ${DIM}Got:      $GABRIEL_ID${RESET}"
  echo -e "    ${DIM}Expected: b5b58cc9-1f37-4000-adc5-12f9e419662f${RESET}"
  exit 1
fi
echo -e "  ${GREEN}✓${RESET} GABRIEL D1 fingerprint OK (${DIM}${GABRIEL_ID:0:8}...${RESET})"

# ── Step 2: TypeScript type-check ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}[2/6] TypeScript check${RESET}"
if npx tsc --noEmit 2>&1 | tee /tmp/tsc_output.txt | grep -q 'error TS'; then
  echo -e "  ${RED}✗ TypeScript errors found:${RESET}"
  cat /tmp/tsc_output.txt
  exit 1
fi
echo -e "  ${GREEN}✓${RESET} No type errors"

# ── Step 3: Snapshot current deployment for rollback ─────────────────────────
echo ""
echo -e "${BOLD}[3/6] Snapshot current deployment${RESET}"
PREV_DEPLOY=$(npx wrangler deployments list --limit 1 2>/dev/null | grep -oE '[a-f0-9-]{36}' | head -1 || echo "")
if [[ -n "$PREV_DEPLOY" ]]; then
  echo -e "  ${GREEN}✓${RESET} Previous deployment ID: ${DIM}$PREV_DEPLOY${RESET}"
else
  echo -e "  ${YELLOW}⚠${RESET}  No previous deployment found (first deploy)"
fi

# ── Step 4: Deploy ────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[4/6] Deploying to Cloudflare Workers${RESET}"
echo -e "  ${DIM}→ npx wrangler deploy${RESET}"
echo ""

DEPLOY_OUTPUT=$(npx wrangler deploy 2>&1) || {
  echo -e "${RED}╔════════════════════════════════╗${RESET}"
  echo -e "${RED}║   ✗  DEPLOY FAILED             ║${RESET}"
  echo -e "${RED}╚════════════════════════════════╝${RESET}"
  echo ""
  echo "$DEPLOY_OUTPUT"
  exit 1
}
echo "$DEPLOY_OUTPUT"

# Extract new version ID
NEW_VERSION=$(echo "$DEPLOY_OUTPUT" | grep -oE '[a-f0-9-]{36}' | head -1 || echo "")
WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[a-zA-Z0-9._/-]+\.workers\.dev' | head -1 || echo "")
echo ""
echo -e "  ${GREEN}✓${RESET} Worker deployed"
[[ -n "$NEW_VERSION" ]] && echo -e "  ${DIM}  Version: $NEW_VERSION${RESET}"
[[ -n "$WORKER_URL" ]]  && echo -e "  ${DIM}  URL:     $WORKER_URL${RESET}"

# ── Step 5: Wait for propagation ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}[5/6] Propagation + smoke test${RESET}"
echo -ne "  ${DIM}Waiting 6s for edge propagation${RESET}"
for i in {1..6}; do sleep 1; echo -n "."; done
echo ""

# Smoke test against the live domain
SMOKE_URLS=(
  "https://noizy.ai/api/health"
  "https://noizy.ai/"
)

ALL_PASSED=true
for URL in "${SMOKE_URLS[@]}"; do
  STATUS=$(curl -sf -o /tmp/smoke_body.txt -w "%{http_code}" \
    -H "Cache-Control: no-cache" \
    --max-time 10 \
    "$URL" 2>/dev/null || echo "000")

  if [[ "$STATUS" == "200" ]]; then
    # Validate GABRIEL is reported as watching
    GABRIEL_OK=$(grep -o '"gabriel"' /tmp/smoke_body.txt || echo "")
    if [[ -n "$GABRIEL_OK" ]]; then
      echo -e "  ${GREEN}✓${RESET} $URL → HTTP $STATUS  ${DIM}(GABRIEL: watching)${RESET}"
    else
      echo -e "  ${GREEN}✓${RESET} $URL → HTTP $STATUS"
    fi
  else
    echo -e "  ${RED}✗${RESET} $URL → HTTP $STATUS"
    ALL_PASSED=false
  fi
done

# ── Step 6: Rollback on smoke failure ─────────────────────────────────────────
if [[ "$ALL_PASSED" == "false" ]]; then
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════╗${RESET}"
  echo -e "${RED}║   ✗  SMOKE TEST FAILED — initiating rollback   ║${RESET}"
  echo -e "${RED}╚════════════════════════════════════════════════╝${RESET}"
  echo ""

  if [[ -n "$PREV_DEPLOY" ]]; then
    echo -e "  ${YELLOW}↩  Rolling back to: $PREV_DEPLOY${RESET}"
    npx wrangler rollback --deployment-id "$PREV_DEPLOY" \
      --message "Auto-rollback: smoke test failed after deploy at $TIMESTAMP" \
      2>&1 || echo -e "  ${RED}✗ Rollback command failed — manual rollback required${RESET}"
  else
    echo -e "  ${YELLOW}⚠  No previous deployment to roll back to${RESET}"
    echo -e "  ${DIM}  Run: npx wrangler rollback${RESET}"
  fi
  exit 1
fi

# ── Receipt ───────────────────────────────────────────────────────────────────
DEPLOY_END=$(date +%s)
ELAPSED=$(( DEPLOY_END - DEPLOY_START ))

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   ✓  HEAVEN IS LIVE                             ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${DIM}Domain:   https://noizy.ai${RESET}"
[[ -n "$NEW_VERSION" ]] && echo -e "  ${DIM}Version:  $NEW_VERSION${RESET}"
echo -e "  ${DIM}At:       $TIMESTAMP${RESET}"
echo -e "  ${DIM}Elapsed:  ${ELAPSED}s${RESET}"
echo ""
echo -e "  ${DIM}Next: check GABRIEL audit trail${RESET}"
echo -e "  ${DIM}  curl -H 'X-Noizy-Key: \$NOIZY_KEY' https://noizy.ai/api/gabriel/RSP_001${RESET}"
echo ""
