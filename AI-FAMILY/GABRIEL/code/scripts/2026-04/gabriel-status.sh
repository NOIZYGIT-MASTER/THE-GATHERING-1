#!/usr/bin/env bash
# ============================================================================
# GABRIEL STATUS — Full fleet status check
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE_BASE="$PROJECT_ROOT/.worktrees"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

dot_ok() { echo -e "  ${GREEN}●${NC} $*"; }
dot_warn() { echo -e "  ${YELLOW}●${NC} $*"; }
dot_fail() { echo -e "  ${RED}●${NC} $*"; }

echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  GABRIEL — EMPIRE STATUS REPORT${NC}"
echo -e "${BOLD}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""

# --- 1. Agent Definitions ---
echo -e "${CYAN}AGENT DEFINITIONS${NC}"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
if [[ -d "$AGENTS_DIR" ]]; then
    for f in "$AGENTS_DIR"/*.md; do
        [[ -f "$f" ]] && dot_ok "$(basename "$f" .md)"
    done
    AGENT_COUNT=$(ls "$AGENTS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  Total: ${AGENT_COUNT} agents defined"
else
    dot_fail "No agents directory"
fi
echo ""

# --- 2. Docker Services ---
echo -e "${CYAN}DOCKER SERVICES${NC}"
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    # Check key containers
    for SVC in noizy-gabriel-api noizy-redis noizy-postgres noizy-minio; do
        STATUS=$(docker inspect --format='{{.State.Status}}' "$SVC" 2>/dev/null || echo "not found")
        if [[ "$STATUS" == "running" ]]; then
            dot_ok "$SVC — running"
        elif [[ "$STATUS" == "not found" ]]; then
            dot_warn "$SVC — not deployed"
        else
            dot_fail "$SVC — $STATUS"
        fi
    done

    # AI Suite
    for SVC in ollama litellm n8n; do
        STATUS=$(docker inspect --format='{{.State.Status}}' "$SVC" 2>/dev/null || echo "not found")
        if [[ "$STATUS" == "running" ]]; then
            dot_ok "$SVC — running"
        else
            dot_warn "$SVC — $STATUS"
        fi
    done
else
    dot_fail "Docker not running"
fi
echo ""

# --- 3. Cloud Services ---
echo -e "${CYAN}CLOUD SERVICES${NC}"
# Heaven
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' https://heaven.rsp-5f3.workers.dev/v1/health 2>/dev/null || echo "000")
[[ "$HTTP_CODE" == "200" ]] && dot_ok "Heaven API — online" || dot_fail "Heaven API — HTTP $HTTP_CODE"

# MCP Worker
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' https://mcp.noizy.ai/health 2>/dev/null || echo "000")
[[ "$HTTP_CODE" == "200" ]] && dot_ok "MCP Worker — online" || dot_warn "MCP Worker — HTTP $HTTP_CODE"
echo ""

# --- 4. Local Services ---
echo -e "${CYAN}LOCAL SERVICES${NC}"
for PORT_SVC in "9099:Gabriel API" "4000:LiteLLM" "5678:n8n" "11434:Ollama" "9090:Prometheus" "3000:Grafana" "3001:Uptime Kuma"; do
    PORT="${PORT_SVC%%:*}"
    SVC="${PORT_SVC#*:}"
    if curl -sf -o /dev/null --connect-timeout 2 "http://localhost:${PORT}" 2>/dev/null; then
        dot_ok "${SVC} (port ${PORT})"
    else
        dot_warn "${SVC} (port ${PORT}) — not responding"
    fi
done
echo ""

# --- 5. Active Missions ---
echo -e "${CYAN}ACTIVE MISSIONS${NC}"
if [[ -d "$WORKTREE_BASE" ]]; then
    MISSION_COUNT=0
    for d in "$WORKTREE_BASE"/*/; do
        if [[ -d "$d" ]]; then
            MISSION_NAME=$(basename "$d")
            if [[ -f "$d/MISSION.json" ]]; then
                STATUS=$(python3 -c "import json; print(json.load(open('${d}MISSION.json'))['status'])" 2>/dev/null || echo "unknown")
                dot_ok "${MISSION_NAME} — ${STATUS}"
            else
                dot_ok "${MISSION_NAME}"
            fi
            ((MISSION_COUNT++))
        fi
    done
    [[ $MISSION_COUNT -eq 0 ]] && echo "  No active missions"
else
    echo "  No active missions"
fi
echo ""

# --- 6. Agent Branches ---
echo -e "${CYAN}AGENT BRANCHES${NC}"
cd "$PROJECT_ROOT"
AGENT_BRANCHES=$(git branch --list "agent/*" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$AGENT_BRANCHES" -gt 0 ]]; then
    git branch --list "agent/*" | sed 's/^/  /'
else
    echo "  No agent branches active"
fi
echo ""

# --- 7. tmux Sessions ---
echo -e "${CYAN}TMUX SESSIONS${NC}"
if command -v tmux &>/dev/null; then
    GABRIEL_SESSIONS=$(tmux list-sessions 2>/dev/null | grep "gabriel-" || true)
    if [[ -n "$GABRIEL_SESSIONS" ]]; then
        echo "$GABRIEL_SESSIONS" | sed 's/^/  /'
    else
        echo "  No Gabriel tmux sessions active"
    fi
else
    dot_warn "tmux not installed"
fi
echo ""

echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  GABRIEL STATUS COMPLETE${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${NC}"
