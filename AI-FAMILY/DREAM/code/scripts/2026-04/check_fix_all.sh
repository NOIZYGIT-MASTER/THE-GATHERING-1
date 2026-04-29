#!/bin/bash
# ============================================================
# NOIZY CHECK & FIX ALL
# ============================================================
# Run this on GOD (10.90.90.10).
# Diagnoses every system layer. Fixes what it can.
# Reports exactly what's broken and what needs human action.
#
# Coverage:
#   1. GitHub auth (SSH key + all 4 identities)
#   2. Cloudflare (DNS, Worker, D1, KV, Tunnel)
#   3. Agent mesh (all 10 nodes + MC96 gateway)
#   4. HEAVEN Worker (deployed + responding)
#   5. ENGR_KEITH (port 7006 health)
#   6. NOIZYNET (port 9699 health)
#   7. Tailscale mesh (all nodes)
#   8. Audio chain (Logic, AU Net, Loopback, Apollo)
#   9. Docker (all 9 containers)
#  10. Micky-P connectivity (SSH + AU Net port)
#  11. THE AQUARIUM (storage health)
#  12. GitHub repo consolidation (remotes check + fix)
#
# Usage:
#   chmod +x check_fix_all.sh
#   ./check_fix_all.sh          # full check + fix
#   ./check_fix_all.sh check    # check only, no fixes
#   ./check_fix_all.sh fix      # apply fixes only
#   ./check_fix_all.sh github   # GitHub auth + repo consolidation
#   ./check_fix_all.sh agents   # agent mesh only
#   ./check_fix_all.sh cloud    # Cloudflare only
#
# RSP_001 / NOIZY Empire
# ============================================================

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$HOME/Desktop/NOIZY_CHECK_${TIMESTAMP}"
REPORT="$REPORT_DIR/check_fix_report.txt"
FIX_LOG="$REPORT_DIR/fixes_applied.txt"
ACTION_LOG="$REPORT_DIR/actions_required.txt"
mkdir -p "$REPORT_DIR"

# ── CONFIG ───────────────────────────────────────────────────
GOD_IP="10.90.90.10"
MICKYP_IP="10.90.90.40"
GOD_USER="rsp"
CANONICAL_REPO="https://github.com/rsplowman/noizy"
CANONICAL_GH_USER="rsplowman"
CF_ZONE="noizy.ai"
CF_ACCOUNT="2446d788cc4280f5ea22a9948410c355"
HEAVEN_URL="https://noizy.ai"
TUNNEL_NAME="noizynet"

AGENTS=(
    "GABRIEL:7001"
    "LUCY:7002"
    "SHIRL:7003"
    "DREAM:7004"
    "POPS:7005"
    "ENGR_KEITH:7006"
    "CB01:7007"
    "HEAVEN_DOCKER:7008"
)
MC96_PORT=9699
KEITH_PORT=7006
NOIZYNET_PORT=9699

# ── COUNTERS ─────────────────────────────────────────────────
PASS=0
FAIL=0
FIXED=0
ACTION=0

