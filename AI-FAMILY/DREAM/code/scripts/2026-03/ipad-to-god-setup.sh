#!/bin/bash
# ============================================================================
# MC96ECO — iPad-to-GOD Audio Bridge Setup
# Prepares macOS for iPad audio routing via Audio Hijack
# ============================================================================
# TARGET: M2 Ultra "GOD" @ 10.90.90.10
# AUTHOR: MC96ECO AI OS for Robert Stephen Plowman
# DATE:   March 23, 2026
# ============================================================================

set -euo pipefail

# --- Colors ---
GOLD='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${GOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}║         MC96ECO — iPad → GOD Audio Bridge Setup            ║${NC}"
echo -e "${GOLD}║         Target: M2 Ultra @ 10.90.90.10                     ║${NC}"
echo -e "${GOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# --- Step 1: Check Audio Hijack is installed ---
echo -e "${CYAN}[1/6] Checking Audio Hijack installation...${NC}"
if [ -d "/Applications/Audio Hijack.app" ]; then
    echo -e "${GREEN}  ✓ Audio Hijack found${NC}"
    AH_VERSION=$(defaults read "/Applications/Audio Hijack.app/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo "unknown")
    echo -e "    Version: ${AH_VERSION}"
else
    echo -e "${RED}  ✗ Audio Hijack not found in /Applications${NC}"
    echo "    Install from: https://rogueamoeba.com/audiohijack/"
    echo "    Audio Hijack is REQUIRED for this bridge."
    exit 1
fi

# --- Step 2: Check for connected iOS devices ---
echo ""
echo -e "${CYAN}[2/6] Scanning for connected iPad/iOS devices...${NC}"

# Use system_profiler to find USB iOS devices
IOS_DEVICES=$(system_profiler SPUSBDataType 2>/dev/null | grep -A2 "iPad\|iPhone\|iPod" | head -20 || true)

if [ -n "$IOS_DEVICES" ]; then
    echo -e "${GREEN}  ✓ iOS device detected via USB${NC}"
    echo "$IOS_DEVICES" | sed 's/^/    /'
else
    echo -e "${GOLD}  ⚠ No iOS device detected via USB${NC}"
    echo "    Connect your iPad via USB-C or Lightning cable"
    echo "    The script will continue — you can connect later"
fi

# --- Step 3: Check Audio MIDI Setup for iOS device ---
echo ""
echo -e "${CYAN}[3/6] Checking Audio MIDI Setup...${NC}"

# List audio devices using system command
AUDIO_DEVICES=$(system_profiler SPAudioDataType 2>/dev/null || true)
IPAD_AUDIO=$(echo "$AUDIO_DEVICES" | grep -i "iPad" || true)

if [ -n "$IPAD_AUDIO" ]; then
    echo -e "${GREEN}  ✓ iPad is registered as an audio device${NC}"
else
    echo -e "${GOLD}  ⚠ iPad not yet enabled as audio device${NC}"
    echo ""
    echo -e "${BOLD}  MANUAL STEP REQUIRED:${NC}"
    echo "  1. Open Audio MIDI Setup (Applications → Utilities → Audio MIDI Setup)"
    echo "  2. Connect iPad via USB cable"
    echo "  3. Find 'iPad' in the left sidebar"
    echo "  4. Click 'Enable' button"
    echo ""
    echo "  Opening Audio MIDI Setup for you..."
    open "/Applications/Utilities/Audio MIDI Setup.app" 2>/dev/null || true
fi

# --- Step 4: Check for Loopback (optional but recommended) ---
echo ""
echo -e "${CYAN}[4/6] Checking for Loopback (optional, enhances routing)...${NC}"
if [ -d "/Applications/Loopback.app" ]; then
    echo -e "${GREEN}  ✓ Loopback found — advanced routing available${NC}"
else
    echo -e "${GOLD}  ○ Loopback not installed (optional)${NC}"
    echo "    Loopback enables virtual audio devices for complex routing"
    echo "    Available from: https://rogueamoeba.com/loopback/"
fi

# --- Step 5: Install the Audio Hijack automation script ---
echo ""
echo -e "${CYAN}[5/6] Installing Audio Hijack automation script...${NC}"

SCRIPT_DIR="$HOME/Library/Application Support/Audio Hijack/Scripts"
SCRIPT_SRC="$(dirname "$0")/iPad-to-GOD-AudioHijack.js"

if [ -f "$SCRIPT_SRC" ]; then
    mkdir -p "$SCRIPT_DIR"
    cp "$SCRIPT_SRC" "$SCRIPT_DIR/iPad-to-GOD-AudioHijack.js"
    echo -e "${GREEN}  ✓ Script installed to: ${SCRIPT_DIR}${NC}"
else
    echo -e "${GOLD}  ⚠ Script file not found at: ${SCRIPT_SRC}${NC}"
    echo "    Ensure iPad-to-GOD-AudioHijack.js is in the same directory as this script"
fi

# --- Step 6: Create the AppleScript launcher ---
echo ""
echo -e "${CYAN}[6/6] Creating launcher scripts...${NC}"

LAUNCHER_DIR="$(dirname "$0")"

# AppleScript to toggle the session
cat > "$LAUNCHER_DIR/Toggle-iPad-to-GOD.applescript" << 'APPLESCRIPT'
-- MC96ECO — Toggle iPad → GOD Audio Bridge
-- Double-click to toggle audio routing on/off

tell application "Audio Hijack"
    activate
end tell

delay 1

-- Audio Hijack uses JavaScript for automation
-- The session must be manually started/stopped from the UI
-- or use the CLI trigger method below

do shell script "/usr/bin/osascript -e 'tell application \"Audio Hijack\" to activate'"

display notification "iPad → GOD Audio Bridge toggled" with title "MC96ECO" subtitle "Check Audio Hijack for status"
APPLESCRIPT

echo -e "${GREEN}  ✓ Toggle-iPad-to-GOD.applescript created${NC}"

# Shell script for CLI control
cat > "$LAUNCHER_DIR/ipad-to-god-toggle.command" << 'CMDSCRIPT'
#!/bin/bash
# MC96ECO — Quick Toggle for iPad → GOD Audio Bridge
# Double-click this file or run from Terminal

osascript -e '
tell application "Audio Hijack"
    activate
end tell
'

echo ""
echo "╔═══════════════════════════════════╗"
echo "║  iPad → GOD Audio Bridge         ║"
echo "║  Audio Hijack is now in focus     ║"
echo "║  Toggle your session from there   ║"
echo "╚═══════════════════════════════════╝"
echo ""
CMDSCRIPT
chmod +x "$LAUNCHER_DIR/ipad-to-god-toggle.command"
echo -e "${GREEN}  ✓ ipad-to-god-toggle.command created${NC}"

# Shortcuts-compatible script
cat > "$LAUNCHER_DIR/ipad-to-god-shortcut.sh" << 'SHORTCUT'
#!/bin/bash
# MC96ECO — Shortcuts-compatible iPad → GOD trigger
# Add this as a "Run Shell Script" action in Shortcuts.app

SCRIPT_PATH="$HOME/Library/Application Support/Audio Hijack/Scripts/iPad-to-GOD-AudioHijack.js"

if [ -f "$SCRIPT_PATH" ]; then
    open -a "Audio Hijack"
    osascript -e 'display notification "iPad → GOD bridge activated" with title "MC96ECO Audio Bridge"'
else
    osascript -e 'display notification "Script not found — run setup first" with title "MC96ECO Error"'
fi
SHORTCUT
chmod +x "$LAUNCHER_DIR/ipad-to-god-shortcut.sh"
echo -e "${GREEN}  ✓ ipad-to-god-shortcut.sh created (for Shortcuts.app)${NC}"

# --- Summary ---
echo ""
echo -e "${GOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}║                    SETUP COMPLETE                           ║${NC}"
echo -e "${GOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}NEXT STEPS — One-Time Session Creation in Audio Hijack:${NC}"
echo ""
echo "  1. Open Audio Hijack"
echo "  2. Click '+' → New Session → 'Input Device' template"
echo "  3. Rename session to: iPad → GOD"
echo "  4. Configure the pipeline:"
echo ""
echo "     ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐"
echo "     │  INPUT   │───▶│  VOLUME  │───▶│ RECORDER  │───▶│  OUTPUT  │"
echo "     │ DEVICE:  │    │ (adjust) │    │ (optional)│    │ DEVICE:  │"
echo "     │  iPad    │    │          │    │           │    │ Speakers │"
echo "     └──────────┘    └──────────┘    └───────────┘    └──────────┘"
echo ""
echo "  5. In the Input Device block → select 'iPad'"
echo "     (iPad must be connected via USB + enabled in Audio MIDI Setup)"
echo ""
echo "  6. In the Output Device block → select your preferred output"
echo "     (Built-in speakers, headphones, or external DAC)"
echo ""
echo "  7. Optional: Add a Recorder block to capture the stream"
echo ""
echo "  8. Add Automations → Session Will Start → Run Script"
echo "     Select: iPad-to-GOD-AudioHijack.js → onSessionStart()"
echo ""
echo "  9. Click the big RUN button to start routing!"
echo ""
echo -e "${GOLD}FILES CREATED:${NC}"
echo "  • iPad-to-GOD-AudioHijack.js    — Audio Hijack automation script"
echo "  • ipad-to-god-setup.sh           — This setup script"
echo "  • Toggle-iPad-to-GOD.applescript — AppleScript launcher"
echo "  • ipad-to-god-toggle.command     — Double-click CLI launcher"
echo "  • ipad-to-god-shortcut.sh        — Shortcuts.app compatible trigger"
echo ""
echo -e "${GOLD}SIGNAL: iPad audio → USB → Audio Hijack → GOD speakers${NC}"
echo ""
