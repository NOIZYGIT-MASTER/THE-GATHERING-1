#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  noizy — one operator console for the NOIZY Empire
#  Consolidates the loose scripts/tools into a single command surface.
#
#  Install (optional):  ln -sf "$PWD/noizy.sh" /usr/local/bin/noizy
#  Usage:               bash noizy.sh <command> [args]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEAVEN="https://heaven.rsp-5f3.workers.dev"

c_g="\033[32m"; c_r="\033[31m"; c_y="\033[33m"; c_d="\033[2m"; c_0="\033[0m"
ok(){ printf "  ${c_g}✓${c_0} %s\n" "$*"; }
no(){ printf "  ${c_r}✗${c_0} %s\n" "$*"; }
wn(){ printf "  ${c_y}!${c_0} %s\n" "$*"; }

port_up(){ nc -z -G1 127.0.0.1 "$1" >/dev/null 2>&1; }

cmd_status(){
  echo "── NOIZY EMPIRE · local status ──"
  # Heaven public liveness
  if curl -fsS --max-time 8 "$HEAVEN/" >/dev/null 2>&1; then
    ok "Heaven worker: alive (public root 200)"
    if curl -fsS --max-time 8 "$HEAVEN/health" >/dev/null 2>&1; then
      ok "Heaven /health: authenticated"
    else
      wn "Heaven /health: 401 — swarm locked out (see HEAVEN_RECOVERY.md)"
    fi
  else
    no "Heaven worker: unreachable"
  fi
  # Local services (name:port)
  for svc in "ollama:11434" "gabriel-daemon:9777" "voice-service:9799" \
             "noizyarmy-orchestrator:9333" "noizyarmy-dashboard:9334" \
             "dreamchamber-ui:7777" "n8n:5678"; do
    name="${svc%%:*}"; p="${svc##*:}"
    if port_up "$p"; then ok "$name (:$p) up"; else no "$name (:$p) down"; fi
  done
  # Cloudflare token presence
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then ok "CLOUDFLARE_API_TOKEN set"
  else no "CLOUDFLARE_API_TOKEN NOT set — Heaven recovery blocked"; fi
}

cmd_heaven(){
  echo "── Heaven probe ──"
  echo "public root:"; curl -fsS --max-time 8 "$HEAVEN/" || echo "(unreachable)"
  echo; echo "protected routes (401 = need credential, worker still alive):"
  for r in /health /api/v1 /gabriel; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$HEAVEN$r" || echo 000)"
    printf "  %-10s → %s\n" "$r" "$code"
  done
}

cmd_checkpoint(){ bash "$HERE/safe-checkpoint.sh" "${1:-}"; }
cmd_n8n(){ bash "$HERE/start-n8n.sh"; }
cmd_route(){ python3 "$HERE/noizy_router.py" "$@"; }

cmd_dns(){
  dom="${1:-noizyfish.com}"
  echo "── DNS health · $dom ──"
  mx="$(dig +short MX "$dom" | head -1)";              [ -n "$mx" ]  && ok "MX:    $mx"   || no "MX:    (none)"
  spf="$(dig +short TXT "$dom" | grep -i 'v=spf1' || true)"; [ -n "$spf" ] && ok "SPF:   $spf" || no "SPF:   (none)"
  dm="$(dig +short TXT "_dmarc.$dom" | grep -i 'v=DMARC1' || true)"; [ -n "$dm" ] && ok "DMARC: $dm" || no "DMARC: (none)"
  dk="$(dig +short CNAME "selector1._domainkey.$dom" || true)"; [ -n "$dk" ] && ok "DKIM:  $dk" || wn "DKIM:  selector1 not resolving yet"
}

cmd_help(){
  cat <<EOF
noizy — NOIZY Empire operator console

  noizy status            Local + Heaven health at a glance
  noizy heaven            Detailed Heaven endpoint probe (public vs 401 routes)
  noizy checkpoint [repo] Secret-scanned git checkpoint (default: ~/NOIZYANTHROPIC)
  noizy n8n               Bring the n8n automation spine up on :5678
  noizy route "<task>"    Tiering decision (add --run to run on local Ollama)
  noizy dns [domain]      SPF/DKIM/DMARC/MX check (default: noizyfish.com)
  noizy help              This message

Docs: EMPIRE_UPGRADE.md · HEAVEN_RECOVERY.md · NOIZYFISH_HARDENING.md · AGENT_OPS.md
EOF
}

case "${1:-help}" in
  status) cmd_status ;;
  heaven) cmd_heaven ;;
  checkpoint) shift; cmd_checkpoint "${1:-}" ;;
  n8n) cmd_n8n ;;
  route) shift; cmd_route "$@" ;;
  dns) shift; cmd_dns "${1:-noizyfish.com}" ;;
  help|--help|-h|*) cmd_help ;;
esac
