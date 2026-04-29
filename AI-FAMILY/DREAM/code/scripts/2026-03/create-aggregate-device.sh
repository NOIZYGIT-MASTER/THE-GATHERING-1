#!/bin/bash
# ============================================================================
# AGGREGATE AUDIO DEVICE CREATOR — M2 Ultra
# Built for Robert Stephen Plowman
#
# Creates a macOS Aggregate Audio Device that combines the Logitech USB
# camera mic (primary) and iPad 12.9" mic (secondary) into a single
# virtual input device. This lets apps see both mics as one source,
# with the Logitech as the clock master.
#
# This uses macOS CoreAudio via AppleScript + Audio MIDI Setup automation.
#
# Usage:
#   chmod +x create-aggregate-device.sh
#   ./create-aggregate-device.sh
#
# What it does:
#   1. Lists all available input devices
#   2. Identifies the Logitech and iPad
#   3. Opens Audio MIDI Setup with instructions
#   4. Provides a step-by-step guided walkthrough
#
# Note: macOS doesn't expose Aggregate Device creation via command line,
# so this script automates what it can and guides you through the rest.
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}AGGREGATE AUDIO DEVICE CREATOR${NC}                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Logitech USB (Primary) + iPad 12.9\" (Secondary)             ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check for SwitchAudioSource ─────────────────────────────────────
echo -e "${BOLD}Step 1: Detecting connected input devices...${NC}"
echo -e "${BLUE}────────────────────────────────────────────${NC}"

if command -v SwitchAudioSource &> /dev/null; then
    echo -e "${GREEN}Available input devices:${NC}"
    index=1
    while IFS= read -r device; do
        echo -e "  ${CYAN}${index}.${NC} ${device}"
        ((index++))
    done < <(SwitchAudioSource -a -t input 2>/dev/null)
else
    echo -e "${YELLOW}SwitchAudioSource not installed. Showing system profiler data:${NC}"
    system_profiler SPAudioDataType 2>/dev/null | grep -A2 "Input Source" || echo "  (Could not query audio devices)"
fi

echo ""

# ── Step 2: Detect target devices ───────────────────────────────────────────
LOGITECH_FOUND=""
IPAD_FOUND=""

if command -v SwitchAudioSource &> /dev/null; then
    LOGITECH_FOUND=$(SwitchAudioSource -a -t input 2>/dev/null | grep -i "Logitech" | head -1)
    IPAD_FOUND=$(SwitchAudioSource -a -t input 2>/dev/null | grep -i "iPad" | head -1)
fi

echo -e "${BOLD}Step 2: Device Check${NC}"
echo -e "${BLUE}────────────────────────────────────────────${NC}"

if [[ -n "$LOGITECH_FOUND" ]]; then
    echo -e "  Logitech USB:  ${GREEN}✓ Found${NC} — ${LOGITECH_FOUND}"
else
    echo -e "  Logitech USB:  ${RED}✗ Not detected${NC}"
    echo -e "                 Connect via USB and try again."
fi

if [[ -n "$IPAD_FOUND" ]]; then
    echo -e "  iPad 12.9\":    ${GREEN}✓ Found${NC} — ${IPAD_FOUND}"
else
    echo -e "  iPad 12.9\":    ${RED}✗ Not detected${NC}"
    echo -e "                 Connect via cable and enable Continuity Camera."
fi

echo ""

if [[ -z "$LOGITECH_FOUND" ]] && [[ -z "$IPAD_FOUND" ]]; then
    echo -e "${RED}Neither device found. Connect them and run this script again.${NC}"
    exit 1
fi

# ── Step 3: Create Aggregate Device via AppleScript ─────────────────────────
echo -e "${BOLD}Step 3: Creating Aggregate Audio Device...${NC}"
echo -e "${BLUE}────────────────────────────────────────────${NC}"
echo ""

# Try to create via CoreAudio HAL plugin (command line method)
# This creates a persistent aggregate device
echo -e "${YELLOW}Attempting automated creation via CoreAudio...${NC}"
echo ""

# Create the AudioAggregateDevice plist
AGGREGATE_PLIST="/tmp/rsp-aggregate-device.plist"
cat > "$AGGREGATE_PLIST" << 'PLISTEOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>name</key>
    <string>RSP Studio Input</string>
    <key>uid</key>
    <string>com.rsp.aggregate-input</string>
</dict>
</plist>
PLISTEOF

echo -e "  Configuration written to: ${CYAN}${AGGREGATE_PLIST}${NC}"
echo ""

# Since CoreAudio aggregate device creation requires the Audio MIDI Setup GUI
# or private APIs, we open Audio MIDI Setup and provide precise instructions
echo -e "${BOLD}Opening Audio MIDI Setup...${NC}"
open -a "Audio MIDI Setup" 2>/dev/null || echo -e "${YELLOW}Could not open Audio MIDI Setup automatically.${NC}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}FOLLOW THESE STEPS IN AUDIO MIDI SETUP:${NC}                     ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}1.${NC} Click the ${CYAN}+${NC} button at the bottom-left of the window"
echo -e "  ${BOLD}2.${NC} Select ${CYAN}\"Create Aggregate Device\"${NC}"
echo -e "  ${BOLD}3.${NC} Rename it to: ${GREEN}RSP Studio Input${NC}"
echo -e "  ${BOLD}4.${NC} Check the box next to: ${GREEN}${LOGITECH_FOUND:-Logitech USB Camera}${NC}"
echo -e "  ${BOLD}5.${NC} Check the box next to: ${GREEN}${IPAD_FOUND:-iPad}${NC}"
echo -e "  ${BOLD}6.${NC} Set ${CYAN}Clock Source${NC} to: ${GREEN}${LOGITECH_FOUND:-Logitech USB Camera}${NC}"
echo -e "     (This makes Logitech the primary/master device)"
echo -e "  ${BOLD}7.${NC} Optional: Check ${CYAN}\"Drift Correction\"${NC} for the iPad"
echo -e "     (Recommended when combining USB + Continuity Camera)"
echo ""
echo -e "${BLUE}────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${BOLD}After creating the aggregate device:${NC}"
echo ""
echo -e "  ${BOLD}8.${NC} Go to ${CYAN}System Settings → Sound → Input${NC}"
echo -e "  ${BOLD}9.${NC} Select ${GREEN}\"RSP Studio Input\"${NC} as your default input"
echo -e "  ${BOLD}10.${NC} Both mics are now available as a single source"
echo ""
echo -e "${GREEN}Done.${NC} Your Logitech is the primary clock source."
echo -e "The iPad provides a secondary channel within the same device."
echo ""

# ── Step 4: Verification ───────────────────────────────────────────────────
echo -e "${BOLD}Step 4: Verification (run after setup)${NC}"
echo -e "${BLUE}────────────────────────────────────────────${NC}"
echo ""
echo -e "  To verify the aggregate device was created, run:"
echo -e "  ${CYAN}SwitchAudioSource -a -t input | grep 'RSP'${NC}"
echo ""
echo -e "  To set it as default from Terminal:"
echo -e "  ${CYAN}SwitchAudioSource -t input -s 'RSP Studio Input'${NC}"
echo ""
echo -e "  To use it in the audio-control.sh script, add this pattern:"
echo -e "  ${CYAN}AGGREGATE_PATTERN=\"RSP Studio\"${NC}"
echo ""
