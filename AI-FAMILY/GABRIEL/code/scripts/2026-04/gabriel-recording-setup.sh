#!/bin/bash
################################################################################
# GABRIEL VOICE RECORDING PIPELINE SETUP SCRIPT
# NOIZY.AI Project
# Author: Robert Stephen Plowman
# Date: 2026-04-13
#
# Purpose: Pre-flight check for Gabriel voice recording pipeline
# Verifies all hardware, software, and configuration before recording session
#
# Usage: ./gabriel-recording-setup.sh [--check|--fix|--deep|--help]
#   --check   : Run full diagnostics (default)
#   --fix     : Attempt to fix detected issues
#   --deep    : Extended hardware diagnostics
#   --help    : Show this help message
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/gabriel_setup_$(date +%Y%m%d_%H%M%S).log"
FIX_MODE=false
DEEP_MODE=false

# Summary counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$LOG_FILE"
    ((PASSED_CHECKS++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "$LOG_FILE"
    ((FAILED_CHECKS++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
    ((WARNING_CHECKS++))
}

# Check counter
increment_check() {
    ((TOTAL_CHECKS++))
}

print_header() {
    local title="$1"
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}${title}${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
}

print_summary() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}SUMMARY${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo "Total Checks:   $TOTAL_CHECKS" | tee -a "$LOG_FILE"
    echo -e "Passed:         ${GREEN}$PASSED_CHECKS${NC}" | tee -a "$LOG_FILE"
    echo -e "Failed:         ${RED}$FAILED_CHECKS${NC}" | tee -a "$LOG_FILE"
    echo -e "Warnings:       ${YELLOW}$WARNING_CHECKS${NC}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}✓ ALL CHECKS PASSED - READY FOR RECORDING${NC}" | tee -a "$LOG_FILE"
        return 0
    else
        echo -e "${RED}✗ ISSUES DETECTED - PLEASE REVIEW ABOVE${NC}" | tee -a "$LOG_FILE"
        return 1
    fi
}

################################################################################
# HARDWARE CHECKS
################################################################################

check_apollo_twin() {
    increment_check
    print_header "CHECKING APOLLO TWIN (Micky-P)"

    log_info "Checking Thunderbolt device detection..."

    if system_profiler SPThunderboltDataType 2>/dev/null | grep -q -i "apollo\|universal audio"; then
        log_pass "Apollo Twin detected on Thunderbolt"

        # Get detailed info
        APOLLO_INFO=$(system_profiler SPThunderboltDataType | grep -A5 -i "apollo\|universal audio")
        echo "$APOLLO_INFO" >> "$LOG_FILE"

        return 0
    else
        log_fail "Apollo Twin NOT detected on Thunderbolt"
        log_warn "Possible causes: Thunderbolt cable disconnected, device not powered, drivers missing"

        if [ "$FIX_MODE" = true ]; then
            log_info "Attempting to fix: Restarting CoreAudio daemon..."
            sudo killall -9 coreaudiod 2>/dev/null || true
            sleep 3
            log_info "CoreAudio daemon restarted. Please verify Apollo Twin connection."
        fi

        return 1
    fi
}

check_audio_devices() {
    increment_check
    print_header "CHECKING AUDIO DEVICES"

    log_info "Scanning available audio devices..."

    AUDIO_DEVICES=$(system_profiler SPAudioDataType 2>/dev/null)

    # Check for Apollo Twin specifically
    if echo "$AUDIO_DEVICES" | grep -q -i "apollo\|universal audio"; then
        log_pass "Apollo Twin listed in audio devices"
    else
        log_fail "Apollo Twin NOT in audio device list"
    fi

    # Check for output devices
    if echo "$AUDIO_DEVICES" | grep -q -i "output"; then
        log_pass "Audio output devices detected"
    else
        log_fail "No audio output devices detected"
    fi

    # Check for input devices
    if echo "$AUDIO_DEVICES" | grep -q -i "input"; then
        log_pass "Audio input devices detected"
    else
        log_warn "No audio input devices detected (may not need for TTS)"
    fi
}

check_coreaudio() {
    increment_check
    print_header "CHECKING COREAUDIO DAEMON"

    log_info "Checking CoreAudio daemon status..."

    if pgrep -q coreaudiod; then
        log_pass "CoreAudio daemon is running (PID: $(pgrep coreaudiod))"
        return 0
    else
        log_fail "CoreAudio daemon NOT running"

        if [ "$FIX_MODE" = true ]; then
            log_info "Attempting to fix: Restarting CoreAudio..."
            sudo killall -9 coreaudiod 2>/dev/null || true
            sleep 3

            if pgrep -q coreaudiod; then
                log_pass "CoreAudio daemon restarted successfully"
                return 0
            else
                log_fail "Failed to restart CoreAudio daemon"
                return 1
            fi
        fi
    fi
}

check_audio_midi_setup() {
    increment_check
    print_header "CHECKING AUDIO MIDI SETUP"

    log_info "Verifying Audio MIDI Setup configuration..."

    if launchctl list | grep -q "com.apple.audio.AudioMIDIServer"; then
        log_pass "Audio MIDI Setup service is active"
    else
        log_warn "Audio MIDI Setup service status unknown"
    fi

    log_info "Note: Please manually verify Apollo Twin in Audio MIDI Setup app"
    log_info "To check: Open System Preferences → Sound → Apollo Twin selected"
}

################################################################################
# SOFTWARE CHECKS
################################################################################

check_uad_console() {
    increment_check
    print_header "CHECKING UNIVERSAL AUDIO CONSOLE"

    log_info "Looking for Universal Audio Console application..."

    if [ -d "/Applications/Universal Audio/UAD-2.app" ]; then
        log_pass "Universal Audio Console installed"

        if pgrep -f "UAD-2" > /dev/null; then
            log_pass "Universal Audio Console is running"
        else
            log_warn "Universal Audio Console app is not currently running"
            log_info "Recommendation: Open /Applications/Universal\ Audio/UAD-2.app"
        fi
    else
        log_fail "Universal Audio Console NOT installed"
        log_info "Download from: https://www.uaudio.com/downloads"
    fi
}

check_blackhole() {
    increment_check
    print_header "CHECKING BLACKHOLE AUDIO ROUTING"

    log_info "Checking for BlackHole virtual audio device..."

    if [ -d "/Library/Audio/Plug-Ins/HAL/BlackHole.driver" ]; then
        log_pass "BlackHole audio driver installed"
        return 0
    else
        log_warn "BlackHole NOT installed (needed for virtual audio routing)"
        log_info "Install via Homebrew: brew install blackhole-2ch"

        if [ "$FIX_MODE" = true ]; then
            log_info "Installing BlackHole..."
            if brew install blackhole-2ch 2>&1 | tee -a "$LOG_FILE"; then
                log_pass "BlackHole installation completed"
                log_info "Restarting CoreAudio to load new audio driver..."
                sudo killall -9 coreaudiod 2>/dev/null || true
                sleep 3
            else
                log_fail "BlackHole installation failed"
                return 1
            fi
        fi
    fi
}

check_audio_hijack() {
    increment_check
    print_header "CHECKING AUDIO HIJACK"

    log_info "Looking for Audio Hijack application..."

    if [ -d "/Applications/Audio Hijack.app" ]; then
        log_pass "Audio Hijack installed"

        if pgrep -f "Audio Hijack" > /dev/null; then
            log_pass "Audio Hijack is running"
        else
            log_warn "Audio Hijack app is not currently running"
            log_info "Recommendation: Open /Applications/Audio\ Hijack.app"
        fi
    else
        log_warn "Audio Hijack NOT installed (optional, but recommended)"
        log_info "Purchase from: https://www.rogueamoeba.com/audiohijack/"
    fi
}

check_logic_pro() {
    increment_check
    print_header "CHECKING LOGIC PRO"

    log_info "Looking for Logic Pro application..."

    if [ -d "/Applications/Logic Pro.app" ]; then
        log_pass "Logic Pro installed"

        if pgrep -f "Logic" > /dev/null; then
            log_pass "Logic Pro is running"
        else
            log_warn "Logic Pro is not currently running"
            log_info "Recommendation: Open /Applications/Logic\ Pro.app"
        fi
    else
        log_warn "Logic Pro NOT installed"
        log_info "Alternative DAWs: Audacity, GarageBand, or ffmpeg"
    fi
}

################################################################################
# AI & TTS CHECKS
################################################################################

check_ollama() {
    increment_check
    print_header "CHECKING OLLAMA"

    log_info "Checking Ollama service..."

    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        log_pass "Ollama is running and responding to API requests"

        # Get model list
        OLLAMA_MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

        if [ -z "$OLLAMA_MODELS" ]; then
            log_warn "No Ollama models loaded"
        else
            log_pass "Ollama models available:"
            echo "$OLLAMA_MODELS" | head -10 | sed 's/^/  - /'

            # Check for Gemma3 specifically
            if echo "$OLLAMA_MODELS" | grep -q "gemma"; then
                log_pass "Gemma model available (good for text generation)"
            else
                log_warn "Gemma model not found (recommended for Gabriel)"
            fi
        fi

        return 0
    else
        log_fail "Ollama NOT running (API not responding)"
        log_info "Start Ollama with: ollama serve"

        if [ "$FIX_MODE" = true ]; then
            log_info "Attempting to start Ollama..."
            if command -v ollama &> /dev/null; then
                (ollama serve &) 2>/dev/null
                sleep 5
                if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
                    log_pass "Ollama started successfully"
                    return 0
                else
                    log_fail "Failed to start Ollama"
                    return 1
                fi
            else
                log_fail "Ollama command not found in PATH"
                return 1
            fi
        fi
    fi
}

check_tts_engines() {
    increment_check
    print_header "CHECKING TTS ENGINES"

    # Test macOS say command
    if command -v say &> /dev/null; then
        log_pass "macOS 'say' command available (built-in TTS)"

        # Test it
        if echo "Gabriel test" | say -v "Daniel" -r 150 -o /tmp/gabriel_tts_test.m4a 2>/dev/null; then
            log_pass "TTS test successful: generated audio file"
            rm -f /tmp/gabriel_tts_test.m4a
        else
            log_warn "TTS test failed to generate audio"
        fi
    else
        log_fail "macOS 'say' command NOT available"
    fi

    # Check for Coqui TTS
    if command -v docker &> /dev/null; then
        log_info "Docker detected - Coqui TTS can be used"

        if curl -s http://localhost:5002/api/tts > /dev/null 2>&1; then
            log_pass "Coqui TTS container is running"
        else
            log_warn "Coqui TTS container not running (start with Docker)"
        fi
    fi

    # Check for Python TTS packages
    if python3 -c "import bark" 2>/dev/null; then
        log_pass "Bark TTS Python package installed"
    else
        log_warn "Bark TTS not installed (optional: pip install bark)"
    fi
}

check_noizy_mcp() {
    increment_check
    print_header "CHECKING NOIZY-GEMMA3 MCP"

    log_info "Checking NOIZY-GEMMA3 MCP server..."

    # Check if MCP server is running (usually on a specific port)
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_pass "NOIZY-GEMMA3 MCP server is responding"
        return 0
    elif curl -s http://localhost:8000/health > /dev/null 2>&1; then
        log_pass "NOIZY-GEMMA3 MCP server detected on alternate port"
        return 0
    else
        log_warn "NOIZY-GEMMA3 MCP server not detected"
        log_info "If using MCP, ensure server is running on correct port"
        return 0  # Not critical for basic recording
    fi
}

################################################################################
# SYSTEM CHECKS
################################################################################

check_disk_space() {
    increment_check
    print_header "CHECKING DISK SPACE"

    log_info "Checking available disk space..."

    # Get available space on main drive (in GB)
    AVAILABLE_GB=$(df -g / | awk 'NR==2 {print $4}')

    if [ "$AVAILABLE_GB" -gt 100 ]; then
        log_pass "Sufficient disk space: ${AVAILABLE_GB}GB available"
        log_info "Estimated capacity: $(($AVAILABLE_GB / 5)) hours of 24-bit/48kHz audio"
    elif [ "$AVAILABLE_GB" -gt 50 ]; then
        log_warn "Limited disk space: ${AVAILABLE_GB}GB available (ideally >100GB)"
    else
        log_fail "Very low disk space: ${AVAILABLE_GB}GB available"
        log_info "Archive recordings to external drive immediately after sessions"
    fi
}

check_system_load() {
    increment_check
    print_header "CHECKING SYSTEM LOAD"

    log_info "Checking CPU and memory usage..."

    CPU_LOAD=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    MEMORY_USED=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')

    if (( $(echo "$CPU_LOAD < 50" | bc -l) )); then
        log_pass "CPU usage normal: ${CPU_LOAD}%"
    else
        log_warn "CPU usage high: ${CPU_LOAD}% (close unnecessary apps)"
    fi

    log_info "Current memory usage detected (Monitor in Activity Monitor)"
}

check_spotlight() {
    increment_check
    print_header "CHECKING SPOTLIGHT INDEXING"

    log_info "Checking Spotlight indexing status..."

    if mdutil -s / 2>/dev/null | grep -q "indexing enabled"; then
        log_warn "Spotlight indexing is enabled (can impact audio performance)"
        log_info "Consider disabling during recording: sudo mdutil -a -i off"

        if [ "$FIX_MODE" = true ]; then
            log_info "Disabling Spotlight indexing..."
            sudo mdutil -a -i off 2>&1 | tee -a "$LOG_FILE"
        fi
    else
        log_pass "Spotlight indexing is disabled (good for performance)"
    fi
}

################################################################################
# DEEP DIAGNOSTIC MODE
################################################################################

deep_hardware_check() {
    print_header "DEEP HARDWARE DIAGNOSTICS"

    log_info "Running extended hardware checks..."

    # Thunderbolt topology
    log_info "=== Thunderbolt Device Tree ==="
    system_profiler SPThunderboltDataType 2>/dev/null | tee -a "$LOG_FILE" || log_warn "Unable to retrieve Thunderbolt info"

    # Full audio device dump
    log_info "=== Complete Audio Device List ==="
    system_profiler SPAudioDataType 2>/dev/null | tee -a "$LOG_FILE" || log_warn "Unable to retrieve audio device info"

    # CoreAudio detailed logs (last 50 lines)
    log_info "=== CoreAudio System Log (last 20 entries) ==="
    log stream --predicate 'process == "coreaudiod"' --level debug --max-count 20 2>/dev/null | tee -a "$LOG_FILE" || log_info "No recent CoreAudio logs"

    # USB audio devices
    log_info "=== USB Audio Devices ==="
    system_profiler SPUSBDataType 2>/dev/null | grep -A5 -i "audio\|apollo\|universal" | tee -a "$LOG_FILE" || log_info "No USB audio devices"
}

################################################################################
# UTILITIES
################################################################################

generate_test_audio() {
    log_info "Generating test audio with TTS..."

    TEST_OUTPUT="/tmp/gabriel_test_$(date +%s).wav"

    # Try macOS say command first
    if command -v say &> /dev/null; then
        say -v "Daniel" -r 150 "Gabriel is ready for recording" -o "${TEST_OUTPUT}" 2>/dev/null

        if [ -f "$TEST_OUTPUT" ]; then
            log_pass "Test audio generated: $TEST_OUTPUT"
            log_info "Play with: afplay \"$TEST_OUTPUT\""

            # Auto-play if possible
            if command -v afplay &> /dev/null; then
                afplay "$TEST_OUTPUT" 2>/dev/null || true
            fi
        else
            log_fail "Failed to generate test audio"
        fi
    fi
}

show_help() {
    cat << EOF
GABRIEL RECORDING SETUP - USAGE GUIDE

Usage: ./gabriel-recording-setup.sh [OPTIONS]

OPTIONS:
  --check   Run full diagnostics (default)
  --fix     Attempt to automatically fix detected issues
  --deep    Run extended hardware diagnostics
  --help    Show this help message

EXAMPLES:
  # Standard pre-flight check
  ./gabriel-recording-setup.sh

  # Run diagnostics and attempt to fix issues
  ./gabriel-recording-setup.sh --fix

  # Extended hardware diagnostics (for troubleshooting)
  ./gabriel-recording-setup.sh --deep

WHAT THIS SCRIPT CHECKS:
  ✓ Apollo Twin Thunderbolt connection
  ✓ Audio device detection
  ✓ CoreAudio daemon status
  ✓ Universal Audio Console
  ✓ Virtual audio routing (BlackHole)
  ✓ Ollama AI engine
  ✓ TTS capabilities
  ✓ DAW (Logic Pro)
  ✓ Disk space
  ✓ System load
  ✓ Spotlight indexing

QUICK START:
  1. Run: ./gabriel-recording-setup.sh --check
  2. Address any [FAIL] items listed
  3. Run: ./gabriel-recording-setup.sh --fix
  4. Verify with: ./gabriel-recording-setup.sh --check

LOG FILES:
  All output saved to: $LOG_FILE

For detailed troubleshooting:
  See GABRIEL-RECORDING-PIPELINE.md section 6 (Troubleshooting)

EOF
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --check)
                FIX_MODE=false
                DEEP_MODE=false
                shift
                ;;
            --fix)
                FIX_MODE=true
                shift
                ;;
            --deep)
                DEEP_MODE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Header
    {
        echo "GABRIEL VOICE RECORDING PIPELINE SETUP"
        echo "NOIZY.AI Project"
        echo "Date: $(date)"
        echo "Mode: $([ "$FIX_MODE" = true ] && echo "FIX" || echo "CHECK")"
        echo ""
    } | tee -a "$LOG_FILE"

    # Hardware checks
    check_apollo_twin
    check_audio_devices
    check_coreaudio
    check_audio_midi_setup

    # Software checks
    check_uad_console
    check_blackhole
    check_audio_hijack
    check_logic_pro

    # AI & TTS checks
    check_ollama
    check_tts_engines
    check_noizy_mcp

    # System checks
    check_disk_space
    check_system_load
    check_spotlight

    # Deep diagnostics if requested
    if [ "$DEEP_MODE" = true ]; then
        deep_hardware_check
    fi

    # Generate test audio if all critical systems pass
    if [ $FAILED_CHECKS -eq 0 ]; then
        generate_test_audio
    fi

    # Final summary
    print_summary
}

# Run main function
main "$@"
exit_code=$?

log_info "Setup script completed. Log saved to: $LOG_FILE"
exit $exit_code
