#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NOIZY GLOBAL GATEWAY — Unified Deployment Script
# Robert Stephen Plowman | NOIZYFISH | April 2026
#
# Two layers. One command.
#   Local:  Docker Compose → 9 agents on GOD
#   Global: Wrangler → Heaven Worker on Cloudflare Edge
#
# Usage:
#   ./deploy.sh all        Deploy everything (local + global)
#   ./deploy.sh local      Docker Compose only (GOD agents)
#   ./deploy.sh heaven     Cloudflare Worker only (Heaven)
#   ./deploy.sh migrate    Run D1 schema migrations
#   ./deploy.sh status     Check health of all systems
#   ./deploy.sh secrets    Set Cloudflare Worker secrets
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEAVEN_DIR="$SCRIPT_DIR/heaven"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()   { echo -e "${CYAN}[NOIZY]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL ]${NC} $1"; }

# ─── Preflight checks ───

check_deps() {
  local missing=()
  command -v docker >/dev/null 2>&1 || missing+=("docker")
  command -v docker-compose >/dev/null 2>&1 || command -v "docker compose" >/dev/null 2>&1 || missing+=("docker-compose")
  command -v wrangler >/dev/null 2>&1 || missing+=("wrangler (npm i -g wrangler)")
  command -v curl >/dev/null 2>&1 || missing+=("curl")

  if [ ${#missing[@]} -gt 0 ]; then
    fail "Missing dependencies: ${missing[*]}"
    exit 1
  fi
  ok "All dependencies present"
}

# ─── Local: Docker Compose on GOD ───

deploy_local() {
  log "Deploying local agent mesh on GOD..."

  if [ ! -f "$COMPOSE_FILE" ]; then
    fail "docker-compose.yml not found at $COMPOSE_FILE"
    exit 1
  fi

  # Check for .env file
  if [ ! -f "$SCRIPT_DIR/.env" ]; then
    warn "No .env file found. Creating template..."
    cat > "$SCRIPT_DIR/.env" << 'ENVEOF'
# NOIZY Gateway Environment Variables
# Fill these in before deploying

# Cloudflare Tunnel token (from Zero Trust dashboard)
CLOUDFLARE_TUNNEL_TOKEN=

# Webhook URLs for Dispatcher agent
ZAPIER_WEBHOOK_URL=
N8N_WEBHOOK_URL=
ENVEOF
    warn "Edit .env with your tokens before deploying"
    return 1
  fi

  # Pull and build
  log "Building agent containers..."
  docker compose -f "$COMPOSE_FILE" build --parallel 2>/dev/null || docker-compose -f "$COMPOSE_FILE" build

  # Start
  log "Starting agent mesh..."
  docker compose -f "$COMPOSE_FILE" up -d 2>/dev/null || docker-compose -f "$COMPOSE_FILE" up -d

  ok "Local agent mesh deployed"

  # Health check
  log "Checking agent health..."
  sleep 5
  check_local_health
}

check_local_health() {
  local agents=("gabriel:7001" "lucy:7002" "engr-keith:7003" "georgia-may:7004" "archivist:7005" "sentinel:7006" "dispatcher:7007" "scanner:7008" "deployer:7009" "gemma:7010")

  for agent_port in "${agents[@]}"; do
    IFS=':' read -r agent port <<< "$agent_port"
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
      ok "$agent (:$port) — online"
    else
      warn "$agent (:$port) — offline or starting"
    fi
  done
}

# ─── Global: Heaven Cloudflare Worker ───

deploy_heaven() {
  log "Deploying Heaven Worker to Cloudflare Edge..."

  cd "$HEAVEN_DIR"

  # Check wrangler auth
  if ! wrangler whoami > /dev/null 2>&1; then
    fail "Not authenticated with Cloudflare. Run: wrangler login"
    exit 1
  fi

  # Run migrations first
  run_migrations

  # Deploy
  log "Deploying Worker..."
  wrangler deploy

  ok "Heaven Worker deployed to Cloudflare Edge"
  cd "$SCRIPT_DIR"
}

# ─── D1 Migrations ───

run_migrations() {
  log "Running D1 schema migrations..."

  cd "$HEAVEN_DIR"

  # Apply to gabriel_db (COMMAND_LOG binding)
  if [ -f "migrations/0001_init.sql" ]; then
    log "Applying migration 0001_init to gabriel_db..."
    wrangler d1 execute gabriel_db --file=migrations/0001_init.sql --remote
    ok "Migration 0001_init applied"
  fi

  cd "$SCRIPT_DIR"
}

# ─── Set Cloudflare Secrets ───

set_secrets() {
  log "Setting Heaven Worker secrets..."
  cd "$HEAVEN_DIR"

  echo "Enter HEAVEN_AUTH_TOKEN (shared secret for Gabriel/Lucy/Discord):"
  read -rs token
  echo "$token" | wrangler secret put HEAVEN_AUTH_TOKEN
  ok "HEAVEN_AUTH_TOKEN set"

  echo "Enter DISCORD_BOT_TOKEN:"
  read -rs discord_token
  echo "$discord_token" | wrangler secret put DISCORD_BOT_TOKEN
  ok "DISCORD_BOT_TOKEN set"

  echo "Enter DISCORD_PUBLIC_KEY:"
  read -rs discord_key
  echo "$discord_key" | wrangler secret put DISCORD_PUBLIC_KEY
  ok "DISCORD_PUBLIC_KEY set"

  echo "Enter TUNNEL_ORIGIN (e.g., https://god-tunnel.noizyfish.ai):"
  read -r tunnel
  echo "$tunnel" | wrangler secret put TUNNEL_ORIGIN
  ok "TUNNEL_ORIGIN set"

  cd "$SCRIPT_DIR"
}

# ─── Status check ───

check_status() {
  log "=== NOIZY GATEWAY STATUS ==="
  echo ""

  log "Local Agent Mesh (GOD):"
  check_local_health
  echo ""

  log "Heaven Worker (Cloudflare Edge):"
  cd "$HEAVEN_DIR"
  if wrangler whoami > /dev/null 2>&1; then
    ok "Cloudflare authenticated"
    # Try to hit the health endpoint
    log "Checking Heaven health endpoint..."
    # Will work once domain is configured
  else
    warn "Not authenticated with Cloudflare"
  fi
  cd "$SCRIPT_DIR"
  echo ""

  log "Docker containers:"
  docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || warn "Docker Compose not running"
}

# ─── Main ───

main() {
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "  NOIZY GLOBAL GATEWAY — Deployment"
  echo "  Robert Stephen Plowman | NOIZYFISH"
  echo "═══════════════════════════════════════════════"
  echo ""

  check_deps

  case "${1:-help}" in
    all)
      deploy_local
      deploy_heaven
      ok "Full deployment complete — local + global"
      ;;
    local)
      deploy_local
      ;;
    heaven)
      deploy_heaven
      ;;
    migrate)
      run_migrations
      ;;
    secrets)
      set_secrets
      ;;
    status)
      check_status
      ;;
    *)
      echo "Usage: ./deploy.sh {all|local|heaven|migrate|secrets|status}"
      echo ""
      echo "  all      — Deploy everything (local agents + Heaven worker)"
      echo "  local    — Docker Compose only (9 agents on GOD)"
      echo "  heaven   — Cloudflare Worker only (Heaven edge router)"
      echo "  migrate  — Run D1 schema migrations"
      echo "  secrets  — Set Cloudflare Worker secrets"
      echo "  status   — Check health of all systems"
      ;;
  esac
}

main "$@"
