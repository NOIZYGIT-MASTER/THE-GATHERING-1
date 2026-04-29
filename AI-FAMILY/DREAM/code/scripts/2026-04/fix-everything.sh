#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NOIZY.AI — FIX EVERYTHING
# Run this from Terminal on GOD.local to get to recording-ready
# Author: Robert Stephen Plowman
# Date: 2026-04-13
# ═══════════════════════════════════════════════════════════════

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ${BOLD}NOIZY.AI — FIX EVERYTHING${NC}"
echo "  Getting GOD.local recording-ready for Gabriel + Micky-P"
echo "═══════════════════════════════════════════════════════════"
echo ""

FIXES=0
FAILS=0
SKIPPED=0

pass() { echo -e "  ${GREEN}✅ FIXED${NC} — $1"; ((FIXES++)); }
fail() { echo -e "  ${RED}❌ FAILED${NC} — $1"; ((FAILS++)); }
skip() { echo -e "  ${YELLOW}⏭️  SKIP${NC} — $1"; ((SKIPPED++)); }
info() { echo -e "  ${CYAN}ℹ️  INFO${NC} — $1"; }
section() { echo ""; echo -e "${BOLD}[$1]${NC}"; }

# ─────────────────────────────────────────────────────────────
section "1. DOCKER CLI"
# ─────────────────────────────────────────────────────────────

DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin/docker"
if [ -f "$DOCKER_BIN" ]; then
    if ! command -v docker &>/dev/null; then
        # Fix Docker CLI symlink
        if [ -w /usr/local/bin ]; then
            ln -sf "$DOCKER_BIN" /usr/local/bin/docker
            ln -sf "/Applications/Docker.app/Contents/Resources/bin/docker-compose" /usr/local/bin/docker-compose 2>/dev/null || true
            pass "Docker CLI symlinked to /usr/local/bin/docker"
        else
            echo "  Need sudo to symlink Docker CLI..."
            sudo ln -sf "$DOCKER_BIN" /usr/local/bin/docker
            sudo ln -sf "/Applications/Docker.app/Contents/Resources/bin/docker-compose" /usr/local/bin/docker-compose 2>/dev/null || true
            pass "Docker CLI symlinked (sudo)"
        fi
    else
        skip "Docker CLI already in PATH ($(which docker))"
    fi
else
    fail "Docker.app not found at expected location"
fi

# Test Docker connection
if command -v docker &>/dev/null; then
    if docker info &>/dev/null; then
        pass "Docker daemon connected"
    else
        info "Docker Desktop is running but daemon may still be starting. Wait 30s and retry."
        fail "Docker daemon not responding"
    fi
fi

# ─────────────────────────────────────────────────────────────
section "2. N8N + DOCKER SERVICES"
# ─────────────────────────────────────────────────────────────

N8N_DIR="$HOME/n8n-docker"
if [ ! -d "$N8N_DIR" ]; then
    N8N_DIR="$HOME/NOIZY_2026/n8n-docker"
fi
if [ ! -d "$N8N_DIR" ]; then
    N8N_DIR=$(find "$HOME" -maxdepth 3 -name "docker-compose.yml" -path "*n8n*" -exec dirname {} \; 2>/dev/null | head -1)
fi

if [ -n "$N8N_DIR" ] && [ -d "$N8N_DIR" ]; then
    info "Found n8n at: $N8N_DIR"
    if command -v docker &>/dev/null && docker info &>/dev/null; then
        cd "$N8N_DIR"
        echo "  Starting n8n stack..."
        docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null
        if [ $? -eq 0 ]; then
            pass "n8n Docker stack started"
        else
            fail "n8n Docker stack failed to start"
        fi
        cd -
    else
        skip "Docker not available — fix Docker CLI first, then re-run"
    fi
else
    info "n8n docker-compose not found. Check location manually."
    skip "n8n directory not found"
fi

# ─────────────────────────────────────────────────────────────
section "3. COREAUDIO"
# ─────────────────────────────────────────────────────────────

if pgrep -q coreaudiod; then
    skip "CoreAudio already running (PID $(pgrep coreaudiod))"
else
    echo "  Restarting CoreAudio..."
    sudo killall coreaudiod 2>/dev/null || true
    sleep 2
    if pgrep -q coreaudiod; then
        pass "CoreAudio restarted"
    else
        fail "CoreAudio did not restart automatically"
    fi
fi

# ─────────────────────────────────────────────────────────────
section "4. APOLLO TWIN (MICKY-P)"
# ─────────────────────────────────────────────────────────────

APOLLO_FOUND=false
# Check Thunderbolt
if system_profiler SPThunderboltDataType 2>/dev/null | grep -qi "apollo\|universal audio\|UAD"; then
    pass "Apollo Twin found on Thunderbolt"
    APOLLO_FOUND=true
fi

# Check USB
if system_profiler SPUSBDataType 2>/dev/null | grep -qi "apollo\|universal audio\|UAD"; then
    pass "Apollo Twin found on USB"
    APOLLO_FOUND=true
fi

if [ "$APOLLO_FOUND" = false ]; then
    echo ""
    echo -e "  ${RED}${BOLD}⚠️  APOLLO TWIN (MICKY-P) NOT CONNECTED${NC}"
    echo ""
    echo "  PHYSICAL ACTION REQUIRED:"
    echo "  1. Power ON the Apollo Twin"
    echo "  2. Connect Thunderbolt cable to any free port (receptacles 2-6)"
    echo "  3. Wait 10 seconds for recognition"
    echo "  4. Open UAD Console to verify"
    echo "  5. Re-run this script"
    echo ""
    fail "Apollo Twin not detected on any bus"
