#!/bin/bash
# =============================================================
# fix-mic-default.sh
# Forces Logitech USB camera as default audio input on macOS
# Created for Rob Plowman — March 2026
# =============================================================
#
# FIRST-TIME SETUP (run once):
#   brew install switchaudio-osx
#
# USAGE:
#   ./fix-mic-default.sh          — sets Logitech USB as default mic
#   ./fix-mic-default.sh --list   — shows all available audio devices
#   ./fix-mic-default.sh --watch  — continuously monitors and corrects
#
# To make this run automatically, see the launchd plist below.
# =============================================================

PREFERRED_MIC="USB"  # We match partial name — adjust if needed

# Check for SwitchAudioSource
if ! command -v SwitchAudioSource &> /dev/null; then
    echo "ERROR: SwitchAudioSource not found."
    echo "Install it with: brew install switchaudio-osx"
    exit 1
fi

list_devices() {
    echo "=== INPUT DEVICES ==="
    SwitchAudioSource -a -t input
    echo ""
    echo "=== OUTPUT DEVICES ==="
    SwitchAudioSource -a -t output
    echo ""
    echo "=== CURRENT INPUT ==="
    SwitchAudioSource -c -t input
    echo "=== CURRENT OUTPUT ==="
    SwitchAudioSource -c -t output
}

set_preferred_mic() {
    # Find the full device name matching our preferred mic keyword
    local device_name
    device_name=$(SwitchAudioSource -a -t input | grep -i "$PREFERRED_MIC" | head -1)

    if [ -z "$device_name" ]; then
        echo "WARNING: No input device matching '$PREFERRED_MIC' found."
        echo "Available input devices:"
        SwitchAudioSource -a -t input
        return 1
    fi

    local current
    current=$(SwitchAudioSource -c -t input)

    if [ "$current" = "$device_name" ]; then
        echo "OK: Input already set to '$device_name'"
        return 0
    fi

    SwitchAudioSource -s "$device_name" -t input
    echo "SWITCHED: Input changed from '$current' to '$device_name'"
}

watch_and_correct() {
    echo "Watching for audio input changes... (Ctrl+C to stop)"
    echo "Will enforce '$PREFERRED_MIC' as default input."
    echo ""
    while true; do
        set_preferred_mic
        sleep 3
    done
}

# --- Main ---
case "${1:-}" in
    --list)
        list_devices
        ;;
    --watch)
        watch_and_correct
        ;;
    *)
        set_preferred_mic
        ;;
esac
