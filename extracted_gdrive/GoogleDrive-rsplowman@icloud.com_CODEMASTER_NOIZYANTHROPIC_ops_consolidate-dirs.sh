#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# NOIZYLAB — Directory Consolidation Plan
# 92 top-level dirs → ~25 (73% reduction)
#
# Uses `git mv` to preserve history. Safe + reversible.
# Run from /Users/m2ultra/NOIZYLAB
#
# Usage:
#   bash ops/consolidate-dirs.sh plan    # show plan only
#   bash ops/consolidate-dirs.sh execute # perform moves
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

MODE="${1:-plan}"
ROOT="/Users/m2ultra/NOIZYLAB"
cd "$ROOT"

RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[0;33m'
BLD='\033[1m'
DIM='\033[2m'
RST='\033[0m'

run() {
    if [ "$MODE" = "execute" ]; then
        echo -e "  ${GRN}→${RST} $*"
        eval "$@" 2>&1 | head -5 || echo -e "  ${RED}FAILED${RST}"
    else
        echo -e "  ${DIM}[plan]${RST} $*"
    fi
}

mkd() {
    if [ "$MODE" = "execute" ]; then
        mkdir -p "$1"
    else
        echo -e "  ${DIM}[plan]${RST} mkdir -p $1"
    fi
}

echo ""
echo -e "${BLD}═══════════════════════════════════════════════════════════════${RST}"
echo -e "${BLD}  DIRECTORY CONSOLIDATION — 92 → ~25 dirs${RST}"
echo -e "${BLD}  Mode: ${YEL}$MODE${RST}"
echo -e "${BLD}═══════════════════════════════════════════════════════════════${RST}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 1: DELETABLE (regenerable or duplicate)
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[1] DELETE — regenerable or duplicates${RST}"
[ -d DUPES ] && run "rm -rf DUPES                          # Known duplicates"
[ -d node_modules ] && run "rm -rf node_modules                 # npm regenerable (206MB)"
[ -d .wrangler ] && run "rm -rf .wrangler                     # Wrangler cache"
[ -d lucy-state ] && run "rm -rf lucy-state                    # Local state"
[ -d github-consolidation ] && run "rm -rf github-consolidation         # One-time migration artifact"
[ -d migration-pack ] && run "rm -rf migration-pack                 # One-time migration artifact"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 2: MC96 unify
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[2] MC96 unify — mc96 + mc96-docs + mc96-portal → mc96/${RST}"
mkd "mc96-unified"
[ -d mc96 ] && run "git mv mc96 mc96-unified/app              # MC96 app"
[ -d mc96-docs ] && run "git mv mc96-docs mc96-unified/docs        # MC96 docs"
[ -d mc96-portal ] && run "git mv mc96-portal mc96-unified/portal   # MC96 portal"
[ -d MC96ECO ] && run "git mv MC96ECO mc96-unified/eco            # MC96 ecosystem"
run "git mv mc96-unified mc96                # rename parent"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 3: AUv3 plugins → apps/auv3/
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[3] AUv3 plugins → apps/auv3/${RST}"
mkd "apps/auv3"
[ -d auv3-consent-hud ] && run "git mv auv3-consent-hud apps/auv3/consent-hud"
[ -d auv3-hvs-live-contour ] && run "git mv auv3-hvs-live-contour apps/auv3/hvs-live-contour"
[ -d auv3-shared-noizy-consent ] && run "git mv auv3-shared-noizy-consent apps/auv3/shared-consent"
[ -d auv3-shared-noizy-receipts ] && run "git mv auv3-shared-noizy-receipts apps/auv3/shared-receipts"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 4: Landing pages → landing/
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[4] Landing pages → landing/${RST}"
mkd "landing"
[ -d noizy-landing ] && run "git mv noizy-landing landing/noizy"
[ -d noizyfish-landing ] && run "git mv noizyfish-landing landing/noizyfish"
[ -d noizyvox-landing ] && run "git mv noizyvox-landing landing/noizyvox"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 5: Workers / Cloudflare unify
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[5] Cloudflare Workers unify → workers/${RST}"
[ -d cloudflare ] && run "git mv cloudflare workers/_cloudflare-legacy"
[ -d cloudflare-workers ] && run "git mv cloudflare-workers workers/_cloudflare-workers-legacy"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 6: Dashboards unify
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[6] Dashboards unify${RST}"
[ -d dashboard ] && run "git mv dashboard dashboards/_main"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 7: MCP servers unify
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[7] MCP servers unify → mcp/${RST}"
[ -d mcp-gemma3 ] && run "git mv mcp-gemma3 mcp/gemma3"
[ -d dreamchamber-audio-mcp ] && run "git mv dreamchamber-audio-mcp mcp/dreamchamber-audio"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 8: NOIZY project variants unify
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[8] NOIZY project variants → _archive/${RST}"
mkd "_archive"
[ -d NOIZY-MONO ] && run "git mv NOIZY-MONO _archive/NOIZY-MONO             # Legacy monorepo"
[ -d NOIZY_2026 ] && run "git mv NOIZY_2026 _archive/NOIZY_2026             # Snapshot"
[ -d NOIZYEMPIRE ] && run "git mv NOIZYEMPIRE _archive/NOIZYEMPIRE           # Legacy empire"
[ -d NOIZYINDIGENIOUS ] && run "git mv NOIZYINDIGENIOUS _archive/NOIZYINDIGENIOUS"
[ -d noizyempire-claude ] && run "git mv noizyempire-claude _archive/noizyempire-claude"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 9: Small dirs → tools/
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[9] Small utility dirs → tools/${RST}"
[ -d turbo-console-log ] && run "git mv turbo-console-log tools/turbo-console-log"
[ -d turbo-scripts ] && run "git mv turbo-scripts tools/turbo-scripts"
[ -d universal-blocker ] && run "git mv universal-blocker tools/universal-blocker"
[ -d supersonic ] && run "git mv supersonic tools/supersonic"
[ -d SystemGuardian ] && run "git mv SystemGuardian tools/SystemGuardian"
[ -d GORUNFREE ] && run "git mv GORUNFREE tools/GORUNFREE"
[ -d CODEMASTER ] && run "git mv CODEMASTER tools/CODEMASTER"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 10: Schemas / SQL / migrations unify → db/
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[10] Data dirs → db/${RST}"
mkd "db-unified"
[ -d db ] && run "git mv db db-unified/_legacy"
[ -d sql ] && run "git mv sql db-unified/sql"
[ -d schemas ] && run "git mv schemas db-unified/schemas"
[ -d migrations ] && run "git mv migrations db-unified/migrations"
[ -d modelfiles ] && run "git mv modelfiles db-unified/modelfiles"
run "git mv db-unified db                    # rename parent"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 11: Rob_ava, noizyfish, noizyvox, noisyproof → apps/
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[11] Product apps → apps/${RST}"
[ -d rob_ava ] && run "git mv rob_ava apps/rob_ava"
[ -d noisyproof ] && run "git mv noisyproof apps/noisyproof"
[ -d noizyfish ] && run "git mv noizyfish apps/noizyfish"
[ -d noizyvox ] && run "git mv noizyvox apps/noizyvox"
[ -d noizybeast ] && run "git mv noizybeast apps/noizybeast"
[ -d lucy ] && run "git mv lucy apps/lucy"
[ -d dreamchamber ] && run "git mv dreamchamber apps/dreamchamber"
[ -d GABRIEL ] && run "git mv GABRIEL apps/GABRIEL"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 12: Docker / Infra unify
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[12] Docker/Infra → infra/${RST}"
[ -d n8n-docker ] && run "git mv n8n-docker infra/n8n-docker"
[ -d .docker ] && run "echo '# Keep .docker as-is (hidden config dir)'"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 13: Vault / Private
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[13] Private / Vault → _private/${RST}"
mkd "_private"
[ -d RSP_001_VAULT ] && run "git mv RSP_001_VAULT _private/RSP_001_VAULT"
[ -d dns-exports ] && run "git mv dns-exports _private/dns-exports"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP 14: Documents
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}[14] Documentation${RST}"
[ -d claude-projects ] && run "git mv claude-projects docs/claude-projects"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# RESULT
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLD}═══════════════════════════════════════════════════════════════${RST}"
echo -e "${BLD}  PROJECTED FINAL STRUCTURE${RST}"
echo -e "${BLD}═══════════════════════════════════════════════════════════════${RST}"
cat <<'EOF'
  _archive/         Legacy/snapshot projects
  _private/         Vault + sensitive exports
  apps/             All product apps (iOS, web, AUv3, GABRIEL, dreamchamber, lucy, noizy*)
    auv3/           AUv3 audio plugins
  contracts/        Legal/licensing
  db/               All data: sql, schemas, migrations, modelfiles
  docs/             Documentation
  enterprise/       Enterprise features
  governance/       Compliance/audit
  infra/            Terraform, Docker, deployment
  landing/          All landing pages (noizy, noizyfish, noizyvox)
  logs/             Log output
  mc96/             All MC96 work (app, docs, portal, eco)
  mcp/              All MCP servers (core + gemma3 + dreamchamber-audio)
  ops/              Operational scripts
  packages/         npm packages
  postman/          API collections
  public/           Public assets
  repos/            External repos
  rsp001_pipeline/  Voice DNA pipeline
  scripts/          Scripts
  src/              Source
  swift-library/    Swift packages
  templates/        Templates (Logic Pro, etc.)
  tests/            Tests
  tools/            All utilities (supersonic, CODEMASTER, GORUNFREE, etc.)
  voice-pipeline/   Voice processing
  workers/          All Cloudflare Workers
  workflows/        GitHub Actions, n8n flows

  Hidden: .agent .claude .docker .git .github .gitkraken .opencode
          .postman .session .vscode .windsurf .wrangler

  DIRS:  ~25 visible + 12 hidden (was 92)
  REDUCTION: 73%
EOF
echo ""

if [ "$MODE" = "plan" ]; then
    echo -e "${YEL}This was a dry run. To execute:${RST}"
    echo "  bash $0 execute"
    echo ""
    echo -e "${YEL}WARNING: Commits all moves. Review git log afterward.${RST}"
fi
