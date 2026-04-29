#!/bin/zsh
# ============================================================================
# NOIZY.AI — Enterprise Git Cutover Script v2.0
# ============================================================================
#
# Purpose:   Migrate all NOIZYFISH repos from GitHub to git.noizy.ai
# Author:    Robert Stephen Plowman
# Date:      March 23, 2026
# Doctrine:  NOIZY-AI-Enterprise-Git-Doctrine.md v2.0
#
# Usage:     chmod +x git-align.sh && ./git-align.sh [--dry-run] [--verify-only]
#
# Flags:
#   --dry-run       Show what would happen without making changes
#   --verify-only   Only run verification checks
#
# Requirements:
#   - zsh (default macOS shell)
#   - git installed
#   - SSH key configured for git.noizy.ai
#   - Repos cloned under BASE_DIR
#
# ============================================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────

BASE_DIR="${NOIZY_BASE_DIR:-$HOME/NOIZYFISH}"
ORG="NOIZYFISH"
ENTERPRISE_HOST="git@git.noizy.ai:${ORG}"
ENTERPRISE_HTTPS="https://git.noizy.ai/${ORG}"

REPOS=(
  HEAVEN
  NOIZYLAB
  GABRIEL
  NOIZYVOX
  CONDUCTOR
  FISHYBOOKS
  CODEMASTER
  NOIZYKIDZ
)

# ── Color output ───────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

ok()    { echo "${GREEN}[OK]${NC}    $1" }
warn()  { echo "${YELLOW}[WARN]${NC}  $1" }
fail()  { echo "${RED}[FAIL]${NC}  $1" }
info()  { echo "${BLUE}[INFO]${NC}  $1" }
step()  { echo "\n${BOLD}${PURPLE}── $1 ──${NC}" }

# ── Parse flags ────────────────────────────────────────────────────────────

DRY_RUN=false
VERIFY_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)      DRY_RUN=true ;;
    --verify-only)  VERIFY_ONLY=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--verify-only]"
      echo ""
      echo "  --dry-run       Show what would happen without making changes"
      echo "  --verify-only   Only run verification checks"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg"
      exit 1
      ;;
  esac
done

# ── Header ─────────────────────────────────────────────────────────────────

echo ""
echo "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${BOLD}${CYAN}║         NOIZY.AI — Enterprise Git Cutover v2.0              ║${NC}"
echo "${BOLD}${CYAN}║         noizy.ai is the authority.                          ║${NC}"
echo "${BOLD}${CYAN}║         git.noizy.ai is the source of truth.               ║${NC}"
echo "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if $DRY_RUN; then
  warn "DRY RUN mode — no changes will be made"
  echo ""
fi

if $VERIFY_ONLY; then
  info "VERIFY ONLY mode — checking current state"
  echo ""
fi

# ── Pre-flight checks ─────────────────────────────────────────────────────

step "Pre-flight Checks"

# Check git is installed
if command -v git &>/dev/null; then
  ok "git $(git --version | cut -d' ' -f3) installed"
else
  fail "git not found — install git first"
  exit 1
fi

# Check base directory exists
if [ -d "$BASE_DIR" ]; then
  ok "Base directory exists: $BASE_DIR"
else
  fail "Base directory not found: $BASE_DIR"
  echo "  Set NOIZY_BASE_DIR env var or create $BASE_DIR"
  exit 1
fi

# Check SSH connectivity to enterprise host (non-blocking)
info "Testing SSH connectivity to git.noizy.ai..."
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -T git@git.noizy.ai 2>&1 | grep -qi "welcome\|success\|authenticated\|hi "; then
  ok "SSH connection to git.noizy.ai verified"
else
  warn "SSH connection to git.noizy.ai could not be verified"
  warn "This is expected if git.noizy.ai is not yet provisioned (Phase 2)"
  if ! $DRY_RUN && ! $VERIFY_ONLY; then
    echo ""
    echo "  Continue anyway? (y/N) "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
      info "Aborted. Stand up git.noizy.ai first (Phase 2)."
      exit 0
    fi
  fi
fi

# ── Count repos ────────────────────────────────────────────────────────────

found=0
missing=0

for repo in "${REPOS[@]}"; do
  if [ -d "$BASE_DIR/$repo/.git" ]; then
    ((found++))
  else
    ((missing++))
  fi
done

info "Found $found/${#REPOS[@]} repos in $BASE_DIR ($missing missing)"

# ── Verification function ─────────────────────────────────────────────────

verify_repo() {
  local repo_dir="$1"
  local repo_name="$(basename "$repo_dir")"
  local status="clean"

  # Check enterprise remote exists
  if git -C "$repo_dir" remote get-url enterprise &>/dev/null; then
    local url=$(git -C "$repo_dir" remote get-url enterprise)
    if [[ "$url" == *"git.noizy.ai"* ]]; then
      ok "$repo_name: enterprise remote → $url"
    else
      fail "$repo_name: enterprise remote points to wrong host: $url"
      status="broken"
    fi
  else
    warn "$repo_name: no enterprise remote configured"
    status="missing"
  fi

  # Check pushDefault
  local push_default=$(git -C "$repo_dir" config remote.pushDefault 2>/dev/null || echo "")
  if [ "$push_default" = "enterprise" ]; then
    ok "$repo_name: pushDefault = enterprise"
  elif [ -n "$push_default" ]; then
    warn "$repo_name: pushDefault = $push_default (should be enterprise)"
    status="misconfigured"
  else
    warn "$repo_name: pushDefault not set"
    status="unconfigured"
  fi

  # Check if github remote exists (expected during migration)
  if git -C "$repo_dir" remote get-url github &>/dev/null; then
    local gh_url=$(git -C "$repo_dir" remote get-url github)
    info "$repo_name: github backup remote → $gh_url"
  fi

  # Check default branch
  local default_branch=$(git -C "$repo_dir" symbolic-ref --short HEAD 2>/dev/null || echo "unknown")
  if [ "$default_branch" = "main" ]; then
    ok "$repo_name: default branch = main"
  else
    warn "$repo_name: current branch = $default_branch (expected main)"
  fi

  echo "$status"
}

