#!/usr/bin/env bash
# ============================================================================
# GABRIEL MERGE — Merge agent worktree branches back to main
# ============================================================================
# Usage: gabriel-merge.sh <mission-name> [--dry-run] [--no-cleanup]
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE_BASE="$PROJECT_ROOT/.worktrees"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${GREEN}[GABRIEL]${NC} $*"; }
warn() { echo -e "${YELLOW}[GABRIEL]${NC} $*"; }
err() { echo -e "${RED}[GABRIEL]${NC} $*" >&2; }

DRY_RUN=false
NO_CLEANUP=false

if [[ $# -lt 1 ]]; then
    echo -e "${BOLD}GABRIEL MERGE${NC} — Merge Agent Branches"
    echo ""
    echo "Usage: $0 <mission-name> [--dry-run] [--no-cleanup]"
    echo ""
    echo "Active missions:"
    if [[ -d "$WORKTREE_BASE" ]]; then
        for d in "$WORKTREE_BASE"/*/; do
            [[ -d "$d" ]] && echo "  - $(basename "$d")"
        done
    else
        echo "  (none)"
    fi
    exit 1
fi

MISSION="$1"
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true ;;
        --no-cleanup) NO_CLEANUP=true ;;
        *) err "Unknown flag: $1"; exit 1 ;;
    esac
    shift
done

cd "$PROJECT_ROOT"
CURRENT_BRANCH=$(git branch --show-current)
MISSION_DIR="$WORKTREE_BASE/${MISSION}"

if [[ ! -d "$MISSION_DIR" ]]; then
    err "Mission directory not found: ${MISSION_DIR}"
    err "Available missions:"
    for d in "$WORKTREE_BASE"/*/; do
        [[ -d "$d" ]] && err "  - $(basename "$d")"
    done
    exit 1
fi

# Read manifest
MANIFEST="$MISSION_DIR/MISSION.json"
if [[ -f "$MANIFEST" ]]; then
    log "Mission manifest found"
    cat "$MANIFEST" | python3 -m json.tool 2>/dev/null || cat "$MANIFEST"
    echo ""
fi

# Find all agent branches for this mission
AGENT_BRANCHES=($(git branch --list "agent/${MISSION}/*" | sed 's/^[ *]*//' || true))

if [[ ${#AGENT_BRANCHES[@]} -eq 0 ]]; then
    warn "No agent branches found for mission: ${MISSION}"
    warn "Expected pattern: agent/${MISSION}/*"
    exit 0
fi

log "═══════════════════════════════════════════════════════"
log "  GABRIEL MERGE — Mission: ${BOLD}${MISSION}${NC}"
log "  Target branch: ${CYAN}${CURRENT_BRANCH}${NC}"
log "  Agent branches: ${#AGENT_BRANCHES[@]}"
log "═══════════════════════════════════════════════════════"
echo ""

MERGED=0
FAILED=0
SKIPPED=0

for BRANCH in "${AGENT_BRANCHES[@]}"; do
    AGENT_NAME=$(echo "$BRANCH" | sed "s|agent/${MISSION}/||")
    log "━━━ Agent: ${BOLD}${AGENT_NAME}${NC} ━━━"

    # Check if branch has commits ahead of current
    AHEAD=$(git rev-list --count "${CURRENT_BRANCH}..${BRANCH}" 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count "${BRANCH}..${CURRENT_BRANCH}" 2>/dev/null || echo "0")

    if [[ "$AHEAD" == "0" ]]; then
        warn "  No new commits — skipping"
        ((SKIPPED++))
        continue
    fi

    log "  Commits ahead: ${AHEAD} | behind: ${BEHIND}"

    # Show diff summary
    echo -e "  ${CYAN}Changes:${NC}"
    git diff --stat "${CURRENT_BRANCH}..${BRANCH}" 2>/dev/null | sed 's/^/    /'
    echo ""

    if [[ "$DRY_RUN" == "true" ]]; then
        log "  [DRY RUN] Would merge ${BRANCH}"
        continue
    fi

    # Merge
    if git merge --no-ff -m "GABRIEL: merge ${AGENT_NAME} from mission ${MISSION}" "$BRANCH" 2>/dev/null; then
        log "  ✓ Merged successfully"
        ((MERGED++))
    else
        err "  ✗ Merge conflict! Resolve manually."
        git merge --abort 2>/dev/null || true
        ((FAILED++))
    fi
    echo ""
done

echo ""
log "═══════════════════════════════════════════════════════"
log "  MERGE RESULTS"
log "  Merged: ${MERGED} | Failed: ${FAILED} | Skipped: ${SKIPPED}"
log "═══════════════════════════════════════════════════════"

# --- Cleanup ---
if [[ "$NO_CLEANUP" == "false" && "$DRY_RUN" == "false" && "$FAILED" == "0" ]]; then
    echo ""
    log "Cleaning up worktrees and branches..."

    for BRANCH in "${AGENT_BRANCHES[@]}"; do
        AGENT_NAME=$(echo "$BRANCH" | sed "s|agent/${MISSION}/||")
        WORKTREE_PATH="$WORKTREE_BASE/${MISSION}/${AGENT_NAME}"

        if [[ -d "$WORKTREE_PATH" ]]; then
            git worktree remove "$WORKTREE_PATH" --force 2>/dev/null && \
                log "  ✓ Removed worktree: ${AGENT_NAME}" || \
                warn "  Could not remove worktree: ${AGENT_NAME}"
        fi

        git branch -d "$BRANCH" 2>/dev/null && \
            log "  ✓ Deleted branch: ${BRANCH}" || \
            warn "  Could not delete branch: ${BRANCH}"
    done

    # Remove mission directory if empty
    rmdir "$MISSION_DIR" 2>/dev/null && \
        log "  ✓ Removed mission directory" || true

    # Update manifest
    if [[ -f "$MANIFEST" ]]; then
        python3 -c "
import json
with open('$MANIFEST', 'r') as f:
    m = json.load(f)
m['status'] = 'merged'
m['merged_at'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
with open('$MANIFEST', 'w') as f:
    json.dump(m, f, indent=2)
" 2>/dev/null || true
    fi
fi

# --- Run smoke tests ---
if [[ "$DRY_RUN" == "false" && "$MERGED" -gt 0 ]]; then
    echo ""
    log "Running post-merge smoke tests..."
    if [[ -f "$PROJECT_ROOT/scripts/smoke_test.sh" ]]; then
        bash "$PROJECT_ROOT/scripts/smoke_test.sh" && \
            log "  ✓ Smoke tests passed" || \
            warn "  ✗ Smoke tests failed — review before pushing"
    else
        # Quick health check
        curl -sf https://heaven.rsp-5f3.workers.dev/v1/health >/dev/null 2>&1 && \
            log "  ✓ Heaven health: OK" || \
            warn "  ✗ Heaven health: unreachable (expected if local-only changes)"
    fi
fi

echo ""
log "Done. LUCY should log this mission to DAZEFLOW."