fi

# Check UAD Console
if pgrep -q "UAD Console\|uad" 2>/dev/null; then
    skip "UAD Console already running"
else
    open -a "UAD Console" 2>/dev/null && pass "UAD Console launched" || skip "UAD Console not installed or not launching"
fi

# ─────────────────────────────────────────────────────────────
section "5. AUDIO ROUTING"
# ─────────────────────────────────────────────────────────────

# Check BlackHole
if [ -d "/Library/Audio/Plug-Ins/HAL/BlackHole2ch.driver" ] || [ -d "/Library/Audio/Plug-Ins/HAL/BlackHole16ch.driver" ]; then
    pass "BlackHole audio driver installed"
else
    info "BlackHole not found. Install from: https://existential.audio/blackhole/"
    echo "  brew install blackhole-2ch"
    skip "BlackHole not installed"
fi

# Check Loopback
if [ -d "/Applications/Loopback.app" ]; then
    pass "Loopback (Rogue Amoeba) installed"
else
    skip "Loopback not installed"
fi

# Check Audio Hijack
if [ -d "/Applications/Audio Hijack.app" ]; then
    pass "Audio Hijack installed"
else
    skip "Audio Hijack not installed"
fi

# ─────────────────────────────────────────────────────────────
section "6. OLLAMA"
# ─────────────────────────────────────────────────────────────

if pgrep -q ollama; then
    MODEL_COUNT=$(ollama list 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')
    pass "Ollama running with $MODEL_COUNT models"

    # Verify codestral is gone
    if ollama list 2>/dev/null | grep -q codestral; then
        echo "  Removing codestral (non-production license)..."
        ollama rm codestral:latest 2>/dev/null
        pass "codestral removed"
    else
        skip "codestral already removed"
    fi

    # Check Gabriel model
    if ollama list 2>/dev/null | grep -q "noizy-gabriel-mind"; then
        pass "noizy-gabriel-mind model available"
    else
        fail "noizy-gabriel-mind model not found"
    fi
else
    fail "Ollama not running"
    echo "  Start with: ollama serve &"
fi

# ─────────────────────────────────────────────────────────────
section "7. VOICE PIPELINE"
# ─────────────────────────────────────────────────────────────

PIPELINE_DIR="$HOME/voice-pipeline"
if [ ! -d "$PIPELINE_DIR" ]; then
    PIPELINE_DIR=$(find "$HOME" -maxdepth 2 -type d -name "voice-pipeline" 2>/dev/null | head -1)
fi

if [ -n "$PIPELINE_DIR" ] && [ -d "$PIPELINE_DIR" ]; then
    pass "Voice pipeline directory found: $PIPELINE_DIR"

    # Check whisper
    if command -v whisper &>/dev/null; then
        pass "Whisper installed ($(which whisper))"
    else
        info "Whisper not in PATH — may need: pip install openai-whisper"
    fi
else
    skip "Voice pipeline directory not found"
fi

# Check TTS
if command -v say &>/dev/null; then
    pass "macOS TTS (say) available"
    say -v "?" 2>/dev/null | head -5 | while read line; do info "Voice: $line"; done
else
    fail "macOS TTS not available"
fi

# ─────────────────────────────────────────────────────────────
section "8. LOGIC PRO"
# ─────────────────────────────────────────────────────────────

if [ -d "/Applications/Logic Pro.app" ]; then
    pass "Logic Pro installed"
else
    fail "Logic Pro not found"
fi

# ─────────────────────────────────────────────────────────────
section "9. LICENSE FILE"
# ─────────────────────────────────────────────────────────────

REPO_DIR="$HOME"
if [ -f "$REPO_DIR/LICENSE" ] || [ -f "$REPO_DIR/LICENSE.md" ]; then
    skip "LICENSE file exists"
else
    cat > "$REPO_DIR/LICENSE" << 'LICEOF'
Copyright (c) 2024-2026 Robert Stephen Plowman / NOIZY.AI

All rights reserved.

This software and associated documentation files (the "Software") are the
proprietary property of Robert Stephen Plowman and NOIZY.AI. No part of
this Software may be reproduced, distributed, or transmitted in any form
or by any means without the prior written permission of the copyright holder.

For licensing inquiries, contact: rsp@noizy.ai
LICEOF
    pass "LICENSE file created (All Rights Reserved)"
fi

# ─────────────────────────────────────────────────────────────
section "SUMMARY"
# ─────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Fixed: $FIXES${NC}  |  ${RED}Failed: $FAILS${NC}  |  ${YELLOW}Skipped: $SKIPPED${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $FAILS -gt 0 ]; then
    echo -e "${RED}${BOLD}BLOCKERS REMAINING:${NC}"
    echo ""
    if [ "$APOLLO_FOUND" = false ]; then
        echo "  🔴 PLUG IN MICKY-P (Apollo Twin) — Thunderbolt ports 2-6 are free"
    fi
    echo ""
    echo "Fix blockers, then re-run: bash fix-everything.sh"
    echo ""
fi

if [ "$APOLLO_FOUND" = true ] && [ $FAILS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎙️  ALL CLEAR — READY TO RECORD GABRIEL${NC}"
    echo ""
    echo "  Next steps:"
    echo "  1. Open Logic Pro → New project → Audio track"
    echo "  2. Set input to Apollo Twin"
    echo "  3. Open Audio Hijack → Start capture session"
    echo "  4. Run Gabriel TTS pipeline"
    echo "  5. HIT RECORD"
    echo ""
fi

echo "GORUNFREE."
