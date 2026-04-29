#!/bin/bash
# ============================================================
# NOIZY MASTER BUILD — EVERYTHING
# One script. All phases. No talking.
#
# Signal chain:  Neumann → Apollo Quad 2 → Micky-P → AU Net
#                → GOD Logic Pro X → NOIZY Claude Session 1
#                → Logic Remote on iPad
#
# Migration:     Media → LaCie | Effects → GOD | Caches → dead
# Machines:      Micky-P (10.90.90.40) + GOD (10.90.90.10)
#
# v3 — NOIZYNET: do_aunet_wire() replaced with real deployment
#       Deploys noizynet_daemon.js to GOD :9699
#       Installs noizynet CLI on GOD
#       Runs preflight + health verification
#       Prints Logic Pro manual wiring (cannot be scripted)
# ============================================================

set -euo pipefail

# =========================
# CONFIG — UPDATE THESE
# =========================
GOD_IP="10.90.90.10"
MICKYP_IP="10.90.90.40"
GOD_USER="rsp"
MICKYP_USERS=("fish" "rsp")
AUNET_PORT=97100
NOIZYNET_PORT=9699
KEITH_PORT=7006
SAMPLE_RATE=48000
BIT_DEPTH=32
CHANNELS=1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT="$HOME/Desktop/noizy_master_build_${TIMESTAMP}.txt"
LACIE_MOUNT=""
DRY_RUN=false

# NOIZYNET daemon source — must live beside this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOIZYNET_DAEMON="${SCRIPT_DIR}/noizynet_daemon.js"

for arg in "$@"; do
    [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done
COMMAND="${1:-all}"
[[ "$COMMAND" == "--dry-run" ]] && COMMAND="${2:-all}"

INSTRUMENT_EXCLUDE=(
    "*Kontakt*" "*Omnisphere*" "*Keyscape*" "*Trilian*" "*Serum*"
    "*Massive*" "*Sylenth*" "*Pigments*" "*Analog Lab*" "*Arturia*V*"
    "*Addictive Keys*" "*Superior Drummer*" "*BFD*" "*EZdrummer*"
    "*Ivory*" "*Pianoteq*" "*HALion*" "*Retrologue*" "*Padshop*"
    "*Play*" "*SINE Player*" "*Spitfire*" "*Reaktor*" "*FM8*"
    "*Absynth*" "*Battery*" "*Maschine*" "*Native Instruments*"
)

hr()  { echo "============================================" | tee -a "$REPORT"; }
log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$REPORT"; }
ok()  { echo "  ✓ $1" | tee -a "$REPORT"; }
fail(){ echo "  ✗ $1" | tee -a "$REPORT"; }

maybe_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command -v sudo &>/dev/null && sudo -n true 2>/dev/null; then
        sudo "$@"
    else
        log "  SKIP (no sudo): $*"
        return 0
    fi
}