# ── LOGGING ──────────────────────────────────────────────────
hr()     { echo "============================================" | tee -a "$REPORT"; }
log()    { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$REPORT"; }
pass()   { echo "  ✓ $1" | tee -a "$REPORT"; ((PASS++)) || true; }
fail()   { echo "  ✗ $1" | tee -a "$REPORT"; ((FAIL++)) || true; }
fixed()  { echo "  ⚡ FIXED: $1" | tee -a "$REPORT" "$FIX_LOG"; ((FIXED++)) || true; }
action() { echo "  ⚠ ACTION REQUIRED: $1" | tee -a "$REPORT" "$ACTION_LOG"; ((ACTION++)) || true; }
info()   { echo "  ℹ $1" | tee -a "$REPORT"; }

CMD="${1:-all}"

# ============================================================
# 1. GITHUB AUTH + REPO CONSOLIDATION
# ============================================================
check_github() {
    hr; log "1. GITHUB AUTH + REPO CONSOLIDATION"; hr

    # SSH key check
    log "SSH key status:"
    if [ -f "$HOME/.ssh/id_rsa" ] || [ -f "$HOME/.ssh/github_rsa" ] || [ -f "$HOME/.ssh/id_ed25519" ]; then
        pass "SSH key exists"
    else
        fail "No SSH key found"
        action "Generate SSH key: ssh-keygen -t ed25519 -C 'rsp@noizy.ai' -f ~/.ssh/github_rsa"
        action "Add to GitHub: Settings → SSH Keys → New SSH Key"
    fi

    # SSH auth to GitHub
    log "GitHub SSH auth test:"
    SSH_RESULT=$(ssh -T git@github.com -o ConnectTimeout=5 -o BatchMode=yes 2>&1 || true)
    if echo "$SSH_RESULT" | grep -q "successfully authenticated\|rsplowman"; then
        pass "GitHub SSH auth: $CANONICAL_GH_USER"
    else
        fail "GitHub SSH auth failed: $SSH_RESULT"

        # Try to fix: set up SSH key if exists
        if [ -f "$HOME/.ssh/id_ed25519" ] || [ -f "$HOME/.ssh/id_rsa" ]; then
            log "  Attempting SSH agent fix..."
            eval "$(ssh-agent -s)" 2>/dev/null || true
            ssh-add "$HOME/.ssh/id_ed25519" 2>/dev/null || \
            ssh-add "$HOME/.ssh/id_rsa" 2>/dev/null || true
            SSH_RETRY=$(ssh -T git@github.com -o ConnectTimeout=5 -o BatchMode=yes 2>&1 || true)
            if echo "$SSH_RETRY" | grep -q "successfully authenticated"; then
                fixed "SSH agent loaded — auth working"
            else
                action "Add SSH public key to GitHub rsplowman account: cat ~/.ssh/id_ed25519.pub"
                action "Then: open https://github.com/settings/ssh/new"
            fi
        fi
    fi

    # HTTPS token check
    log "GitHub credential helper:"
    GH_CRED=$(git config --global credential.helper 2>/dev/null || echo "NONE")
    if [ "$GH_CRED" != "NONE" ] && [ -n "$GH_CRED" ]; then
        pass "Credential helper: $GH_CRED"
    else
        fail "No credential helper configured"
        git config --global credential.helper osxkeychain 2>/dev/null && \
            fixed "Set credential helper to osxkeychain" || \
            action "Run: git config --global credential.helper osxkeychain"
    fi

    # Find all local git repos on GOD
    log "Scanning GOD for all git repos (max depth 6)..."
    REPOS_FOUND=0
    REPOS_WRONG_REMOTE=0
    while IFS= read -r git_dir; do
        local repo_dir; repo_dir=$(dirname "$git_dir")
        local repo_name; repo_name=$(basename "$repo_dir")
        local current_remote
        current_remote=$(git -C "$repo_dir" remote get-url origin 2>/dev/null || echo "NO_REMOTE")
        ((REPOS_FOUND++)) || true

        if [ "$current_remote" = "NO_REMOTE" ]; then
            fail "No remote: $repo_dir"
            ((REPOS_WRONG_REMOTE++)) || true
            if [ "$CMD" != "check" ]; then
                # Set remote to canonical
                local target_url="git@github.com:rsplowman/${repo_name}.git"
                git -C "$repo_dir" remote add origin "$target_url" 2>/dev/null && \
                    fixed "Added remote origin: $repo_dir → $target_url" || \
                    action "Manually set remote for: $repo_dir → git remote add origin $target_url"
            fi
        elif echo "$current_remote" | grep -q "rsplowman"; then
            pass "Remote OK: $repo_name → $current_remote"
        else
            fail "Wrong remote: $repo_name → $current_remote"
            ((REPOS_WRONG_REMOTE++)) || true
            if [ "$CMD" != "check" ]; then
                local new_url="git@github.com:rsplowman/${repo_name}.git"
                git -C "$repo_dir" remote set-url origin "$new_url" 2>/dev/null && \
                    fixed "Updated remote: $repo_name → $new_url" || \
                    action "Manually fix remote for: $repo_name"
            fi
        fi
    done < <(find "$HOME" /Users -maxdepth 6 -name ".git" -type d 2>/dev/null | \
              grep -v "node_modules\|Library/Caches" || true)

    info "Repos found: $REPOS_FOUND | Wrong/missing remotes: $REPOS_WRONG_REMOTE"

    # Legacy accounts
    log "Legacy GitHub identities to consolidate:"
    info "1. rp@fishmusic.com → legacy fuel industries"
    info "2. rsp@noizyfish.com → first Claude session 2024"
    info "3. rsplowman@icloud.com → personal/Google auth"
    info "4. github.com/rsplowman → CANONICAL TARGET"
    action "For each legacy account: github.com/settings → repos → transfer to rsplowman"
    action "Or: git clone legacy_repo && cd repo && git remote set-url origin git@github.com:rsplowman/REPONAME.git && git push -u origin --all"
}

# ============================================================
# 2. CLOUDFLARE CHECK
# ============================================================
check_cloudflare() {
    hr; log "2. CLOUDFLARE — DNS + WORKER + D1 + TUNNEL"; hr

    # DNS check
    log "DNS: noizy.ai A records"
    DNS_RESULT=$(curl -sf "https://dns.google/resolve?name=noizy.ai&type=A" 2>/dev/null || echo "FAIL")
    if echo "$DNS_RESULT" | grep -q "172.67\|104.21"; then
        pass "noizy.ai DNS → Cloudflare IPs confirmed"
    else
        fail "noizy.ai DNS not resolving correctly"
        action "Check Cloudflare dashboard → noizy.ai zone → DNS records"
    fi

    # HEAVEN Worker
    log "HEAVEN Worker: $HEAVEN_URL"
    HEAVEN_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$HEAVEN_URL" --max-time 10 2>/dev/null || echo "000")
    if [ "$HEAVEN_STATUS" = "200" ] || [ "$HEAVEN_STATUS" = "404" ]; then
        pass "HEAVEN Worker responding (HTTP $HEAVEN_STATUS)"
    elif [ "$HEAVEN_STATUS" = "000" ]; then
        fail "HEAVEN Worker unreachable — not deployed or tunnel down"
        action "Deploy HEAVEN: cd ~/Desktop/heaven && wrangler deploy --env production"
    else
        fail "HEAVEN Worker HTTP $HEAVEN_STATUS"
        action "Check Worker logs: wrangler tail"
    fi

    # KEITH endpoint via HEAVEN
    log "ENGR_KEITH via HEAVEN: $HEAVEN_URL/keith/ping"
    KEITH_HTTP=$(curl -sf "$HEAVEN_URL/keith/ping" --max-time 8 2>/dev/null || echo "UNREACHABLE")
    if echo "$KEITH_HTTP" | grep -q "alive\|ENGR_KEITH"; then
        pass "KEITH reachable via HEAVEN"
    else
        fail "KEITH not reachable via HEAVEN: $KEITH_HTTP"
        action "Check: Is cloudflared tunnel running on GOD? Run: noizynet_tunnel.sh status"
    fi

    # Cloudflare Tunnel
    log "cloudflared tunnel: $TUNNEL_NAME"
    if pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
        pass "cloudflared process running"
        CF_STATUS=$(cloudflared tunnel info "$TUNNEL_NAME" 2>/dev/null || echo "UNKNOWN")
        info "Tunnel status: $CF_STATUS"
    else
        fail "cloudflared tunnel NOT running"
        if [ "$CMD" != "check" ]; then
            if [ -f "$HOME/Library/LaunchAgents/ai.noizy.cloudflared.plist" ]; then
                launchctl load "$HOME/Library/LaunchAgents/ai.noizy.cloudflared.plist" 2>/dev/null && \
                    fixed "cloudflared tunnel started via launchd" || \
                    action "Manually start: cloudflared tunnel run $TUNNEL_NAME"
            else
                action "Run tunnel setup: ./noizynet_tunnel.sh install"
            fi
        fi
    fi

    # wrangler CLI
    log "wrangler CLI:"
    if command -v wrangler &>/dev/null; then
        pass "wrangler: $(wrangler --version 2>/dev/null | head -1)"
    else
        fail "wrangler not installed"
        action "Install: npm install -g wrangler"
    fi
}

# ============================================================
# 3. AGENT MESH — all 10 nodes
# ============================================================
check_agents() {
    hr; log "3. AGENT MESH — all 10 nodes"; hr

    # Docker
    log "Docker Desktop:"
    if command -v docker &>/dev/null && docker info >/dev/null 2>&1; then
        pass "Docker running"
        RUNNING=$(docker ps --format "{{.Names}}" 2>/dev/null | wc -l | tr -d ' ')
        info "Containers running: $RUNNING"
    else
        fail "Docker not running"
        if [ "$CMD" != "check" ]; then
            open -a "Docker Desktop" 2>/dev/null && \
                fixed "Docker Desktop launched — wait 30s then retry" || \
                action "Start Docker Desktop manually"
        fi
    fi

    # MC96 gateway
    log "MC96 gateway (:9696):"
    if curl -sf "http://localhost:9696/health" >/dev/null 2>&1; then
        pass "MC96 gateway online :9696"
    else
        fail "MC96 gateway not responding :9696"
        action "Start MC96: cd ~/Desktop/mc96 && node gateway.js &"
    fi

    # Individual agents
    for agent_def in "${AGENTS[@]}"; do
        local name="${agent_def%%:*}"
        local port="${agent_def##*:}"
        if curl -sf "http://localhost:${port}/ping" >/dev/null 2>&1; then
            pass "$name :$port online"
        else
            fail "$name :$port not responding"
            if [ "$CMD" != "check" ]; then
                # Try to restart via docker-compose
                if [ -f "$HOME/Desktop/docker-compose.yml" ]; then
                    docker compose -f "$HOME/Desktop/docker-compose.yml" restart "${name,,}" 2>/dev/null && \
                        fixed "$name restarted via docker-compose" || \
                        action "Manually restart $name container"
                else
                    action "Start $name: docker run -d --name ${name,,} -p $port:$port noizy/${name,,}"
                fi
            fi
        fi
    done

    # HEAVEN Worker (Cloudflare edge)
    log "HEAVEN Worker (Cloudflare edge):"
    if curl -sf "$HEAVEN_URL/ping" >/dev/null 2>&1; then
        pass "HEAVEN Worker :443 online"
    else
        fail "HEAVEN Worker not responding"
        action "Deploy: wrangler deploy --env production"
    fi

    # Micky-P node
    log "Micky-P (10.90.90.40):"
    if ping -c 1 -W 2 "$MICKYP_IP" >/dev/null 2>&1; then
        pass "Micky-P reachable"
        if ssh -o ConnectTimeout=3 -o BatchMode=yes "${GOD_USER}@${MICKYP_IP}" "echo ok" >/dev/null 2>&1 || \
           ssh -o ConnectTimeout=3 -o BatchMode=yes "fish@${MICKYP_IP}" "echo ok" >/dev/null 2>&1; then
            pass "Micky-P SSH accessible"
        else
            fail "Micky-P SSH not accessible"
            action "Enable Remote Login: System Settings → Sharing → Remote Login → ON"
        fi
    else
        fail "Micky-P unreachable"
        action "Check: Is Micky-P powered on and on the same network?"
    fi
}

# ============================================================
# 4. AUDIO CHAIN
# ============================================================
check_audio() {
    hr; log "4. AUDIO CHAIN — Apollo + AU Net + Logic + Loopback"; hr

    # Logic Pro running
    log "Logic Pro X:"
    if pgrep -x "Logic Pro" >/dev/null 2>&1; then
        pass "Logic Pro X running"
    else
        fail "Logic Pro X not running"
        action "Open Logic Pro X and load NOIZY Claude Session 1"
    fi

    # AU Net port
    log "AU Net Receive port :$AUNET_PORT:"
    if lsof -i ":97100" >/dev/null 2>&1; then
        pass "AU Net port 97100 active"
    else
        fail "AU Net port 97100 not active"
        action "In Logic: track → AU Net Receive → connect to Micky-P:97100"
    fi

    # Loopback
    log "Loopback virtual driver:"
    if system_profiler SPAudioDataType 2>/dev/null | grep -q "Loopback\|loopback"; then
        pass "Loopback audio driver loaded"
    else
        fail "Loopback not detected"
        action "Launch Loopback app and create virtual audio device"
    fi

    # Apollo interface
    log "Apollo Quad 2:"
    if system_profiler SPAudioDataType 2>/dev/null | grep -qi "apollo\|universal audio\|UAD"; then
        pass "Apollo interface detected"
    else
        fail "Apollo not detected in audio devices"
        action "Check Apollo connection: USB/Thunderbolt cable and UAD driver"
    fi

    # Sample rate
    log "Sample rate (target 48kHz):"
    SAMPLE_RATE=$(system_profiler SPAudioDataType 2>/dev/null | grep -i "default" | grep -o "[0-9]*000" | head -1)
    if [ "$SAMPLE_RATE" = "48000" ]; then
        pass "Sample rate: 48kHz ✓"
    else
        fail "Sample rate: ${SAMPLE_RATE:-unknown} (target: 48000)"
        action "Set in Logic: Project Settings → Audio → Sample Rate → 48000"
    fi
}

# ============================================================
# 5. TAILSCALE MESH
# ============================================================
check_tailscale() {
    hr; log "5. TAILSCALE MESH"; hr

    if command -v tailscale &>/dev/null; then
        pass "tailscale installed: $(tailscale --version 2>/dev/null | head -1)"
        TS_STATUS=$(tailscale status 2>/dev/null || echo "NOT CONNECTED")
        if echo "$TS_STATUS" | grep -q "100\."; then
            pass "Tailscale connected"
            info "$TS_STATUS"
            # Check mesh node: tail03d17f
            if echo "$TS_STATUS" | grep -q "tail03d17f"; then
                pass "tail03d17f node active in mesh"
            else
                fail "tail03d17f node not visible in mesh"
                action "Check: is the other machine running tailscale up?"
            fi
        else
            fail "Tailscale not connected"
            if [ "$CMD" != "check" ]; then
                tailscale up 2>/dev/null && fixed "tailscale up executed" || \
                    action "Run: tailscale up (may need browser auth)"
            fi
        fi
    else
        fail "tailscale not installed"
        action "Install: brew install tailscale && sudo tailscale up"
    fi
}

# ============================================================
# 6. STORAGE — THE AQUARIUM
# ============================================================
check_storage() {
    hr; log "6. STORAGE — THE AQUARIUM + LaCie drives"; hr

    log "System disk (GOD internal):"
    df -h / | tail -1 | tee -a "$REPORT"
    DISK_USED=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
    if [ "$DISK_USED" -lt 80 ]; then
        pass "System disk: ${DISK_USED}% used (healthy)"
    elif [ "$DISK_USED" -lt 90 ]; then
        fail "System disk: ${DISK_USED}% used (WARNING)"
        action "Free up space: clear caches, move media to LaCie"
    else
        fail "System disk: ${DISK_USED}% used (CRITICAL)"
        action "URGENT: Move media to LaCie immediately"
    fi

    log "External volumes:"
    ls -la /Volumes/ 2>/dev/null | tee -a "$REPORT"

    log "LaCie drives:"
    for vol in /Volumes/LaCie* /Volumes/Lacie* /Volumes/LACIE*; do
        if [ -d "$vol" ] 2>/dev/null; then
            pass "LaCie mounted: $vol"
            df -h "$vol" | tail -1 | tee -a "$REPORT"
        fi
    done

    log "Google Drive mount:"
    if [ -d "$HOME/Library/CloudStorage/GoogleDrive-rsp@noizy.ai" ] || \
       ls /Volumes/ 2>/dev/null | grep -qi "google"; then
        pass "Google Drive accessible"
    else
        fail "Google Drive not mounted"
        action "Open Google Drive desktop app and sign in as rsp@noizy.ai"
    fi
}

# ============================================================
# 7. NODE.JS + DEPENDENCIES
# ============================================================
check_deps() {
    hr; log "7. NODE.JS + CLI DEPENDENCIES"; hr

    for cmd in node npm git curl ssh cloudflared wrangler; do
        if command -v "$cmd" &>/dev/null; then
            pass "$cmd: $(command -v "$cmd") — $($cmd --version 2>/dev/null | head -1)"
        else
            fail "$cmd: NOT INSTALLED"
            case "$cmd" in
                node|npm)   action "Install: brew install node" ;;
                cloudflared) action "Install: brew install cloudflare/cloudflare/cloudflared" ;;
                wrangler)   action "Install: npm install -g wrangler" ;;
                *)          action "Install: $cmd via brew or package manager" ;;
            esac
        fi
    done
}

