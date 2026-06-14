#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# HEAVEN — Smoke Test
# Hits live endpoints, validates shape, reports GABRIEL status.
# Can be run standalone or called from deploy-with-rollback.sh.
#
# Usage:
#   ./scripts/smoke-test.sh
#   SMOKE_TEST_URL=https://heaven.rsp-5f3.workers.dev/api/health ./scripts/smoke-test.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
DIM='\033[2m'; BOLD='\033[1m'; RESET='\033[0m'

BASE="${SMOKE_TEST_URL:-https://noizy.ai}"
BASE="${BASE%/api/health}"   # normalize — strip trailing path if pasted in

PASS=0; FAIL=0

check() {
  local label="$1" url="$2" expected_status="${3:-200}" grep_for="${4:-}"

  local status body
  body=$(curl -sf -w "\n%{http_code}" --max-time 12 \
    -H "Cache-Control: no-cache" \
    "$url" 2>/dev/null || echo -e "\n000")

  status=$(echo "$body" | tail -1)
  body=$(echo "$body" | head -n -1)

  if [[ "$status" == "$expected_status" ]]; then
    if [[ -n "$grep_for" ]] && ! echo "$body" | grep -q "$grep_for"; then
      echo -e "  ${RED}✗${RESET} $label — HTTP $status BUT missing: ${DIM}$grep_for${RESET}"
      FAIL=$(( FAIL + 1 ))
    else
      local extra=""
      [[ -n "$grep_for" ]] && extra=" ${DIM}(found: $grep_for)${RESET}"
      echo -e "  ${GREEN}✓${RESET} $label — HTTP $status$extra"
      PASS=$(( PASS + 1 ))
    fi
  else
    echo -e "  ${RED}✗${RESET} $label — expected HTTP $expected_status, got $status"
    FAIL=$(( FAIL + 1 ))
  fi
}

echo ""
echo -e "${BOLD}🧪 Heaven Smoke Test${RESET}  ${DIM}→ $BASE${RESET}"
echo ""

# Public routes
check "Health endpoint"      "$BASE/api/health"  200  '"gabriel"'
check "Root redirect"        "$BASE/"             200  '"service"'

# 404 shape (should return JSON, not CF HTML)
check "Unknown route → 404"  "$BASE/api/__unknown_route_test__" 404 '"error"'

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "  ${GREEN}✅ All $PASS checks passed${RESET}"
  exit 0
else
  echo -e "  ${RED}✗  $FAIL/$((PASS + FAIL)) checks failed${RESET}"
  exit 1
fi
