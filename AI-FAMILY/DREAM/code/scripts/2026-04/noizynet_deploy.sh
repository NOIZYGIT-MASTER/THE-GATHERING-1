#!/bin/bash
# ============================================================
# NOIZYNET — GOD-SIDE CLI + DEPLOY
# ============================================================
# Installs onto GOD via SSH from Micky-P.
# Usage: ./noizynet_deploy.sh [--dry-run]
#
# What this does:
#   1. Deploys noizynet_daemon.js to GOD
#   2. Runs NOIZYNET preflight (network + port checks)
#   3. Starts NOIZYNET daemon on GOD :9699
#   4. Installs 'noizynet' CLI command on GOD
#   5. Prints Logic Pro manual wiring steps (what cannot be scripted)
#   6. Verifies signal chain health via /health endpoint
#
# Signal chain: Neumann → Apollo → Micky-P → AU Net :97100
#               → GOD Logic Pro X → NOIZY Claude Session 1
#               → iPad Logic Remote
# ============================================================

set -euo pipefail

GOD_USER="rsp"
GOD_IP="10.90.90.10"
MICKYP_IP="10.90.90.40"
AUNET_PORT=97100
NOIZYNET_PORT=9699
KEITH_PORT=7006
DAEMON_SRC="$(dirname "$0")/noizynet_daemon.js"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT="$HOME/Desktop/noizynet_deploy_${TIMESTAMP}.txt"
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

hr()  { echo "============================================" | tee -a "$REPORT"; }
log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$REPORT"; }
ok()  { echo "  ✓ $1" | tee -a "$REPORT"; }
fail(){ echo "  ✗ $1" | tee -a "$REPORT"; }

# ── 1. PREFLIGHT ─────────────────────────────────────────────
hr; log "NOIZYNET PREFLIGHT"; hr

log "GOD reachable?"
if ping -c 1 -W 2 "$GOD_IP" >/dev/null 2>&1; then
    ok "GOD ($GOD_IP) responds to ICMP"
else
    fail "GOD unreachable — check network"
    exit 1
fi

log "SSH to GOD?"
if ssh -o ConnectTimeout=4 -o BatchMode=yes "${GOD_USER}@${GOD_IP}" "echo ok" >/dev/null 2>&1; then
    ok "SSH to GOD works"
else
    fail "SSH to GOD failed — check keys"
    exit 1
fi

log "ENGR_KEITH on GOD :${KEITH_PORT}?"
if ssh "${GOD_USER}@${GOD_IP}" "curl -sf http://localhost:${KEITH_PORT}/ping >/dev/null 2>&1"; then
    ok "ENGR_KEITH online"
else
    fail "ENGR_KEITH not responding — run: ./noizy_master_build.sh keith"
fi

log "Node.js on GOD?"
NODE_VER=$(ssh "${GOD_USER}@${GOD_IP}" "node --version 2>/dev/null || echo MISSING")
if [[ "$NODE_VER" == "MISSING" ]]; then
    fail "Node.js missing on GOD — install via: brew install node"
    exit 1
else
    ok "Node.js ${NODE_VER}"
fi

# ── 2. AUNET PORT CHECK (Micky-P self-check) ─────────────────
hr; log "AU NET PORT CHECK"; hr

log "AU Net Send port :${AUNET_PORT} listening on this machine?"
if lsof -i ":${AUNET_PORT}" >/dev/null 2>&1; then
    ok "Port ${AUNET_PORT} is active — AU Net Send is running in Logic"
else
    fail "Port ${AUNET_PORT} not open — Logic AU Net Send not yet active"
    log "  → Configure AU Net Send in Logic Pro (see wiring steps below)"
fi

# ── 3. DEPLOY DAEMON ─────────────────────────────────────────
hr; log "DEPLOY NOIZYNET DAEMON → GOD"; hr

if [ ! -f "$DAEMON_SRC" ]; then
    fail "Daemon source not found: $DAEMON_SRC"
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
    log "[DRY] Would scp $DAEMON_SRC → ${GOD_USER}@${GOD_IP}:~/Desktop/noizynet_daemon.js"
