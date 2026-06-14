#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# watchdog.sh
# Auto-restart failed NOIZY Empire services with backoff
# Run via: make watchdog (single pass) or make watchdog-loop (continuous)
# RSP_001 | NOIZY Empire | 2026
# ═══════════════════════════════════════════════════════════════

# Auto-detect CODEMASTER root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || dirname "$(dirname "$SCRIPT_DIR")")

LOG_DIR="$SCRIPT_DIR/logs"
LOG="$LOG_DIR/watchdog.log"
STATE_DIR="$LOG_DIR/.watchdog"
mkdir -p "$LOG_DIR" "$STATE_DIR"

GABRIEL="http://localhost:7777"
GABRIEL_MCP_ENTRY="$MONOREPO_ROOT/mcp/gabriel-mcp/index.js"
VOICE_BRIDGE_ENTRY="$MONOREPO_ROOT/mcp/voice-bridge/voice-bridge-server.mjs"
N8N_COMPOSE="$SCRIPT_DIR/governance/docker-compose.yaml"

TS=$(date '+%Y-%m-%d %H:%M:%S')

# Max restart attempts before giving up (per service, per hour)
MAX_RESTARTS=3

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ── Helpers ──

log_msg() {
    echo "[$TS] $1" >> "$LOG"
    echo -e "$1"
}

can_restart() {
    local service="$1"
    local state_file="$STATE_DIR/${service}_restarts"
    local hour=$(date '+%Y%m%d%H')

    # Count restarts in current hour
    COUNT=$(grep -c "^$hour" "$state_file" 2>/dev/null || echo 0)
    if [ "$COUNT" -ge "$MAX_RESTARTS" ]; then
        return 1  # exceeded
    fi
    echo "$hour" >> "$state_file"
    return 0
}

check_and_restart() {
    local name="$1"
    local check_cmd="$2"
    local restart_cmd="$3"

    if eval "$check_cmd" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ $name${NC}  running"
        return 0
    fi

    echo -e "  ${RED}❌ $name${NC}  ${YELLOW}down${NC}"

    if can_restart "$name"; then
        log_msg "🔄 RESTARTING $name"
        eval "$restart_cmd" > /dev/null 2>&1 &

        # Wait for it to come up (max 10 seconds)
        for i in $(seq 1 10); do
            sleep 1
            if eval "$check_cmd" > /dev/null 2>&1; then
                log_msg "  ${GREEN}✅ $name restarted successfully${NC}"
                # Announce via macOS say (GABRIEL might be the thing that failed)
                /usr/bin/say -v Daniel "$name is back online" 2>/dev/null &
                return 0
            fi
        done

        log_msg "  ${RED}❌ $name failed to restart${NC}"
        return 1
    else
        log_msg "  ${YELLOW}⏸ $name exceeded $MAX_RESTARTS restarts/hour — skipping${NC}"
        return 1
    fi
}

# ── Main ──

echo ""
echo -e "${BOLD}🐕 WATCHDOG — Service Health & Auto-Restart${NC}"
echo -e "${BOLD}   $TS${NC}"
echo ""

log_msg "Watchdog scan started"

FAILURES=0

# ── 1. GABRIEL Daemon ──
check_and_restart "gabriel-daemon" \
    "curl -s --max-time 3 $GABRIEL/health | grep -q 'status\|uptime'" \
    "cd $MONOREPO_ROOT/mcp/gabriel-mcp && node index.js" \
    || FAILURES=$((FAILURES + 1))

# ── 2. gabriel-mcp (MCP Server) ──
check_and_restart "gabriel-mcp" \
    "pgrep -f 'gabriel-mcp/index.js'" \
    "cd $MONOREPO_ROOT/mcp/gabriel-mcp && node index.js --stdio" \
    || FAILURES=$((FAILURES + 1))

# ── 3. voice-bridge ──
check_and_restart "voice-bridge" \
    "pgrep -f 'voice-bridge-server.mjs'" \
    "cd $MONOREPO_ROOT/mcp/voice-bridge && node voice-bridge-server.mjs --stdio" \
    || FAILURES=$((FAILURES + 1))

# ── 4. n8n (Docker) ──
check_and_restart "n8n" \
    "curl -s --max-time 3 http://localhost:5678 | grep -qi 'n8n\|html'" \
    "cd $SCRIPT_DIR/governance && docker compose up -d" \
    || FAILURES=$((FAILURES + 1))

# ── Summary ──
echo ""
if [ "$FAILURES" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}All services healthy.${NC}"
    log_msg "All services healthy"
else
    echo -e "${YELLOW}${BOLD}$FAILURES service(s) need attention.${NC}"
    log_msg "$FAILURES service(s) need attention"
fi
echo ""

# ── Cleanup old restart counters (keep last 24 hours) ──
find "$STATE_DIR" -name "*_restarts" -mtime +1 -delete 2>/dev/null

exit $FAILURES
