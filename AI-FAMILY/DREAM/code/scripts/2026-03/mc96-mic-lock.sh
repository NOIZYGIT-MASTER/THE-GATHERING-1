#!/bin/bash
# ============================================================================
# MC 96 ECO UNIVERSE — MIC LOCK
# Forces Logitech USB camera as the default system input device.
# Prevents SoundSource or Bluetooth connections (RSP Beats) from hijacking it.
# ============================================================================
# REQUIRES: brew install switchaudio-osx
# INSTALL:  Run mc96-install.sh to set this up as a persistent background service.
# ============================================================================

# --- CONFIGURATION ---
# Set this to the exact name of your Logitech USB camera as it appears in
# System Settings > Sound > Input. Run: SwitchAudioSource -t input -a
# to list all available input devices and find the exact name.
PREFERRED_INPUT="USB Audio Device"
# Common Logitech USB camera names:
#   "USB Audio Device"
#   "C920 Pro Stream Webcam"
#   "Logitech Webcam"
# If yours is different, update PREFERRED_INPUT above.

POLL_INTERVAL=2  # seconds between checks

# --- PATHS ---
SWITCH="/opt/homebrew/bin/SwitchAudioSource"
# Intel Mac fallback:
[ ! -f "$SWITCH" ] && SWITCH="/usr/local/bin/SwitchAudioSource"

# --- PREFLIGHT ---
if [ ! -f "$SWITCH" ]; then
    echo "ERROR: SwitchAudioSource not found."
    echo "Install it:  brew install switchaudio-osx"
    exit 1
fi

echo "MC 96 MIC LOCK — Active"
echo "Preferred input: $PREFERRED_INPUT"
echo "Polling every ${POLL_INTERVAL}s"
echo "---"

# --- MAIN LOOP ---
while true; do
    CURRENT=$("$SWITCH" -t input -c 2>/dev/null)

    if [ "$CURRENT" != "$PREFERRED_INPUT" ]; then
        echo "[$(date '+%H:%M:%S')] Input switched to '$CURRENT' — overriding back to '$PREFERRED_INPUT'"
        "$SWITCH" -t input -s "$PREFERRED_INPUT" 2>/dev/null

        # Verify it took
        VERIFY=$("$SWITCH" -t input -c 2>/dev/null)
        if [ "$VERIFY" = "$PREFERRED_INPUT" ]; then
            echo "[$(date '+%H:%M:%S')] ✓ Locked back to '$PREFERRED_INPUT'"
        else
            echo "[$(date '+%H:%M:%S')] WARNING: Could not switch. Is '$PREFERRED_INPUT' connected?"
            echo "  Available inputs:"
            "$SWITCH" -t input -a 2>/dev/null | sed 's/^/    /'
        fi
    fi

    sleep "$POLL_INTERVAL"
done
