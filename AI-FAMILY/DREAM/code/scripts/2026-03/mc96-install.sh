#!/bin/bash
# ============================================================================
# MC 96 ECO UNIVERSE — ONE-SHOT INSTALLER
# Installs everything needed to lock your Logitech USB mic as default input
# and prevent Bluetooth devices from hijacking it.
# ============================================================================
# USAGE: Open Terminal, then run:
#   chmod +x mc96-install.sh && ./mc96-install.sh
# ============================================================================

set -e
echo ""
echo "========================================="
echo "  MC 96 ECO UNIVERSE — INSTALLER"
echo "========================================="
echo ""

# --- Step 1: Check/install Homebrew ---
if ! command -v brew &>/dev/null; then
    echo "[1/5] Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add to PATH for Apple Silicon
    eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || true
else
    echo "[1/5] Homebrew ✓"
fi

# --- Step 2: Install SwitchAudioSource ---
if ! command -v SwitchAudioSource &>/dev/null; then
    echo "[2/5] Installing SwitchAudioSource..."
    brew install switchaudio-osx
else
    echo "[2/5] SwitchAudioSource ✓"
fi

# --- Step 3: Show available input devices so user can verify ---
echo ""
echo "[3/5] Available INPUT devices on this Mac:"
echo "-------------------------------------------"
SwitchAudioSource -t input -a
echo "-------------------------------------------"
echo ""
echo "The mic-lock script is set to use: \"USB Audio Device\""
echo "If your Logitech shows a different name above, edit"
echo "/usr/local/bin/mc96-mic-lock.sh and change PREFERRED_INPUT."
echo ""
read -p "Press Enter to continue (or Ctrl+C to abort and edit first)..."

# --- Step 4: Install the mic-lock script ---
echo "[4/5] Installing mic-lock script..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
sudo cp "$SCRIPT_DIR/mc96-mic-lock.sh" /usr/local/bin/mc96-mic-lock.sh
sudo chmod +x /usr/local/bin/mc96-mic-lock.sh
echo "  → /usr/local/bin/mc96-mic-lock.sh ✓"

# --- Step 5: Install and load the launchd service ---
echo "[5/5] Installing background service..."

# Unload if already running
launchctl unload ~/Library/LaunchAgents/com.mc96.miclock.plist 2>/dev/null || true

cp "$SCRIPT_DIR/com.mc96.miclock.plist" ~/Library/LaunchAgents/com.mc96.miclock.plist
launchctl load ~/Library/LaunchAgents/com.mc96.miclock.plist

echo "  → ~/Library/LaunchAgents/com.mc96.miclock.plist ✓"
echo ""
echo "========================================="
echo "  MC 96 MIC LOCK — INSTALLED & RUNNING"
echo "========================================="
echo ""
echo "Your Logitech USB mic is now the permanent default input."
echo "It will survive Bluetooth connections, reboots, everything."
echo ""
echo "Useful commands:"
echo "  Check status:  cat /tmp/mc96-mic-lock.log"
echo "  Stop service:  launchctl unload ~/Library/LaunchAgents/com.mc96.miclock.plist"
echo "  Start service: launchctl load ~/Library/LaunchAgents/com.mc96.miclock.plist"
echo "  List inputs:   SwitchAudioSource -t input -a"
echo ""