else
    scp "$DAEMON_SRC" "${GOD_USER}@${GOD_IP}:~/Desktop/noizynet_daemon.js"
    ok "noizynet_daemon.js deployed to GOD"
fi

# ── 4. INSTALL CLI ON GOD ────────────────────────────────────
hr; log "INSTALL noizynet CLI ON GOD"; hr

if [ "$DRY_RUN" = true ]; then
    log "[DRY] Would install noizynet CLI on GOD"
else
ssh "${GOD_USER}@${GOD_IP}" bash << 'INSTALL_CLI'
cat > /usr/local/bin/noizynet << 'CLI'
#!/bin/bash
# NOIZYNET CLI — RSP_001 signal chain control
PORT=9699
CMD="${1:-health}"
case "$CMD" in
    health|signal|ping|events|poll)
        echo "[RSP_001 → NOIZYNET] $CMD"
        curl -sf "http://localhost:${PORT}/${CMD}" | python3 -m json.tool 2>/dev/null \
            || echo "NOIZYNET not responding — run: noizynet start"
        ;;
    keith)
        echo "[RSP_001 → NOIZYNET → KEITH]"
        curl -sf "http://localhost:${PORT}/keith" | python3 -m json.tool 2>/dev/null
        ;;
    start)
        pkill -f noizynet_daemon.js 2>/dev/null || true
        sleep 0.3
        nohup node ~/Desktop/noizynet_daemon.js > ~/Desktop/noizynet.log 2>&1 &
        echo "NOIZYNET daemon started — PID $!"
        sleep 1
        curl -sf http://localhost:${PORT}/ping | python3 -m json.tool 2>/dev/null
        ;;
    stop)
        pkill -f noizynet_daemon.js 2>/dev/null && echo "NOIZYNET stopped" || echo "Not running"
        ;;
    restart)
        pkill -f noizynet_daemon.js 2>/dev/null || true
        sleep 0.5
        nohup node ~/Desktop/noizynet_daemon.js > ~/Desktop/noizynet.log 2>&1 &
        echo "NOIZYNET restarted — PID $!"
        ;;
    log)
        tail -50 ~/Desktop/noizynet.log 2>/dev/null || echo "No log found"
        ;;
    event)
        TYPE="${2:-MANUAL}"
        MSG="${3:-}"
        curl -sf -X POST http://localhost:${PORT}/event \
            -H 'Content-Type: application/json' \
            -d "{\"type\":\"${TYPE}\",\"msg\":\"${MSG}\"}" | python3 -m json.tool
        ;;
    *)
        echo "Usage: noizynet {health|signal|ping|events|poll|keith|start|stop|restart|log|event}"
        echo ""
        echo "  health   → full chain status"
        echo "  signal   → chain snapshot"
        echo "  ping     → alive check"
        echo "  events   → last 50 events"
        echo "  poll     → force immediate chain poll"
        echo "  keith    → ENGR_KEITH status via NOIZYNET"
        echo "  start    → start NOIZYNET daemon"
        echo "  stop     → stop NOIZYNET daemon"
        echo "  restart  → restart daemon"
        echo "  log      → tail daemon log"
        echo "  event    → post custom event {type} {msg}"
        ;;
esac
CLI
chmod +x /usr/local/bin/noizynet
echo "CLI installed"
INSTALL_CLI
    ok "noizynet CLI installed on GOD"
fi

# ── 5. START DAEMON ON GOD ────────────────────────────────────
hr; log "START NOIZYNET DAEMON ON GOD"; hr

if [ "$DRY_RUN" = true ]; then
    log "[DRY] Would start NOIZYNET daemon on GOD :${NOIZYNET_PORT}"
else
    ssh "${GOD_USER}@${GOD_IP}" bash << START