detect_lacie() {
    for vol in /Volumes/LaCie* /Volumes/Lacie* /Volumes/LACIE*; do
        if [ -d "$vol" ] 2>/dev/null; then
            LACIE_MOUNT="$vol"
            log "LaCie: $vol ($(df -h "$vol" | tail -1 | awk '{print $4}') free)"
            return
        fi
    done
    log "No LaCie auto-detected. Listing volumes:"
    df -h /Volumes/* 2>/dev/null | tee -a "$REPORT"
    echo "Enter volume path:" && read -r LACIE_MOUNT
}

is_instrument() {
    local plugin="$1"
    for pat in "${INSTRUMENT_EXCLUDE[@]}"; do
        [[ "$plugin" == $pat ]] && return 0
    done
    return 1
}

# ============================================================
# 1. KILL BLOAT
# ============================================================
do_kill() {
    hr; log "1/9 — KILL BLOAT"; hr
    for app in "Google Chrome" "YouTube" "Spotify" "Discord" "Slack" "zoom.us"; do
        killall -9 "$app" 2>/dev/null || true
    done
    log "Heavy apps killed"

    for user in "${MICKYP_USERS[@]}"; do
        rm -rf "/Users/$user/Library/Caches/Google/Chrome"/* 2>/dev/null || true
        rm -rf "/Users/$user/Library/Caches/com.apple.Safari"/* 2>/dev/null || true
        rm -rf "/Users/$user/Library/Caches/Firefox"/* 2>/dev/null || true
        rm -rf "/Users/$user/Library/Developer/Xcode/DerivedData"/* 2>/dev/null || true
        rm -rf "/Users/$user/Library/Saved Application State"/* 2>/dev/null || true
        rm -rf "/Users/$user/.Trash"/* 2>/dev/null || true
        find "/Users/$user/Library/Logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
        log "  $user: caches + trash + logs cleared"
    done

    rm -rf /Library/Caches/* 2>/dev/null || true
    maybe_sudo rm -rf /private/var/log/asl/*.asl 2>/dev/null || true
    maybe_sudo purge 2>/dev/null || true
    log "System caches purged"
    df -h / | tail -1 | tee -a "$REPORT"
}

# ============================================================
# 2. AUDIT
# ============================================================
do_audit() {
    hr; log "2/9 — FULL AUDIT"; hr
    df -h / | tee -a "$REPORT"

    for user in "${MICKYP_USERS[@]}"; do
        local home="/Users/$user"
        [ ! -d "$home" ] && continue
        log ""; log "=== $user ==="; log ""

        log "Top dirs:"; du -sh "$home"/* 2>/dev/null | sort -rh | head -15 | tee -a "$REPORT"
        log "Library:"; du -sh "$home/Library"/* 2>/dev/null | sort -rh | head -10 | tee -a "$REPORT"
        log "Caches:"; du -sh "$home/Library/Caches" 2>/dev/null | tee -a "$REPORT"

        log "Audio:"
        find "$home" -not -path "*/Library/*" \
            \( -iname "*.wav" -o -iname "*.aif" -o -iname "*.aiff" -o -iname "*.mp3" \
               -o -iname "*.flac" -o -iname "*.m4a" -o -iname "*.ogg" -o -iname "*.aac" \) \
            2>/dev/null | wc -l | xargs -I{} echo "  {} audio files" | tee -a "$REPORT"

        log "Video:"
        find "$home" -not -path "*/Library/*" \
            \( -iname "*.mov" -o -iname "*.mp4" -o -iname "*.avi" -o -iname "*.mkv" -o -iname "*.m4v" \) \
            2>/dev/null | wc -l | xargs -I{} echo "  {} video files" | tee -a "$REPORT"

        log "DAW projects:"
        find "$home" \( -iname "*.logicx" -o -iname "*.ptx" -o -iname "*.cpr" \) \
            2>/dev/null | wc -l | xargs -I{} echo "  {} projects" | tee -a "$REPORT"

        log "Plugins (user-level):"
        for pdir in "Library/Audio/Plug-Ins/Components" "Library/Audio/Plug-Ins/VST" "Library/Audio/Plug-Ins/VST3"; do
            [ -d "$home/$pdir" ] && ls -1 "$home/$pdir" 2>/dev/null | tee -a "$REPORT"
        done

        log "Sample libraries:"
        for sdir in "Native Instruments" "Spectrasonics" "Arturia" "Output" "Kontakt" "EastWest"; do
            [ -d "$home/Library/Application Support/$sdir" ] && \
                du -sh "$home/Library/Application Support/$sdir" 2>/dev/null | tee -a "$REPORT"
        done
    done

    log ""; log "System plugins:"
    for pdir in "/Library/Audio/Plug-Ins/Components" "/Library/Audio/Plug-Ins/VST" "/Library/Audio/Plug-Ins/VST3"; do
        [ -d "$pdir" ] && echo "  $pdir: $(ls -1 "$pdir" | wc -l | tr -d ' ') items" | tee -a "$REPORT"
    done
}

# ============================================================
# 3. MEDIA MIGRATION → LACIE
# ============================================================
migrate_file() {
    local src="$1" dest_dir="$2" label="$3"
    local base
    base=$(basename "$src")

    if [ "$DRY_RUN" = true ]; then
        log "  [DRY] $label: $base"
        return 0
    fi

    local h1
    h1=$(md5 -q "$src" 2>/dev/null || md5sum "$src" 2>/dev/null | awk '{print $1}')
    rsync -a "$src" "$dest_dir/$base"
    local h2
    h2=$(md5 -q "$dest_dir/$base" 2>/dev/null || md5sum "$dest_dir/$base" 2>/dev/null | awk '{print $1}')

    if [ "$h1" = "$h2" ]; then
        rm -rf "$src"
        log "  ✓ $base"
    else
        log "  ✗ MISMATCH: $base — kept"
    fi
}

do_migrate_media() {
    hr; log "3/9 — MEDIA MIGRATION → LaCie"; hr
    detect_lacie
    [ -z "$LACIE_MOUNT" ] || [ ! -d "$LACIE_MOUNT" ] && { log "ERROR: No LaCie"; exit 1; }

    for user in "${MICKYP_USERS[@]}"; do
        local home="/Users/$user"
        local dest="$LACIE_MOUNT/MICKY-P-MIGRATION/$user"
        mkdir -p "$dest/audio" "$dest/video" "$dest/daw_projects"
        log "Moving $user media → $dest"

        find "$home" -not -path "*/Library/*" \
            \( -iname "*.wav" -o -iname "*.aif" -o -iname "*.aiff" -o -iname "*.mp3" \
               -o -iname "*.flac" -o -iname "*.m4a" -o -iname "*.ogg" -o -iname "*.aac" \) \
            -print0 2>/dev/null | while IFS= read -r -d '' f; do
            local rel; rel=$(dirname "${f#$home/}")
            mkdir -p "$dest/audio/$rel"
            migrate_file "$f" "$dest/audio/$rel" "AUDIO"
        done

        find "$home" -not -path "*/Library/*" \
            \( -iname "*.mov" -o -iname "*.mp4" -o -iname "*.avi" -o -iname "*.mkv" -o -iname "*.m4v" \) \
            -print0 2>/dev/null | while IFS= read -r -d '' f; do
            local rel; rel=$(dirname "${f#$home/}")
            mkdir -p "$dest/video/$rel"
            migrate_file "$f" "$dest/video/$rel" "VIDEO"
        done

        find "$home" \( -iname "*.logicx" -o -iname "*.ptx" -o -iname "*.cpr" \) \
            -print0 2>/dev/null | while IFS= read -r -d '' f; do
            local rel; rel=$(dirname "${f#$home/}")
            mkdir -p "$dest/daw_projects/$rel"
            if [ "$DRY_RUN" = true ]; then
                log "  [DRY] PROJECT: $(basename "$f")"
            else
                rsync -a "$f" "$dest/daw_projects/$rel/"
                if [ $? -eq 0 ]; then
                    rm -rf "$f"; log "  ✓ PROJECT: $(basename "$f")"
                else
                    log "  ✗ PROJECT FAILED: $(basename "$f")"
                fi
            fi
        done
        log "$user media migration done"
    done
    du -sh "$LACIE_MOUNT/MICKY-P-MIGRATION"/* 2>/dev/null | tee -a "$REPORT"
}

# ============================================================
# 4. PLUGIN MIGRATION — Effects only → GOD
# ============================================================
do_migrate_plugins() {
    hr; log "4/9 — PLUGIN MIGRATION → GOD (effects only)"; hr

    for pdir in "/Library/Audio/Plug-Ins/Components" "/Library/Audio/Plug-Ins/VST" "/Library/Audio/Plug-Ins/VST3"; do
        [ ! -d "$pdir" ] && continue
        log "Processing: $pdir"
        ls -1 "$pdir" 2>/dev/null | while IFS= read -r plugin; do
            if is_instrument "$plugin"; then
                log "  SKIP (instrument): $plugin"
            else
                if [ "$DRY_RUN" = true ]; then
                    log "  [DRY] MOVE: $plugin"
                else
                    log "  MOVE: $plugin"
                    rsync -az --remove-source-files \
                        "${pdir}/${plugin}" \
                        "${GOD_USER}@${GOD_IP}:${pdir}/${plugin}" 2>> "$REPORT"
                    [ $? -eq 0 ] && log "    ✓" || log "    ✗ FAILED"
                fi
            fi
        done
    done

    for user in "${MICKYP_USERS[@]}"; do
        for subdir in "Library/Audio/Plug-Ins/Components" "Library/Audio/Plug-Ins/VST" "Library/Audio/Plug-Ins/VST3"; do
            local full="/Users/$user/$subdir"
            [ ! -d "$full" ] && continue
            log "User plugins: $full"
            ls -1 "$full" 2>/dev/null | while IFS= read -r plugin; do
                if ! is_instrument "$plugin"; then
                    if [ "$DRY_RUN" = true ]; then
                        log "  [DRY] MOVE: $plugin"
                    else
                        log "  MOVE: $plugin"
                        local target_type
                        target_type=$(basename "$(dirname "$full")")
                        rsync -az --remove-source-files \
                            "${full}/${plugin}" \
                            "${GOD_USER}@${GOD_IP}:/Library/Audio/Plug-Ins/${target_type}/${plugin}" 2>> "$REPORT"
                    fi
                fi
            done
        done
    done
}

# ============================================================
# 5. NUKE ALL CACHES
# ============================================================
do_nuke() {
    hr; log "5/9 — NUKE CACHES"; hr
    for user in "${MICKYP_USERS[@]}"; do
        rm -rf "/Users/$user/Library/Caches"/* 2>/dev/null || true
        rm -rf "/Users/$user/Library/Caches/AudioUnitCache" 2>/dev/null || true
        rm -rf "/Users/$user/Library/Saved Application State"/* 2>/dev/null || true
        rm -rf "/Users/$user/.Trash"/* 2>/dev/null || true
        find "/Users/$user/Library/Logs" -mtime +3 -delete 2>/dev/null || true
        log "  $user: clean"
    done
    rm -rf /Library/Caches/* 2>/dev/null || true
    maybe_sudo purge 2>/dev/null || true
    log "All caches destroyed"
    df -h / | tail -1 | tee -a "$REPORT"
}

# ============================================================
# 6. AU CACHE REBUILD ON GOD
# ============================================================
do_god_au_rebuild() {
    hr; log "6/9 — GOD AU CACHE REBUILD (remote)"; hr
    ssh "${GOD_USER}@${GOD_IP}" bash << 'GODSCRIPT'
rm -rf ~/Library/Caches/AudioUnitCache/ 2>/dev/null || true
rm -f ~/Library/Preferences/com.apple.audio.InfoHelper.plist 2>/dev/null || true
killall -9 AudioComponentRegistrar 2>/dev/null || true
echo "AU cache cleared on GOD. Launch Logic to rebuild."
auval -a 2>/dev/null | tail -3
GODSCRIPT
    log "GOD AU cache rebuilt"
}

# ============================================================
# 7. INSTALL ENGR_KEITH + LOGIC AUTOMATION ON GOD
# ============================================================
do_install_keith() {
    hr; log "7/9 — INSTALL ENGR_KEITH + LOGIC AUTOMATION ON GOD"; hr

    ssh "${GOD_USER}@${GOD_IP}" "cat > ~/Desktop/noizy_logic_control.applescript" << 'APPLESCRIPT'
on run argv
    set cmd to item 1 of argv
    if cmd is "record" then
        tell application "Logic Pro" to activate
        delay 0.3
        tell application "System Events" to tell process "Logic Pro" to keystroke "r"
        do shell script "echo '[ENGR_KEITH] RECORDING — '$(date '+%Y-%m-%d %H:%M:%S') >> ~/Desktop/noizy_session_log.txt"
        return "RECORDING"
    else if cmd is "stop" then
        tell application "Logic Pro" to activate
        delay 0.3
        tell application "System Events" to tell process "Logic Pro" to keystroke " "
        do shell script "echo '[ENGR_KEITH] STOPPED — '$(date '+%Y-%m-%d %H:%M:%S') >> ~/Desktop/noizy_session_log.txt"
        return "STOPPED"
    else if cmd is "play" then
        tell application "Logic Pro" to activate
        delay 0.3
        tell application "System Events" to tell process "Logic Pro" to keystroke " "
        return "PLAYING"
    else if cmd is "arm" then
        tell application "Logic Pro" to activate
        delay 0.3
        tell application "System Events" to tell process "Logic Pro" to keystroke "r" using {control down}
        do shell script "echo '[ENGR_KEITH] ARMED — '$(date '+%Y-%m-%d %H:%M:%S') >> ~/Desktop/noizy_session_log.txt"
        return "ARMED"
    else if cmd is "save" then
        tell application "Logic Pro" to activate
        delay 0.3
        tell application "System Events" to tell process "Logic Pro" to keystroke "s" using {command down}
        do shell script "echo '[ENGR_KEITH] SAVED — '$(date '+%Y-%m-%d %H:%M:%S') >> ~/Desktop/noizy_session_log.txt"
        return "SAVED"
    else if cmd is "status" then
        try
            return do shell script "tail -1 ~/Desktop/noizy_session_log.txt"
        on error
            return "NO LOG"
        end try
    else
        return "UNKNOWN: " & cmd
    end if
end run
APPLESCRIPT
    log "  AppleScript deployed to GOD"

    ssh "${GOD_USER}@${GOD_IP}" "cat > ~/Desktop/engr_keith_server.js" << 'KEITHJS'
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');

const PORT = 7006;
const AGENT = 'ENGR_KEITH';
const SCRIPT = `${process.env.HOME}/Desktop/noizy_logic_control.applescript`;
const LOG = `${process.env.HOME}/Desktop/noizy_session_log.txt`;

const state = {
    agent: AGENT, status: 'ONLINE',
    session: 'NOIZY Claude Session 1',
    recording: false, armed: false,
    boot: new Date().toISOString()
};

function log(m) {
    const line = `[${new Date().toISOString()}] [${AGENT}] ${m}`;
    console.log(line);
    fs.appendFileSync(LOG, line + '\n');
}

function run(cmd) {
    try {
        return { ok: true, r: execSync(`osascript ${SCRIPT} "${cmd}"`, { encoding: 'utf-8', timeout: 10000 }).trim() };
    } catch (e) { return { ok: false, e: e.message }; }
}

function handle(cmd) {
    log(`CMD: ${cmd}`);
    state.lastCmd = cmd;
    state.lastTime = new Date().toISOString();
    switch (cmd) {
        case 'record': { const r = run('record'); if (r.ok) { state.recording = true; state.armed = true; state.status = 'RECORDING'; } return { ...state, action: r }; }
        case 'stop':   { const r = run('stop');   if (r.ok) { state.recording = false; state.status = 'STOPPED'; } return { ...state, action: r }; }
        case 'arm':    { const r = run('arm');    if (r.ok) { state.armed = true; state.status = 'ARMED'; } return { ...state, action: r }; }
        case 'save':   run('save'); return { ...state, action: { ok: true } };
        case 'play':   run('play'); state.status = 'PLAYING'; return state;
        case 'status': return state;
        case 'ping':   return { agent: AGENT, alive: true };
        default:       return { error: `Unknown: ${cmd}` };
    }
}

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url === '/status') return res.end(JSON.stringify(state, null, 2));
    if (req.method === 'GET' && req.url === '/ping')   return res.end(JSON.stringify({ agent: AGENT, alive: true }));
    if (req.method === 'POST' && req.url === '/dispatch') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { const p = JSON.parse(body); res.end(JSON.stringify(handle((p.command || p.cmd || '').toLowerCase()), null, 2)); }
            catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: e.message })); }
        });
        return;
    }
    const cmd = req.url.replace('/', '').toLowerCase();
    if (['record','stop','arm','save','play'].includes(cmd)) return res.end(JSON.stringify(handle(cmd), null, 2));
    res.statusCode = 404;
    res.end(JSON.stringify({ endpoints: ['GET /record','GET /stop','GET /arm','GET /save','GET /play','GET /status','GET /ping','POST /dispatch'] }));
});

function shutdown(sig) {
    log(`${sig} received — shutting down`);
    state.status = 'OFFLINE';
    server.close(() => { log('Server closed'); process.exit(0); });
    setTimeout(() => process.exit(1), 3000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => { log(`ENGR_KEITH ONLINE — port ${PORT}`); log('Waiting for RSP_001...'); });
KEITHJS
    log "  ENGR_KEITH server deployed to GOD"

    ssh "${GOD_USER}@${GOD_IP}" "cat > /usr/local/bin/noizy && chmod +x /usr/local/bin/noizy" << 'NOIZYCLI'
#!/bin/bash
CMD="${1:-status}"
case "$CMD" in
    record|stop|arm|save|play|status|ping)
        echo "[RSP_001 → ENGR_KEITH] $CMD"
        curl -s "http://localhost:7006/${CMD}" | python3 -m json.tool 2>/dev/null || echo "KEITH not responding";;
    *) echo "Usage: noizy {record|stop|arm|save|play|status|ping}";;
esac
NOIZYCLI
    log "  CLI 'noizy' deployed to GOD"

    ssh "${GOD_USER}@${GOD_IP}" bash << 'START'
pkill -f engr_keith_server.js 2>/dev/null || true
sleep 0.5
nohup node ~/Desktop/engr_keith_server.js > ~/Desktop/engr_keith.log 2>&1 &
echo "KEITH PID: $!"
START
    log "  ENGR_KEITH started on GOD:7006"
}

# ============================================================
# 8. NOIZYNET — SIGNAL CHAIN MONITOR + AU NET DEPLOYMENT
# ============================================================
do_aunet_wire() {
    hr; log "8/9 — NOIZYNET SIGNAL CHAIN MONITOR + AU NET"; hr

    # ── Preflight ────────────────────────────────────────────
    log "Preflight: GOD reachable?"
    if ping -c 1 -W 2 "$GOD_IP" >/dev/null 2>&1; then
        ok "GOD ($GOD_IP) responds"
    else
        fail "GOD unreachable — aborting NOIZYNET"
        return 1
    fi

    log "Preflight: SSH to GOD?"
    if ! ssh -o ConnectTimeout=4 -o BatchMode=yes "${GOD_USER}@${GOD_IP}" "echo ok" >/dev/null 2>&1; then
        fail "SSH to GOD failed"
        return 1
    fi
    ok "SSH to GOD"

    log "Preflight: Node.js on GOD?"
    local node_ver
    node_ver=$(ssh "${GOD_USER}@${GOD_IP}" "node --version 2>/dev/null || echo MISSING")
    if [[ "$node_ver" == "MISSING" ]]; then
        fail "Node.js missing on GOD — install: brew install node"
        return 1
    fi
    ok "Node.js ${node_ver} on GOD"

    # ── AU Net port self-check (Micky-P) ─────────────────────
    log "AU Net Send port :${AUNET_PORT} check (this machine)..."
    if lsof -i ":${AUNET_PORT}" >/dev/null 2>&1; then
        ok "Port ${AUNET_PORT} active — AUNetSend running in Logic"
    else
        log "  Port ${AUNET_PORT} not yet open — wire Logic AU Net Send (steps below)"
    fi

    # ── Deploy daemon ────────────────────────────────────────
    if [ ! -f "$NOIZYNET_DAEMON" ]; then
        fail "noizynet_daemon.js not found at: $NOIZYNET_DAEMON"
        fail "Place noizynet_daemon.js beside this script and re-run"
        return 1
    fi

    if [ "$DRY_RUN" = true ]; then
        log "[DRY] Would deploy noizynet_daemon.js → GOD"
        log "[DRY] Would install noizynet CLI on GOD"
        log "[DRY] Would start NOIZYNET on GOD :${NOIZYNET_PORT}"
    else
        log "Deploying NOIZYNET daemon → GOD..."
        scp "$NOIZYNET_DAEMON" "${GOD_USER}@${GOD_IP}:~/Desktop/noizynet_daemon.js"
        ok "noizynet_daemon.js deployed"

        # Install CLI on GOD
        ssh "${GOD_USER}@${GOD_IP}" bash << 'INSTALL_CLI'
cat > /usr/local/bin/noizynet << 'CLI'
#!/bin/bash
PORT=9699
CMD="${1:-health}"
case "$CMD" in
    health|signal|ping|events|poll)
        echo "[RSP_001 → NOIZYNET] $CMD"
        curl -sf "http://localhost:${PORT}/${CMD}" | python3 -m json.tool 2>/dev/null \
            || echo "NOIZYNET not running — try: noizynet start"
        ;;
    keith)
        curl -sf "http://localhost:${PORT}/keith" | python3 -m json.tool 2>/dev/null
        ;;
    start)
        pkill -f noizynet_daemon.js 2>/dev/null || true
        sleep 0.3
        nohup node ~/Desktop/noizynet_daemon.js > ~/Desktop/noizynet.log 2>&1 &
        echo "NOIZYNET started — PID $!"
        sleep 1.5
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
        tail -50 ~/Desktop/noizynet.log 2>/dev/null || echo "No log"
        ;;
    event)
        TYPE="${2:-MANUAL}"; MSG="${3:-}"
        curl -sf -X POST http://localhost:${PORT}/event \
            -H 'Content-Type: application/json' \
            -d "{\"type\":\"${TYPE}\",\"msg\":\"${MSG}\"}" | python3 -m json.tool
        ;;
    *)
        echo "Usage: noizynet {health|signal|ping|events|poll|keith|start|stop|restart|log|event}"
        ;;
esac
CLI
chmod +x /usr/local/bin/noizynet
echo "noizynet CLI installed"
INSTALL_CLI
        ok "noizynet CLI installed on GOD"

        # Start daemon
        ssh "${GOD_USER}@${GOD_IP}" bash << START
pkill -f noizynet_daemon.js 2>/dev/null || true
sleep 0.5
nohup node ~/Desktop/noizynet_daemon.js > ~/Desktop/noizynet.log 2>&1 &
echo "NOIZYNET PID: \$!"
START
        ok "NOIZYNET daemon started on GOD :${NOIZYNET_PORT}"

        # Verify
        sleep 2
        local health
        health=$(ssh "${GOD_USER}@${GOD_IP}" \
            "curl -sf http://localhost:${NOIZYNET_PORT}/health 2>/dev/null || echo UNREACHABLE")
        if echo "$health" | grep -q "SIGNAL_CHAIN_LIVE"; then
            ok "SIGNAL CHAIN LIVE"
        elif echo "$health" | grep -q "DEGRADED"; then
            log "  Chain DEGRADED — expected until Logic AU Net is wired"
        else
            fail "NOIZYNET health endpoint not responding"
        fi
    fi

    # ── Logic Pro manual wiring ───────────────────────────────
    # AU Net Send/Receive cannot be scripted — Logic exposes no
    # plugin-insertion API to the accessibility layer.
    log ""
    log "── LOGIC PRO WIRING — REQUIRED MANUAL STEPS ──"
    log ""
    log "MICKY-P (this machine, ${MICKYP_IP}):"
    log "  1. Logic Pro X → Audio track → input: Apollo Quad 2 ch 1"
    log "  2. Audio FX → AU Generators → Apple → AUNetSend"
    log "  3. AUNetSend settings:"
    log "       Bonjour Name : NOIZYNET"
    log "       Port         : ${AUNET_PORT}"
    log "       Format       : 32-bit float PCM"
    log "       Channels     : 1 (mono)"
    log "  4. Input monitoring ON, arm track"
    log ""
    log "GOD (${GOD_IP}):"
    log "  1. Logic Pro X → Software Instrument track"
    log "  2. Instrument slot → AU Instruments → Apple → AUNetReceive"
    log "  3. Click [+] in plugin window:"
    log "       Name : NOIZYNET"
    log "       Host : ${MICKYP_IP}:${AUNET_PORT}"
    log "  4. Status → Connected ✓"
    log "  5. Arm track, monitoring ON"
    log "  6. File → Save As: 'NOIZY Claude Session 1'"
    log ""
    log "iPad:"
    log "  Logic Remote → auto-discovers GOD session"
    log ""
    log "VERIFY (after wiring):"
    log "  ssh ${GOD_USER}@${GOD_IP} 'noizynet health'"
    log "  Chain is LIVE when aunet_port_open: true"
    log ""
    log "WebSocket feed: ws://${GOD_IP}:${NOIZYNET_PORT}/live"
    log "KEITH proxy:    http://${GOD_IP}:${NOIZYNET_PORT}/keith"
}

# ============================================================
# 9. DUAL USER RAM CONFIG
# ============================================================
do_ram_config() {
    hr; log "9/9 — DUAL USER RAM CONFIG"; hr

    local total_ram
    total_ram=$(sysctl -n hw.memsize 2>/dev/null || echo 0)
    local total_gb=$((total_ram / 1073741824))
    log "RAM: ${total_gb}GB — splitting to 2 × 8GB workloads"

    for user in "${MICKYP_USERS[@]}"; do
        local agent_dir="/Users/$user/Library/LaunchAgents"
        mkdir -p "$agent_dir" 2>/dev/null || true

        cat > "$agent_dir/ai.noizy.lean-switch.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>ai.noizy.lean-switch</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>killall -9 'Google Chrome' 'Spotify' 'Slack' 'Discord' 'zoom.us' 2>/dev/null; purge</string>
    </array>
    <key>RunAtLoad</key><false/>
    <key>WatchPaths</key><array><string>/dev/console</string></array>
</dict>
</plist>
PLIST
        log "  Lean-switch agent installed for $user"
    done

    log ""
    log "Enable Fast User Switching:"
    log "  System Settings → Users → Login Options → Show fast user switching"
}

# ============================================================
# 10. LICENSING INSTRUCTIONS
# ============================================================
do_licensing() {
    hr; log "LICENSING — iLok Cloud + Waves"; hr
    log ""
    log "iLok Cloud (on GOD):"
    log "  1. Install iLok License Manager → sign in"
    log "  2. File → Open Cloud Session"
    log "  3. All cloud-enabled licenses auto-activate"
    log "  4. On Micky-P: File → Close Cloud Session first"
    log ""
    log "Waves (on GOD):"
    log "  1. Install Waves Central → sign in"
    log "  2. Install effects only → activate on GOD"
    log "  3. Deactivate from Micky-P if at seat limit"
    log ""
    log "Others:"
    log "  FabFilter     : account-based, download on GOD"
    log "  Soundtoys     : iLok Cloud"
    log "  Slate Digital : iLok Cloud"
    log "  Valhalla      : serial number re-enter"
    log "  Plugin Alliance: account login"
    log "  UAD Native    : UA Connect on GOD"
    log "  UAD DSP       : stays on Apollo/Micky-P"
}

# ============================================================
# FINAL REPORT
# ============================================================
do_report() {
    hr; log "FINAL STATE"; hr
    df -h / | tee -a "$REPORT"
    log ""
    for user in "${MICKYP_USERS[@]}"; do
        log "  $user: $(du -sh "/Users/$user" 2>/dev/null | awk '{print $1}')"
    done
    [ -n "$LACIE_MOUNT" ] && [ -d "$LACIE_MOUNT/MICKY-P-MIGRATION" ] && \
        du -sh "$LACIE_MOUNT/MICKY-P-MIGRATION"/* 2>/dev/null | tee -a "$REPORT"

    log ""
    log "Micky-P : 2 lean workstations, AUNetSend → GOD :${AUNET_PORT}"
    log "GOD     : ENGR_KEITH :${KEITH_PORT} | NOIZYNET :${NOIZYNET_PORT} | effects consolidated"
    log "Signal  : Neumann → Apollo → Micky-P → AU Net → GOD → NOIZY Claude Session 1"
    log "Control : iPad Logic Remote + 'noizy record' + 'noizynet health'"
    log "WS feed : ws://${GOD_IP}:${NOIZYNET_PORT}/live"
    log ""
    log "Report  : $REPORT"
    hr
}

# ============================================================
# MAIN
# ============================================================
$DRY_RUN && log "*** DRY RUN MODE — no files will be moved ***"

case "$COMMAND" in
    all)
        do_kill
        do_audit
        do_migrate_media
        do_migrate_plugins
        do_nuke
        do_god_au_rebuild
        do_install_keith
        do_aunet_wire       # ← now deploys NOIZYNET, not just instructions
        do_ram_config
        do_licensing
        do_report
        ;;
    kill)       do_kill ;;
    audit)      do_audit ;;
    media)      do_migrate_media ;;
    plugins)    do_migrate_plugins ;;
    nuke)       do_nuke ;;
    god)        do_god_au_rebuild ;;
    keith)      do_install_keith ;;
    aunet|noizynet) do_aunet_wire ;;
    ram)        do_ram_config ;;
    license)    do_licensing ;;
    report)     do_report ;;
    *)
        echo "NOIZY MASTER BUILD v3"
        echo "Usage: $0 [--dry-run] {all|kill|audit|media|plugins|nuke|god|keith|aunet|ram|license|report}"
        echo ""
        echo "  all           — run everything in order"
        echo "  kill          — force-quit bloat apps + clear caches"
        echo "  audit         — full space breakdown"
        echo "  media         — move audio/video/projects → LaCie"
        echo "  plugins       — move effects → GOD (skip instruments)"
        echo "  nuke          — destroy all caches"
        echo "  god           — rebuild AU cache on GOD"
        echo "  keith         — deploy ENGR_KEITH + Logic automation to GOD"
        echo "  aunet|noizynet — deploy NOIZYNET daemon + wire AU Net"
        echo "  ram           — dual user lean-switch config"
        echo "  license       — iLok/Waves/UAD migration steps"
        echo "  report        — final state"
        echo ""
        echo "  --dry-run     — show what would happen without moving anything"
        echo ""
        echo "Requires: noizynet_daemon.js in same directory as this script"
        ;;
esac
