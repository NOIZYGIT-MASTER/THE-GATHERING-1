#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# HEAVEN — Wrangler Doctor
# Pre-flight health check for the deploy environment.
# Run before any deploy to confirm environment is clean.
#
# Usage: npm run doctor   OR   ./scripts/wrangler-doctor.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
DIM='\033[2m'; BOLD='\033[1m'; CYAN='\033[0;36m'; RESET='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PASS=0; WARN=0; FAIL=0

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; PASS=$(( PASS+1 )); }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; WARN=$(( WARN+1 )); }
fail() { echo -e "  ${RED}✗${RESET} $*"; FAIL=$(( FAIL+1 )); }

echo ""
echo -e "${BOLD}${CYAN}🔍 Heaven — Wrangler Doctor${RESET}"
echo ""

# ── Runtime ───────────────────────────────────────────────────────────────────
echo -e "${BOLD}Runtime${RESET}"
NODE_VER=$(node -v 2>/dev/null) && ok "Node $NODE_VER" || fail "Node.js not found — install via nvm"
WR_VER=$(npx wrangler --version 2>/dev/null | head -1) && ok "$WR_VER" || fail "Wrangler not found — run: npm install"

# ── Auth ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Auth${RESET}"
WHOAMI=$(npx wrangler whoami 2>&1) && {
  EMAIL=$(echo "$WHOAMI" | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | head -1 || echo "unknown")
  ok "Logged in as $EMAIL"
} || fail "Not authenticated — run: npx wrangler login"

# ── Config Fingerprints ───────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Config fingerprints${RESET}"

ACCOUNT_ID=$(grep 'account_id' wrangler.toml | head -1 | grep -oE '[a-f0-9]{32}' || echo "")
if [[ "$ACCOUNT_ID" == "5f36aa9795348ea681d0b21910dfc82a" ]]; then
  ok "account_id → ${DIM}${ACCOUNT_ID:0:8}...${RESET} (rsp@noizy.ai ✓)"
else
  fail "account_id mismatch: $ACCOUNT_ID"
fi

GABRIEL_ID=$(grep -A3 'DB_MEMORY' wrangler.toml | grep 'database_id' | grep -oE '[a-f0-9-]{36}' | head -1 || echo "")
if [[ "$GABRIEL_ID" == "b5b58cc9-1f37-4000-adc5-12f9e419662f" ]]; then
  ok "DB_MEMORY (agent-memory) → ${DIM}${GABRIEL_ID:0:8}...${RESET} (live ✓)"
else
  fail "DB_MEMORY ID mismatch: $GABRIEL_ID (expected b5b58cc9...)"
fi

MAIN=$(grep '^main' wrangler.toml | grep -oE '"[^"]+"' | tr -d '"' || echo "")
if [[ "$MAIN" == "src/index.ts" ]]; then
  ok "main → $MAIN"
else
  fail "main is '$MAIN' — should be 'src/index.ts'"
fi

COMPAT=$(grep 'compatibility_date' wrangler.toml | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1 || echo "")
ok "compatibility_date → $COMPAT"

# ── TypeScript ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}TypeScript${RESET}"
TSC_OUT=$(npx tsc --noEmit 2>&1 || true)
if echo "$TSC_OUT" | grep -q 'error TS'; then
  fail "TypeScript errors found:"
  echo "$TSC_OUT" | grep 'error TS' | head -10 | sed 's/^/    /'
else
  ok "No type errors"
fi

# ── .dev.vars (secrets present locally) ──────────────────────────────────────
echo ""
echo -e "${BOLD}Local secrets (.dev.vars)${RESET}"
if [[ -f ".dev.vars" ]]; then
  for SECRET in NOIZY_KEY ANTHROPIC_API_KEY CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET; do
    if grep -q "^${SECRET}=" .dev.vars 2>/dev/null; then
      ok "$SECRET set"
    else
      warn "$SECRET missing from .dev.vars (OK if using wrangler secrets)"
    fi
  done
else
  warn ".dev.vars not found — using wrangler secrets only"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${DIM}───────────────────────────────────────${RESET}"
if [[ "$FAIL" -gt 0 ]]; then
  echo -e "  ${RED}✗  $FAIL issue(s) must be fixed before deploying${RESET}"
  [[ "$WARN" -gt 0 ]] && echo -e "  ${YELLOW}⚠  $WARN warning(s)${RESET}"
  exit 1
else
  echo -e "  ${GREEN}✅ $PASS checks passed${RESET}"
  [[ "$WARN" -gt 0 ]] && echo -e "  ${YELLOW}⚠  $WARN warning(s) — non-blocking${RESET}"
  echo ""
  echo -e "  ${DIM}🚀 Ready to deploy:  npm run deploy${RESET}"
fi
echo ""
