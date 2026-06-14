#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# empire-status.sh
# Single-command health check for all NOIZY Empire services
# RSP_001 | NOIZY Empire | 2026
# ═══════════════════════════════════════════════════════════════

# Auto-detect CODEMASTER root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

GABRIEL="http://localhost:7777"
HEAVEN="https://heaven.rsp-5f3.workers.dev"
N8N="http://localhost:5678"
ANTHROPIC="https://status.claude.com/api/v2/status.json"

# MCP Server paths (relative to monorepo)
MONOREPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || dirname "$(dirname "$SCRIPT_DIR")")
MCP_GABRIEL="$MONOREPO_ROOT/mcp/gabriel-mcp/index.js"
MCP_VOICE="$MONOREPO_ROOT/mcp/voice-bridge/voice-bridge-server.mjs"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'
BOLD='\033[1m'

TS=$(date '+%Y-%m-%d %H:%M:%S')

echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}  🏛️  NOIZY EMPIRE — STATUS REPORT${NC}"
echo -e "${BOLD}  $TS${NC}"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""

TOTAL=0
UP=0

# ── Helper ──
check_service() {
    local name="$1"
    local url="$2"
    local detail_cmd="$3"

    TOTAL=$((TOTAL + 1))
    RESPONSE=$(curl -sL --max-time 5 "$url" 2>/dev/null)

    if [ -n "$RESPONSE" ]; then
        UP=$((UP + 1))
        DETAIL=""
        if [ -n "$detail_cmd" ]; then
            DETAIL=$(echo "$RESPONSE" | python3 -c "$detail_cmd" 2>/dev/null)
        fi
        echo -e "  ${GREEN}✅ $name${NC}  ${CYAN}$DETAIL${NC}"
    else
        echo -e "  ${RED}❌ $name${NC}  ${YELLOW}unreachable${NC}"
    fi
}

check_process() {
    local name="$1"
    local pattern="$2"

    TOTAL=$((TOTAL + 1))
    PID=$(pgrep -f "$pattern" 2>/dev/null | head -1)
    if [ -n "$PID" ]; then
        UP=$((UP + 1))
        # Get process uptime
        ELAPSED=$(ps -o etime= -p "$PID" 2>/dev/null | tr -d ' ')
        echo -e "  ${GREEN}✅ $name${NC}  ${CYAN}pid:$PID uptime:$ELAPSED${NC}"
    else
        echo -e "  ${RED}❌ $name${NC}  ${YELLOW}not running${NC}"
    fi
}

# ── 1. GABRIEL Daemon ──
echo -e "${BOLD}Core Services${NC}"
check_service "GABRIEL  (daemon)" "$GABRIEL/health" \
    "import sys,json; d=json.load(sys.stdin); print(f'uptime:{d.get(\"uptime\",0)/3600:.1f}h threads:{d.get(\"active_threads\",\"?\")} cache:{d.get(\"cache_entries\",\"?\")}')"

# ── 2. n8n ──
check_service "n8n      (governance)" "$N8N" ""

# ── 3. System vitals ──
TOTAL=$((TOTAL + 1))
LOAD=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | tr -d ',')
DISK_PCT=$(df -h / | tail -1 | awk '{print $5}')
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
SWAP=$(sysctl vm.swapusage 2>/dev/null | awk -F'used = ' '{print $2}' | awk '{print $1}')
MEM_USED=$(vm_stat 2>/dev/null | awk '/Pages active/ {printf "%.0f", $3*4096/1073741824}' || echo "?")
UP=$((UP + 1))
echo -e "  ${GREEN}✅ System${NC}   ${CYAN}load:$LOAD disk:$DISK_PCT($DISK_FREE free) mem:${MEM_USED}G swap:${SWAP:-0}${NC}"

echo ""
echo -e "${BOLD}MCP Servers${NC}"

# ── 4. gabriel-mcp process ──
check_process "gabriel-mcp" "gabriel-mcp/index.js"

# ── 5. voice-bridge process ──
check_process "voice-bridge" "voice-bridge-server.mjs"