pkill -f noizynet_daemon.js 2>/dev/null || true
sleep 0.5
nohup node ~/Desktop/noizynet_daemon.js > ~/Desktop/noizynet.log 2>&1 &
DAEMON_PID=\$!
echo "PID: \$DAEMON_PID"
sleep 1.5
curl -sf http://localhost:${NOIZYNET_PORT}/ping || echo "Daemon not yet responding"
START
    ok "NOIZYNET daemon started on GOD :${NOIZYNET_PORT}"
fi

# ── 6. VERIFY HEALTH ─────────────────────────────────────────
hr; log "HEALTH CHECK"; hr

sleep 2

if [ "$DRY_RUN" = false ]; then
    HEALTH=$(ssh "${GOD_USER}@${GOD_IP}" \
        "curl -sf http://localhost:${NOIZYNET_PORT}/health 2>/dev/null || echo 'UNREACHABLE'")
    if echo "$HEALTH" | grep -q "SIGNAL_CHAIN_LIVE"; then
        ok "SIGNAL CHAIN LIVE"
    elif echo "$HEALTH" | grep -q "DEGRADED"; then
        log "Chain DEGRADED (expected before Logic is wired)"
        echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
    else
        fail "NOIZYNET not responding"
    fi
fi

# ── 7. LOGIC PRO WIRING (MANUAL STEPS) ───────────────────────
# These steps require a human inside Logic Pro — they cannot be
# scripted via osascript because Logic does not expose an AU
# plugin insertion API to the accessibility layer.
hr; log "LOGIC PRO WIRING — MANUAL STEPS REQUIRED"; hr

cat << 'WIRING' | tee -a "$REPORT"

  These steps require you inside Logic Pro on each machine.
  AU Net Send/Receive cannot be inserted via script.

  ─── MICKY-P (this machine, 10.90.90.40) ───────────────────

  1. Open Logic Pro X
  2. Create or open an Audio track (mono, input = Apollo Quad 2 ch 1)
  3. In the track's I/O slot → set input to Apollo Quad 2
  4. Click Audio FX → AU Generators → Apple → AUNetSend
  5. In AUNetSend plugin window:
       Bonjour Name : NOIZYNET
       Port         : 97100
       Format       : 32-bit float PCM
       Channels     : 1 (mono)
  6. Enable Input Monitoring on the track (speaker icon)
  7. Arm the track (R button)

  ─── GOD (10.90.90.10) ─────────────────────────────────────

  1. Open Logic Pro X
  2. Create a Software Instrument track
  3. In the Instrument slot → AU Instruments → Apple → AUNetReceive
  4. In AUNetReceive plugin window, click [+]:
       Name : NOIZYNET
       Host : 10.90.90.40:97100
  5. Status should change to: Connected ✓
  6. Arm the track, enable Input Monitoring
  7. File → Save As → "NOIZY Claude Session 1"

  ─── iPad ──────────────────────────────────────────────────

  1. Open Logic Remote
  2. It auto-discovers "NOIZY Claude Session 1" on GOD
  3. Connect

  ─── VERIFY ─────────────────────────────────────────────────

  From GOD terminal:
    noizynet health          → check chain status
    noizy status             → ENGR_KEITH status
    noizynet signal          → full chain snapshot

  From Micky-P:
    ssh rsp@10.90.90.10 'noizynet health'

  Signal chain is LIVE when:
    mickyp_reachable   : true
    aunet_port_open    : true   ← fires after AUNetSend is active
    keith_online       : true
    logic_running      : true
    session_saved      : true

WIRING

# ── 8. FINAL ─────────────────────────────────────────────────
hr; log "NOIZYNET DEPLOY COMPLETE"; hr
log "Daemon    : GOD:${NOIZYNET_PORT}"
log "CLI       : ssh ${GOD_USER}@${GOD_IP} noizynet health"
log "WebSocket : ws://${GOD_IP}:${NOIZYNET_PORT}/live"
log "KEITH     : GOD:${KEITH_PORT} (proxied via /keith)"
log "Report    : $REPORT"
hr
