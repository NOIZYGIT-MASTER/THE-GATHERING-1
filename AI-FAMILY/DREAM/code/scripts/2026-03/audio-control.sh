#!/bin/bash
# ============================================================================
# AUDIO CONTROL TOOLKIT FOR M2 ULTRA
# Built for Robert Stephen Plowman
#
# Purpose: Manage audio input devices on macOS — mute all mics by default,
#          set Logitech USB 1080p as primary mic, iPad 12.9" as secondary.
#
# Requirements:
#   - macOS Ventura or later (M2 Ultra)
#   - Homebrew (for SwitchAudioSource): /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
#   - SwitchAudioSource: brew install switchaudio-osx
#
# Usage:
#   chmod +x audio-control.sh
#   ./audio-control.sh              # Interactive menu
#   ./audio-control.sh --mute-all   # Mute all inputs
#   ./audio-control.sh --logitech   # Switch to Logitech mic
#   ./audio-control.sh --ipad       # Switch to iPad mic
#   ./audio-control.sh --status     # Show current audio status
#   ./audio-control.sh --setup      # First-time setup (install deps + configure)
#   ./audio-control.sh --boot       # Run at login (mute all, set Logitech ready)
# ============================================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
# Adjust these strings to match your exact device names as shown by:
#   SwitchAudioSource -a -t input
# Run './audio-control.sh --list' to see all available input devices.

LOGITECH_PATTERN="Logitech"       # Partial match for Logitech USB camera mic
IPAD_PATTERN="iPad"               # Partial match for iPad audio input
MACBOOK_MIC_PATTERN="MacBook"     # Built-in mic (to mute/disable)

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helper Functions ───────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}AUDIO CONTROL TOOLKIT${NC} — M2 Ultra                       ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  Robert Stephen Plowman                                 ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_dependencies() {
    if ! command -v SwitchAudioSource &> /dev/null; then
        echo -e "${RED}✗ SwitchAudioSource not found.${NC}"
        echo -e "  Install it with: ${YELLOW}brew install switchaudio-osx${NC}"
        echo ""
        echo -e "  If Homebrew isn't installed yet:"
        echo -e "  ${YELLOW}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
        return 1
    fi
    return 0
}

# Find a device by partial name match (case-insensitive)
find_device() {
    local pattern="$1"
    SwitchAudioSource -a -t input 2>/dev/null | grep -i "$pattern" | head -1
}

# Get the current input device
get_current_input() {
    SwitchAudioSource -c -t input 2>/dev/null
}

# Get current input volume (0-100)
get_input_volume() {
    osascript -e 'input volume of (get volume settings)' 2>/dev/null
}

# Set input volume
set_input_volume() {
    local vol="$1"
    osascript -e "set volume input volume $vol" 2>/dev/null
}

# ── Core Commands ──────────────────────────────────────────────────────────

cmd_list() {
    echo -e "${BOLD}Available Input Devices:${NC}"
    echo -e "${BLUE}────────────────────────────────────────${NC}"

    local current
    current=$(get_current_input)
    local volume
    volume=$(get_input_volume)

    local index=1
    while IFS= read -r device; do
        if [[ "$device" == "$current" ]]; then
            echo -e "  ${GREEN}▶ ${index}. ${device}${NC} ${YELLOW}[ACTIVE — Volume: ${volume}%]${NC}"
        else
            echo -e "  ${NC}  ${index}. ${device}${NC}"
        fi
        ((index++))
    done < <(SwitchAudioSource -a -t input 2>/dev/null)

    echo -e "${BLUE}────────────────────────────────────────${NC}"
    echo ""
}

