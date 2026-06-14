#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# doctor.sh
# Diagnose common NOIZY Empire issues and suggest fixes
# Run via: make doctor
# RSP_001 | NOIZY Empire | 2026
# ═══════════════════════════════════════════════════════════════

# Auto-detect CODEMASTER root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || dirname "$(dirname "$SCRIPT_DIR")")

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

ISSUES=0
WARNINGS=0

echo ""
echo -e "${BOLD}🩺 EMPIRE DOCTOR — Diagnostic Report${NC}"
echo -e "${BOLD}   $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

check_ok() {
    echo -e "  ${GREEN}✅${NC} $1"
}
check_warn() {
    echo -e "  ${YELLOW}⚠️${NC}  $1"
    WARNINGS=$((WARNINGS + 1))
}
check_fail() {
    echo -e "  ${RED}❌${NC} $1"
    echo -e "     ${CYAN}Fix: $2${NC}"
    ISSUES=$((ISSUES + 1))
}

# ═══ 1. Dependencies ═══
echo -e "${BOLD}Dependencies${NC}"

command -v python3 > /dev/null 2>&1 && check_ok "python3 $(python3 --version 2>&1 | awk '{print $2}')" || check_fail "python3 not found" "brew install python3"
command -v node > /dev/null 2>&1 && check_ok "node $(node --version 2>&1)" || check_fail "node not found" "brew install node"
command -v curl > /dev/null 2>&1 && check_ok "curl available" || check_fail "curl not found" "should be built-in on macOS"
command -v jq > /dev/null 2>&1 && check_ok "jq available" || check_warn "jq not installed (optional: brew install jq)"
command -v docker > /dev/null 2>&1 && check_ok "docker available" || check_warn "docker not installed — n8n governance requires it"
command -v shellcheck > /dev/null 2>&1 && check_ok "shellcheck available" || check_warn "shellcheck not installed (optional: brew install shellcheck)"

# ═══ 2. File Integrity ═══
echo ""
echo -e "${BOLD}File Integrity${NC}"

REQUIRED_FILES=(
    "empire-status.sh"
    "AI_MORNING_NEWS.sh"
    "CHECK_ANTHROPIC_STATUS.sh"
    "watchdog.sh"
    "Makefile"
    ".gitignore"
    ".github/copilot-instructions.md"
    "scripts/log-rotate.sh"
    "scripts/pre-commit"
    "config/.env.example"
    "governance/docker-compose.yaml"
)

for f in "${REQUIRED_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$f" ]; then
        check_ok "$f"
    else
        check_fail "$f missing" "re-run turbo setup or check git status"
    fi
done

# Check executability
for f in empire-status.sh AI_MORNING_NEWS.sh CHECK_ANTHROPIC_STATUS.sh watchdog.sh scripts/log-rotate.sh; do
    if [ -f "$SCRIPT_DIR/$f" ] && [ ! -x "$SCRIPT_DIR/$f" ]; then
        check_warn "$f is not executable"
        echo -e "     ${CYAN}Fix: chmod +x $SCRIPT_DIR/$f${NC}"
    fi
done

# ═══ 3. Security ═══
echo ""
echo -e "${BOLD}Security${NC}"

# Check .gitignore protects keys
if grep -q "privatekey" "$SCRIPT_DIR/.gitignore" 2>/dev/null; then
    check_ok ".gitignore protects privatekey"
else
    check_fail "privatekey not in .gitignore" "add 'privatekey' to .gitignore"
fi

# Check for .env files not in .gitignore
if [ -f "$SCRIPT_DIR/config/.env" ] || [ -f "$SCRIPT_DIR/.env" ]; then
    check_warn ".env file exists — ensure it's gitignored"
else
    check_ok "No .env files found in CODEMASTER"
fi

# Check pre-commit hook installed
GIT_HOOKS_DIR=$(git -C "$SCRIPT_DIR" rev-parse --git-dir 2>/dev/null)/hooks
if [ -f "$GIT_HOOKS_DIR/pre-commit" ] && grep -q "CODEMASTER" "$GIT_HOOKS_DIR/pre-commit" 2>/dev/null; then
    check_ok "pre-commit hook installed"
else
    check_warn "pre-commit hook not installed"
    echo -e "     ${CYAN}Fix: cp $SCRIPT_DIR/scripts/pre-commit $GIT_HOOKS_DIR/pre-commit && chmod +x $GIT_HOOKS_DIR/pre-commit${NC}"
