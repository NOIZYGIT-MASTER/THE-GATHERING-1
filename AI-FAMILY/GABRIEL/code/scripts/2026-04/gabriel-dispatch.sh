#!/usr/bin/env bash
# ============================================================================
# GABRIEL DISPATCH — Parallel Agent Launcher via tmux + Git Worktrees
# ============================================================================
# Usage: gabriel-dispatch.sh <mission-name> <agent1> [agent2] [agent3] ...
# Example: gabriel-dispatch.sh deploy-v2 engr-keith consent-auditor test-runner
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE_BASE="$PROJECT_ROOT/.worktrees"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${GREEN}[GABRIEL]${NC} $*"; }
warn() { echo -e "${YELLOW}[GABRIEL]${NC} $*"; }
err() { echo -e "${RED}[GABRIEL]${NC} $*" >&2; }

# --- Validate args ---
if [[ $# -lt 2 ]]; then
    echo -e "${BOLD}GABRIEL DISPATCH${NC} — Parallel Agent Launcher"
    echo ""
    echo "Usage: $0 <mission-name> <agent1> [agent2] [agent3] ..."
    echo ""
    echo "Available agents:"
    if [[ -d "$AGENTS_DIR" ]]; then
        for f in "$AGENTS_DIR"/*.md; do
            [[ -f "$f" ]] && echo "  - $(basename "$f" .md)"
        done
    else
        echo "  (no agents defined yet — run setup first)"
    fi
    echo ""
    echo "Mission templates:"
    echo "  deploy-<service>   — engr-keith consent-auditor test-runner cb01"
    echo "  feature-<name>     — engr-keith shirley dream test-runner"
    echo "  audit-<scope>      — consent-auditor engr-keith test-runner"
    echo "  vision-<topic>     — dream engr-keith"
    echo ""
    echo "Examples:"
    echo "  $0 deploy-heaven engr-keith consent-auditor test-runner cb01"
    echo "  $0 feature-voice-dna dream engr-keith shirley"
    echo "  $0 audit-consent consent-auditor engr-keith"
    exit 1
fi

MISSION="$1"
shift
AGENTS=("$@")
SESSION_NAME="gabriel-${MISSION}-${TIMESTAMP}"

# --- Preflight checks ---
if ! command -v tmux &>/dev/null; then
    err "tmux not found. Install: brew install tmux"
    exit 1
fi

if ! command -v git &>/dev/null; then
    err "git not found."
    exit 1
fi

# Verify we're in a git repo
cd "$PROJECT_ROOT"
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    err "Not a git repository: $PROJECT_ROOT"
    exit 1
fi

# Get current branch
MAIN_BRANCH=$(git branch --show-current)
log "Mission: ${BOLD}${MISSION}${NC}"
log "Base branch: ${CYAN}${MAIN_BRANCH}${NC}"
log "Agents: ${CYAN}${AGENTS[*]}${NC}"
log "Session: ${CYAN}${SESSION_NAME}${NC}"
echo ""

# --- Create worktree base ---
mkdir -p "$WORKTREE_BASE"

# --- Create tmux session ---
tmux new-session -d -s "$SESSION_NAME" -n "gabriel-cmd"

# Send mission header to command window
tmux send-keys -t "${SESSION_NAME}:gabriel-cmd" "echo '══════════════════════════════════════════════════════════════'" Enter
tmux send-keys -t "${SESSION_NAME}:gabriel-cmd" "echo '  GABRIEL DISPATCH — Mission: ${MISSION}'" Enter
tmux send-keys -t "${SESSION_NAME}:gabriel-cmd" "echo '  Timestamp: ${TIMESTAMP}'" Enter
tmux send-keys -t "${SESSION_NAME}:gabriel-cmd" "echo '  Agents: ${AGENTS[*]}'" Enter
tmux send-keys -t "${SESSION_NAME}:gabriel-cmd" "echo '══════════════════════════════════════════════════════════════'" Enter

# --- Dispatch each agent ---
for AGENT in "${AGENTS[@]}"; do
    AGENT_DEF="$AGENTS_DIR/${AGENT}.md"
    WORKTREE_PATH="$WORKTREE_BASE/${MISSION}/${AGENT}"
    BRANCH_NAME="agent/${MISSION}/${AGENT}"

    log "Dispatching ${BOLD}${AGENT}${NC}..."

    # Check agent definition exists
    if [[ ! -f "$AGENT_DEF" ]]; then
        warn "Agent definition not found: ${AGENT_DEF} — creating window anyway"
    fi

    # Create worktree + branch
    if [[ -d "$WORKTREE_PATH" ]]; then
        warn "Worktree exists: ${WORKTREE_PATH} — reusing"
    else
        git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$MAIN_BRANCH" 2>/dev/null || {
            # Branch may already exist
            git worktree add "$WORKTREE_PATH" "$BRANCH_NAME" 2>/dev/null || {
                warn "Could not create worktree for ${AGENT} — using main tree"
                WORKTREE_PATH="$PROJECT_ROOT"
            }
        }
    fi

    # Create tmux window for this agent
    tmux new-window -t "$SESSION_NAME" -n "$AGENT"
    tmux send-keys -t "${SESSION_NAME}:${AGENT}" "cd '${WORKTREE_PATH}'" Enter
    tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
    tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '  Agent: ${AGENT} | Mission: ${MISSION}'" Enter
    tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '  Branch: ${BRANCH_NAME}'" Enter
    tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '  Worktree: ${WORKTREE_PATH}'" Enter
    if [[ -f "$AGENT_DEF" ]]; then
        tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '  Definition: ${AGENT_DEF}'" Enter
        tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
        tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo ''" Enter
        tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo 'Agent brief:'" Enter
        tmux send-keys -t "${SESSION_NAME}:${AGENT}" "head -20 '${AGENT_DEF}'" Enter
    else
        tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '  Definition: (not found)'" Enter
        tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
    fi
    tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo ''" Enter
    tmux send-keys -t "${SESSION_NAME}:${AGENT}" "echo 'Ready. Awaiting orders.'" Enter

    log "  ✓ ${AGENT} dispatched → ${CYAN}${BRANCH_NAME}${NC}"
done

# --- Write mission manifest ---
MANIFEST_FILE="$WORKTREE_BASE/${MISSION}/MISSION.json"
mkdir -p "$(dirname "$MANIFEST_FILE")"
cat > "$MANIFEST_FILE" << MANIFEST
{
  "mission": "${MISSION}",
  "session": "${SESSION_NAME}",
  "timestamp": "${TIMESTAMP}",
  "base_branch": "${MAIN_BRANCH}",
  "agents": [$(printf '"%s",' "${AGENTS[@]}" | sed 's/,$//')],
  "status": "dispatched",
  "worktree_base": "${WORKTREE_BASE}/${MISSION}"
}
MANIFEST

echo ""
log "═══════════════════════════════════════════════════════"
log "  DISPATCH COMPLETE"
log "═══════════════════════════════════════════════════════"
log ""
log "  Attach:  tmux attach -t ${SESSION_NAME}"
log "  Switch:  Ctrl+b n (next) / Ctrl+b p (prev)"
log "  List:    tmux list-windows -t ${SESSION_NAME}"
log "  Merge:   scripts/gabriel-merge.sh ${MISSION}"
log ""
log "  Manifest: ${MANIFEST_FILE}"
log "═══════════════════════════════════════════════════════"