cmd_status() {
    print_header

    local current
    current=$(get_current_input)
    local volume
    volume=$(get_input_volume)

    echo -e "${BOLD}Current Audio Input Status:${NC}"
    echo -e "  Device:  ${GREEN}${current}${NC}"
    echo -e "  Volume:  ${YELLOW}${volume}%${NC}"

    if [[ "$volume" -eq 0 ]]; then
        echo -e "  Status:  ${RED}MUTED${NC}"
    else
        echo -e "  Status:  ${GREEN}LIVE${NC}"
    fi
    echo ""

    cmd_list

    # Check for expected devices
    echo -e "${BOLD}Device Check:${NC}"

    local logitech
    logitech=$(find_device "$LOGITECH_PATTERN")
    if [[ -n "$logitech" ]]; then
        echo -e "  Logitech USB:  ${GREEN}✓ Connected${NC} — ${logitech}"
    else
        echo -e "  Logitech USB:  ${RED}✗ Not found${NC} — check USB connection"
    fi

    local ipad
    ipad=$(find_device "$IPAD_PATTERN")
    if [[ -n "$ipad" ]]; then
        echo -e "  iPad 12.9\":    ${GREEN}✓ Connected${NC} — ${ipad}"
    else
        echo -e "  iPad 12.9\":    ${RED}✗ Not found${NC} — check cable / Continuity Camera"
    fi
    echo ""
}

cmd_mute_all() {
    echo -e "${YELLOW}Muting all microphone input...${NC}"
    set_input_volume 0
    echo -e "${GREEN}✓ All microphones muted${NC} (input volume set to 0%)"
    echo -e "  Current device: $(get_current_input)"
    echo ""
}

cmd_unmute() {
    local vol="${1:-75}"
    echo -e "${YELLOW}Unmuting microphone input to ${vol}%...${NC}"
    set_input_volume "$vol"
    echo -e "${GREEN}✓ Microphone unmuted${NC} (input volume set to ${vol}%)"
    echo -e "  Current device: $(get_current_input)"
    echo ""
}

cmd_switch_logitech() {
    local device
    device=$(find_device "$LOGITECH_PATTERN")

    if [[ -z "$device" ]]; then
        echo -e "${RED}✗ Logitech USB microphone not found.${NC}"
        echo -e "  Check that the Logitech 1080p camera is connected via USB."
        echo -e "  Run '${YELLOW}./audio-control.sh --list${NC}' to see available devices."
        return 1
    fi

    SwitchAudioSource -t input -s "$device"
    echo -e "${GREEN}✓ Switched to Logitech:${NC} ${device}"
    echo -e "  Volume: $(get_input_volume)%"
    echo ""
}

cmd_switch_ipad() {
    local device
    device=$(find_device "$IPAD_PATTERN")

    if [[ -z "$device" ]]; then
        echo -e "${RED}✗ iPad microphone not found.${NC}"
        echo -e "  Check that the iPad 12.9\" is connected via USB/Lightning."
        echo -e "  Ensure Continuity Camera is enabled in System Settings."
        echo -e "  Run '${YELLOW}./audio-control.sh --list${NC}' to see available devices."
        return 1
    fi

    SwitchAudioSource -t input -s "$device"
    echo -e "${GREEN}✓ Switched to iPad:${NC} ${device}"
    echo -e "  Volume: $(get_input_volume)%"
    echo ""
}

cmd_boot() {
    # This is the "login" profile: mute everything, set Logitech as default
    echo -e "${BOLD}Boot Configuration:${NC} Mute all → Set Logitech as default"
    echo -e "${BLUE}────────────────────────────────────────${NC}"

    # Step 1: Mute all
    set_input_volume 0
    echo -e "  ${GREEN}✓${NC} Input volume set to 0% (all mics muted)"

    # Step 2: Set Logitech as default input
    local device
    device=$(find_device "$LOGITECH_PATTERN")
    if [[ -n "$device" ]]; then
        SwitchAudioSource -t input -s "$device"
        echo -e "  ${GREEN}✓${NC} Default input set to: ${device}"
    else
        echo -e "  ${YELLOW}⚠${NC} Logitech not detected — keeping current input device"
        echo -e "    Current: $(get_current_input)"
    fi

    echo -e "${BLUE}────────────────────────────────────────${NC}"
    echo -e "${GREEN}Boot config applied.${NC} All mics muted. Logitech ready when you unmute."
    echo -e "  To go live: ${YELLOW}./audio-control.sh --unmute${NC}"
    echo ""
}