fi

# ═══ 4. Stale Paths ═══
echo ""
echo -e "${BOLD}Path Hygiene${NC}"

STALE_COUNT=0
for f in "$SCRIPT_DIR"/*.sh "$SCRIPT_DIR"/scripts/*.sh; do
    [ -f "$f" ] || continue
    # Skip doctor.sh itself (contains detection patterns)
    [ "$(basename "$f")" = "doctor.sh" ] && continue
    if grep -q 'HOME/NOIZYLAB/CODEMASTER' "$f" 2>/dev/null; then
        check_fail "$(basename "$f") has stale hardcoded path" "replace \$HOME/NOIZYLAB/CODEMASTER with \$SCRIPT_DIR"
        STALE_COUNT=$((STALE_COUNT + 1))
    fi
done
if [ "$STALE_COUNT" -eq 0 ]; then
    check_ok "No stale hardcoded paths found"
fi

# Check for old Anthropic URL
OLD_URL_COUNT=0
for f in $(find "$SCRIPT_DIR" -name "*.sh" -o -name "*.json" 2>/dev/null | grep -v .git | grep -v doctor.sh); do
    if grep -q "status.anthropic.com" "$f" 2>/dev/null; then
        check_fail "$(basename "$f") uses stale status.anthropic.com" "replace with status.claude.com"
        OLD_URL_COUNT=$((OLD_URL_COUNT + 1))
    fi
done
if [ "$OLD_URL_COUNT" -eq 0 ]; then
    check_ok "All URLs use status.claude.com"
fi

# ═══ 5. MCP Servers ═══
echo ""
echo -e "${BOLD}MCP Servers${NC}"

MCP_FILES=(
    "mcp/gabriel-mcp/index.js"
    "mcp/voice-bridge/voice-bridge-server.mjs"
)

for f in "${MCP_FILES[@]}"; do
    FULL="$MONOREPO_ROOT/$f"
    if [ -f "$FULL" ]; then
        SIZE=$(wc -c < "$FULL" 2>/dev/null | tr -d ' ')
        check_ok "$f (${SIZE}B)"
    else
        check_fail "$f missing" "check monorepo at $MONOREPO_ROOT"
    fi
done

# ═══ 6. Disk & Logs ═══
echo ""
echo -e "${BOLD}Disk & Logs${NC}"

LOG_DIR="$SCRIPT_DIR/logs"
if [ -d "$LOG_DIR" ]; then
    LOG_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}')
    LOG_FILES=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$(du -sk "$LOG_DIR" 2>/dev/null | awk '{print $1}')" -gt 102400 ]; then
        check_warn "Logs are large ($LOG_SIZE, $LOG_FILES files) — run make log-rotate"
    else
        check_ok "Logs: $LOG_FILES files, $LOG_SIZE total"
    fi
else
    check_warn "logs/ directory doesn't exist (will be auto-created)"
fi

DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
DISK_PCT=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_PCT" -gt 90 ]; then
    check_fail "Disk ${DISK_PCT}% full ($DISK_FREE free)" "clean up old files/docker images"
elif [ "$DISK_PCT" -gt 80 ]; then
    check_warn "Disk ${DISK_PCT}% full ($DISK_FREE free)"
else
    check_ok "Disk ${DISK_PCT}% used ($DISK_FREE free)"
fi

# ═══ 7. Network ═══
echo ""
echo -e "${BOLD}Network${NC}"

if curl -sL --max-time 3 "https://status.claude.com/api/v2/status.json" > /dev/null 2>&1; then
    check_ok "Internet connectivity (status.claude.com reachable)"
else
    check_fail "Cannot reach status.claude.com" "check internet connection / DNS"
fi

if curl -s --max-time 3 "http://localhost:7777/health" > /dev/null 2>&1; then
    check_ok "GABRIEL daemon responding"
else
    check_warn "GABRIEL daemon not responding on localhost:7777"
fi

# ═══ Summary ═══
echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
if [ "$ISSUES" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}CLEAN BILL OF HEALTH ✨${NC}"
elif [ "$ISSUES" -eq 0 ]; then
    echo -e "  ${YELLOW}${BOLD}$WARNINGS warning(s), 0 critical issues${NC}"
else
    echo -e "  ${RED}${BOLD}$ISSUES issue(s), $WARNINGS warning(s)${NC}"
fi
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""

exit $ISSUES