# ── Verify Only mode ──────────────────────────────────────────────────────

if $VERIFY_ONLY; then
  step "Verification Report"

  aligned=0
  not_aligned=0

  for repo in "${REPOS[@]}"; do
    repo_dir="$BASE_DIR/$repo"
    if [ -d "$repo_dir/.git" ]; then
      echo ""
      info "── $repo ──"
      result=$(verify_repo "$repo_dir")
      if [ "$result" = "clean" ]; then
        ((aligned++))
      else
        ((not_aligned++))
      fi
    else
      warn "$repo: not found at $repo_dir"
      ((not_aligned++))
    fi
  done

  step "Summary"
  echo ""
  ok "Aligned: $aligned/${#REPOS[@]}"
  if [ $not_aligned -gt 0 ]; then
    warn "Not aligned: $not_aligned/${#REPOS[@]}"
  fi
  echo ""
  exit 0
fi

# ── Main cutover loop ─────────────────────────────────────────────────────

step "Phase 3+4: Remote Configuration & Safe Push Defaults"

success=0
skipped=0
errors=0

for repo in "${REPOS[@]}"; do
  repo_dir="$BASE_DIR/$repo"
  echo ""
  info "── $repo ──"

  # Check repo exists
  if [ ! -d "$repo_dir/.git" ]; then
    warn "$repo: not found at $repo_dir — skipping"
    ((skipped++))
    continue
  fi

  cd "$repo_dir"

  # Step 1: Rename origin to github (if origin exists and isn't already enterprise)
  if git remote get-url origin &>/dev/null; then
    current_origin="$(git remote get-url origin)"
    if [[ "$current_origin" != *"git.noizy.ai"* ]]; then
      if $DRY_RUN; then
        info "Would rename origin → github (currently: $current_origin)"
      else
        git remote rename origin github 2>/dev/null || true
        ok "Renamed origin → github ($current_origin)"
      fi
    else
      info "origin already points to git.noizy.ai — keeping as-is"
    fi
  fi

  # Step 2: Add or update enterprise remote
  enterprise_url="${ENTERPRISE_HOST}/${repo}.git"

  if git remote get-url enterprise &>/dev/null; then
    if $DRY_RUN; then
      info "Would update enterprise remote → $enterprise_url"
    else
      git remote set-url enterprise "$enterprise_url"
      ok "Updated enterprise remote → $enterprise_url"
    fi
  else
    if $DRY_RUN; then
      info "Would add enterprise remote → $enterprise_url"
    else
      git remote add enterprise "$enterprise_url"
      ok "Added enterprise remote → $enterprise_url"
    fi
  fi

  # Step 3: Set pushDefault
  if $DRY_RUN; then
    info "Would set remote.pushDefault = enterprise"
  else
    git config remote.pushDefault enterprise
    ok "Set remote.pushDefault = enterprise"
  fi

  # Step 4: Show final remote state
  if ! $DRY_RUN; then
    echo "  Remotes:"
    git remote -v | sed 's/^/    /'
  fi

  ((success++))
done

# ── Mirror push (if not dry run) ──────────────────────────────────────────

if ! $DRY_RUN; then
  step "Phase 3: Mirror Push"
  echo ""
  echo "  Ready to push all branches and tags to enterprise?"
  echo "  This is safe — it only adds commits, never rewrites."
  echo ""
  echo "  Push now? (y/N) "
  read -r response

  if [[ "$response" =~ ^[Yy]$ ]]; then
    for repo in "${REPOS[@]}"; do
      repo_dir="$BASE_DIR/$repo"
      if [ -d "$repo_dir/.git" ] && git -C "$repo_dir" remote get-url enterprise &>/dev/null; then
        echo ""
        info "Pushing $repo..."
        cd "$repo_dir"
        if git push enterprise --all 2>&1; then
          ok "$repo: branches pushed"
        else
          fail "$repo: branch push failed"
        fi
        if git push enterprise --tags 2>&1; then
          ok "$repo: tags pushed"
        else
          warn "$repo: tag push failed (may have no tags)"
        fi
      fi
    done
  else
    info "Skipped mirror push. Run manually when ready:"
    echo "  git push enterprise --all && git push enterprise --tags"
  fi
fi

# ── Global defaults ───────────────────────────────────────────────────────

step "Safe Global Defaults"

if $DRY_RUN; then
  info "Would set push.default = current"
  info "Would set fetch.prune = true"
  info "Would set init.defaultBranch = main"
else
  git config --global push.default current
  ok "push.default = current"

  git config --global fetch.prune true
  ok "fetch.prune = true"

  git config --global init.defaultBranch main
  ok "init.defaultBranch = main"
fi

# ── Final report ──────────────────────────────────────────────────────────

step "Cutover Report"
echo ""
ok "Repos configured: $success"
if [ $skipped -gt 0 ]; then
  warn "Repos skipped: $skipped"
fi
if [ $errors -gt 0 ]; then
  fail "Repos with errors: $errors"
fi
echo ""

if $DRY_RUN; then
  info "This was a dry run. Re-run without --dry-run to apply changes."
fi

echo "${BOLD}${CYAN}Doctrine: noizy.ai is the authority. git.noizy.ai is the source of truth.${NC}"
echo "${BOLD}${CYAN}Push enterprise-first, migrate in phases, retire GitHub safely.${NC}"
echo ""