cmd_setup() {
    print_header
    echo -e "${BOLD}First-Time Setup${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""

    # Check Homebrew
    echo -e "${BOLD}1. Checking Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        echo -e "   ${GREEN}✓ Homebrew installed${NC}"
    else
        echo -e "   ${RED}✗ Homebrew not found${NC}"
        echo -e "   Install: ${YELLOW}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
        echo ""
        echo -e "   Run this script again after installing Homebrew."
        return 1
    fi

    # Check/install SwitchAudioSource
    echo -e "${BOLD}2. Checking SwitchAudioSource...${NC}"
    if command -v SwitchAudioSource &> /dev/null; then
        echo -e "   ${GREEN}✓ SwitchAudioSource installed${NC}"
    else
        echo -e "   ${YELLOW}Installing SwitchAudioSource...${NC}"
        brew install switchaudio-osx
        echo -e "   ${GREEN}✓ SwitchAudioSource installed${NC}"
    fi

    echo ""
    echo -e "${BOLD}3. Detecting audio devices...${NC}"
    cmd_list

    # Create Launch Agent for boot config
    echo -e "${BOLD}4. Setting up login auto-configuration...${NC}"
    local plist_dir="$HOME/Library/LaunchAgents"
    local plist_file="$plist_dir/com.rsp.audio-control.plist"
    local script_path
    script_path="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

    read -p "   Install auto-mute on login? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p "$plist_dir"
        cat > "$plist_file" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.rsp.audio-control</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${script_path}</string>
        <string>--boot</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/audio-control.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/audio-control-error.log</string>
</dict>
</plist>
PLIST
        launchctl load "$plist_file" 2>/dev/null || true
        echo -e "   ${GREEN}✓ Launch Agent installed${NC}"
        echo -e "   Mics will auto-mute on every login."
        echo -e "   Logitech will be set as default input."
        echo -e "   Log: /tmp/audio-control.log"
    else
        echo -e "   ${YELLOW}Skipped.${NC} You can run '${CYAN}./audio-control.sh --boot${NC}' manually."
    fi

    echo ""
    echo -e "${GREEN}Setup complete.${NC}"
    echo -e "Run '${CYAN}./audio-control.sh${NC}' for the interactive menu."
    echo ""
}

cmd_interactive() {
    print_header

    if ! check_dependencies; then
        echo -e "Run '${CYAN}./audio-control.sh --setup${NC}' for guided installation."
        exit 1
    fi

    # Show current status
    local current
    current=$(get_current_input)
    local volume
    volume=$(get_input_volume)
    local status_icon

    if [[ "$volume" -eq 0 ]]; then
        status_icon="${RED}MUTED${NC}"
    else
        status_icon="${GREEN}LIVE (${volume}%)${NC}"
    fi

    echo -e "  Current: ${BOLD}${current}${NC} — ${status_icon}"
    echo ""
    echo -e "${BOLD}  Commands:${NC}"
    echo -e "  ${CYAN}1${NC}  Mute all microphones"
    echo -e "  ${CYAN}2${NC}  Switch to Logitech USB (primary)"
    echo -e "  ${CYAN}3${NC}  Switch to iPad 12.9\" (secondary)"
    echo -e "  ${CYAN}4${NC}  Unmute (set volume to 75%)"
    echo -e "  ${CYAN}5${NC}  Show full status"
    echo -e "  ${CYAN}6${NC}  List all input devices"
    echo -e "  ${CYAN}7${NC}  Boot config (mute all + set Logitech)"
    echo -e "  ${CYAN}0${NC}  Exit"
    echo ""

    read -p "  Select [0-7]: " -n 1 -r choice
    echo ""
    echo ""

    case "$choice" in
        1) cmd_mute_all ;;
        2) cmd_switch_logitech && cmd_unmute 75 ;;
        3) cmd_switch_ipad && cmd_unmute 75 ;;
        4) cmd_unmute 75 ;;
        5) cmd_status ;;
        6) cmd_list ;;
        7) cmd_boot ;;
        0) echo -e "${GREEN}Done.${NC}" ; exit 0 ;;
        *) echo -e "${RED}Invalid selection.${NC}" ;;
    esac
}

