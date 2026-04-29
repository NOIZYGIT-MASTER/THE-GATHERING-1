#!/bin/bash
# ============================================================================
#  NOIZY — iPhone 15 Pro Max → Claude Cowork
#  Master Setup Script for M2 Ultra (GOD.local)
# ============================================================================
set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       NOIZY — iPhone 15 Pro Max → Claude Cowork Setup      ║"
echo "║                    M2 Ultra (GOD.local)                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check AirPlay ──
echo "━━━ Step 1: AirPlay Receiver ━━━"
if system_profiler SPAudioDataType 2>/dev/null | grep -qi "airplay\|iphone"; then
    echo "✅ AirPlay/iPhone audio device detected"
else
    echo "⚠️  No iPhone audio device detected yet"
    echo "   Ensure AirPlay Receiver is ON:"
    echo "   System Settings → General → AirDrop & Handoff → AirPlay Receiver"
fi
echo ""

# ── Step 2: Check Audio Hijack ──
echo "━━━ Step 2: Audio Hijack ━━━"
if pgrep -x "Audio Hijack" > /dev/null; then
    echo "✅ Audio Hijack is running"
else
    echo "   Starting Audio Hijack..."
    open -a "Audio Hijack"
    sleep 3
    echo "✅ Audio Hijack launched"
fi
echo ""

# ── Step 3: Check for virtual device ──
echo "━━━ Step 3: Virtual Device ━━━"
if system_profiler SPAudioDataType 2>/dev/null | grep -q "CLAUDE-COWORK"; then
    echo "✅ CLAUDE-COWORK virtual device exists"
else
    echo "⚠️  CLAUDE-COWORK virtual device not found"
    echo ""
    echo "   Option A — Audio Hijack (built-in):"
    echo "     Preferences → Virtual Devices → [+] → Name: CLAUDE-COWORK"
    echo ""
    echo "   Option B — Loopback:"
    if [ -d "/Applications/Loopback.app" ]; then
        echo "     Loopback is installed. Opening..."
        open -a "Loopback"
        echo "     Create device: CLAUDE-COWORK (Mono, 48kHz)"
    else
        echo "     Loopback not installed. Use Audio Hijack method above."
    fi
fi
echo ""

# ── Step 4: Ensure RECORDINGS dir exists ──
echo "━━━ Step 4: Recordings Directory ━━━"
mkdir -p "$HOME/Desktop/CLAUDE TODAY/RECORDINGS"
echo "✅ ~/Desktop/CLAUDE TODAY/RECORDINGS/ ready"
echo ""

# ── Step 5: Verify existing devices ──
echo "━━━ Step 5: Current Audio Devices ━━━"
system_profiler SPAudioDataType 2>/dev/null | grep -E "^\s{8}\S" | sed 's/://g' | sed 's/^        /   • /'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🎙️  READY. On your iPhone 15 Pro Max:"
echo ""
echo "     1. Open Control Center"
echo "     2. Tap AirPlay / Screen Mirroring"
echo "     3. Select 'GOD' (M2 Ultra)"
echo "     4. Start speaking — audio flows to Claude Cowork"
echo ""
echo "  Signal chain:"
echo "     iPhone → AirPlay → Audio Hijack → CLAUDE-COWORK → Cowork"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