# ── 6. MCP file integrity ──
TOTAL=$((TOTAL + 1))
MCP_MISSING=0
[ ! -f "$MCP_GABRIEL" ] && MCP_MISSING=$((MCP_MISSING + 1))
[ ! -f "$MCP_VOICE" ] && MCP_MISSING=$((MCP_MISSING + 1))
if [ "$MCP_MISSING" -eq 0 ]; then
    UP=$((UP + 1))
    GABRIEL_SIZE=$(wc -c < "$MCP_GABRIEL" 2>/dev/null | tr -d ' ')
    VOICE_SIZE=$(wc -c < "$MCP_VOICE" 2>/dev/null | tr -d ' ')
    echo -e "  ${GREEN}✅ MCP files${NC} ${CYAN}gabriel:${GABRIEL_SIZE}B voice:${VOICE_SIZE}B${NC}"
else
    echo -e "  ${RED}❌ MCP files${NC} ${YELLOW}$MCP_MISSING file(s) missing${NC}"
fi

echo ""
echo -e "${BOLD}Cloud Services${NC}"

# ── 7. HEAVEN ──
check_service "HEAVEN   (workers.dev)" "$HEAVEN/health" \
    "import sys,json; d=json.load(sys.stdin); print(f'v{d.get(\"version\",\"?\")} | {d.get(\"ledger_events\",\"?\")} events')"

# ── 8. Anthropic API ──
TOTAL=$((TOTAL + 1))
ANTH_RESP=$(curl -sL --max-time 5 "$ANTHROPIC" 2>/dev/null)
if [ -n "$ANTH_RESP" ]; then
    ANTH_IND=$(echo "$ANTH_RESP" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin); ind=d['status']['indicator']; desc=d['status']['description']
    print(f'{ind} — {desc}')
except:
    print('parse error')
" 2>/dev/null)
    if echo "$ANTH_IND" | grep -q "^none" 2>/dev/null; then
        UP=$((UP + 1))
        echo -e "  ${GREEN}✅ Anthropic${NC} ${CYAN}$ANTH_IND${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Anthropic${NC} ${YELLOW}$ANTH_IND${NC}"
    fi
else
    echo -e "  ${RED}❌ Anthropic${NC} ${YELLOW}unreachable${NC}"
fi

# ── 9. Git status ──
echo ""
echo -e "${BOLD}Repository${NC}"
# Auto-detect repo root (walk up to find .git or use monorepo root)
REPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR")

TOTAL=$((TOTAL + 1))
BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
DIRTY=$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
LAST_COMMIT=$(git -C "$REPO_ROOT" log --oneline -1 2>/dev/null || echo "no commits")
UP=$((UP + 1))
if [ "$DIRTY" = "0" ]; then
    echo -e "  ${GREEN}✅ Git${NC}      ${CYAN}$BRANCH (clean) | $LAST_COMMIT${NC}"
else
    echo -e "  ${YELLOW}⚠️  Git${NC}      ${CYAN}$BRANCH ($DIRTY uncommitted) | $LAST_COMMIT${NC}"
fi

# ── 10. Log health ──
TOTAL=$((TOTAL + 1))
LOG_DIR="$SCRIPT_DIR/logs"
if [ -d "$LOG_DIR" ]; then
    LOG_COUNT=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null | wc -l | tr -d ' ')
    LOG_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}')
    OLDEST_STATE=$(cat "$LOG_DIR/.anthropic_last_state" 2>/dev/null || echo "?")
    UP=$((UP + 1))
    echo -e "  ${GREEN}✅ Logs${NC}     ${CYAN}${LOG_COUNT} files (${LOG_SIZE}) | last_state:$OLDEST_STATE${NC}"
else
    echo -e "  ${YELLOW}⚠️  Logs${NC}     ${YELLOW}logs/ directory missing${NC}"
fi

# ── Summary ──
echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
if [ "$UP" -eq "$TOTAL" ]; then
    echo -e "  ${GREEN}${BOLD}ALL SYSTEMS OPERATIONAL ($UP/$TOTAL)${NC}"
elif [ "$UP" -ge $((TOTAL - 2)) ]; then
    echo -e "  ${YELLOW}${BOLD}$UP/$TOTAL SERVICES UP${NC}  ${DIM}(non-critical items down)${NC}"
else
    echo -e "  ${RED}${BOLD}$UP/$TOTAL SERVICES UP — ATTENTION REQUIRED${NC}"
fi
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""