# ── Keyboard Shortcut Helper ──────────────────────────────────────────────

cmd_shortcuts_info() {
    print_header
    echo -e "${BOLD}Keyboard Shortcut Setup (Optional)${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
    echo -e "To create global hotkeys for mute/unmute/switch, you can use"
    echo -e "macOS Automator or a tool like ${CYAN}Hammerspoon${NC} (free, powerful)."
    echo ""
    echo -e "${BOLD}Hammerspoon Example (~/.hammerspoon/init.lua):${NC}"
    echo ""
    echo -e "${YELLOW}-- Cmd+Shift+M = Mute all mics${NC}"
    echo 'hs.hotkey.bind({"cmd", "shift"}, "M", function()'
    echo '    hs.audiodevice.defaultInputDevice():setInputMuted(true)'
    echo '    hs.alert.show("🔇 Mics Muted")'
    echo 'end)'
    echo ""
    echo -e "${YELLOW}-- Cmd+Shift+U = Unmute${NC}"
    echo 'hs.hotkey.bind({"cmd", "shift"}, "U", function()'
    echo '    hs.audiodevice.defaultInputDevice():setInputMuted(false)'
    echo '    hs.audiodevice.defaultInputDevice():setInputVolume(75)'
    echo '    hs.alert.show("🎙️ Mic Live")'
    echo 'end)'
    echo ""
    echo -e "Install Hammerspoon: ${CYAN}brew install --cask hammerspoon${NC}"
    echo ""
}

# ── Entry Point ────────────────────────────────────────────────────────────

case "${1:-}" in
    --mute-all|--mute)    check_dependencies && cmd_mute_all ;;
    --unmute)             check_dependencies && cmd_unmute "${2:-75}" ;;
    --logitech|--primary) check_dependencies && cmd_switch_logitech ;;
    --ipad|--secondary)   check_dependencies && cmd_switch_ipad ;;
    --status)             check_dependencies && cmd_status ;;
    --list)               check_dependencies && cmd_list ;;
    --boot)               check_dependencies && cmd_boot ;;
    --setup)              cmd_setup ;;
    --shortcuts)          cmd_shortcuts_info ;;
    --help|-h)
        print_header
        echo -e "${BOLD}Usage:${NC} ./audio-control.sh [command]"
        echo ""
        echo -e "  ${CYAN}(no args)${NC}      Interactive menu"
        echo -e "  ${CYAN}--setup${NC}        First-time install (deps + login agent)"
        echo -e "  ${CYAN}--boot${NC}         Login profile: mute all, set Logitech"
        echo -e "  ${CYAN}--mute-all${NC}     Mute all microphone input"
        echo -e "  ${CYAN}--unmute [vol]${NC} Unmute to volume (default 75%)"
        echo -e "  ${CYAN}--logitech${NC}     Switch to Logitech USB mic"
        echo -e "  ${CYAN}--ipad${NC}         Switch to iPad 12.9\" mic"
        echo -e "  ${CYAN}--status${NC}       Show current audio config"
        echo -e "  ${CYAN}--list${NC}         List all input devices"
        echo -e "  ${CYAN}--shortcuts${NC}    Keyboard shortcut setup guide"
        echo -e "  ${CYAN}--help${NC}         This message"
        echo ""
        ;;
    *)
        cmd_interactive
        ;;
esac