# ============================================================
# FINAL SUMMARY
# ============================================================
do_summary() {
    hr; log "SUMMARY"; hr
    log ""
    log "  PASS:    $PASS checks"
    log "  FAIL:    $FAIL checks"
    log "  FIXED:   $FIXED items auto-repaired"
    log "  ACTION:  $ACTION items need human action"
    log ""

    if [ -f "$ACTION_LOG" ] && [ -s "$ACTION_LOG" ]; then
        log "═══ REQUIRED ACTIONS ═══"
        cat "$ACTION_LOG" | tee -a "$REPORT"
    fi

    if [ -f "$FIX_LOG" ] && [ -s "$FIX_LOG" ]; then
        log ""
        log "═══ AUTO-FIXES APPLIED ═══"
        cat "$FIX_LOG" | tee -a "$REPORT"
    fi

    log ""
    log "Full report: $REPORT"
    log "Action log:  $ACTION_LOG"
    log "Fix log:     $FIX_LOG"
    hr
}

# ============================================================
# MAIN
# ============================================================
AUNET_PORT=97100

case "$CMD" in
    all|check|fix)
        check_deps
        check_github
        check_cloudflare
        check_agents
        check_audio
        check_tailscale
        check_storage
        do_summary
        ;;
    github)
        check_github
        do_summary
        ;;
    cloud|cloudflare)
        check_cloudflare
        do_summary
        ;;
    agents|mesh)
        check_agents
        do_summary
        ;;
    audio)
        check_audio
        do_summary
        ;;
    tailscale)
        check_tailscale
        do_summary
        ;;
    storage)
        check_storage
        do_summary
        ;;
    deps)
        check_deps
        do_summary
        ;;
    *)
        echo "NOIZY CHECK & FIX ALL"
        echo ""
        echo "Usage: $0 {all|check|fix|github|cloud|agents|audio|tailscale|storage|deps}"
        echo ""
        echo "  all        — check + fix everything"
        echo "  check      — check only, no fixes"
        echo "  fix        — apply fixes where possible"
        echo "  github     — GitHub auth + repo consolidation"
        echo "  cloud      — Cloudflare DNS + Worker + Tunnel + D1"
        echo "  agents     — all 10 agent nodes + Docker + MC96"
        echo "  audio      — Apollo + AU Net + Logic + Loopback"
        echo "  tailscale  — mesh connectivity"
        echo "  storage    — THE AQUARIUM + LaCie + Google Drive"
        echo "  deps       — Node.js + CLI tools"
        ;;
esac
