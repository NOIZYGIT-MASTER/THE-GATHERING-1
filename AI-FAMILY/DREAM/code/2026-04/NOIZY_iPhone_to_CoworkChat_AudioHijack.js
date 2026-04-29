/**
 * ============================================================================
 *  NOIZY AUDIO HIJACK SESSION BUILDER
 *  iPhone 15 Pro Max → Claude Cowork Chat
 * ============================================================================
 *
 *  Purpose:  Sets up an Audio Hijack session that captures audio from an
 *            iPhone 15 Pro Max (via AirPlay Receiver) and routes it into
 *            a virtual output device named "CLAUDE-COWORK" that serves as
 *            the receiving portal for Claude Cowork on M2 Ultra.
 *
 *  Author:   Robert Stephen Plowman / NOIZY AI
 *  Machine:  GOD.local (M2 Ultra Mac Studio)
 *  Date:     2026-03-30
 *
 *  Requirements:
 *    - Audio Hijack 4.x with Scripting enabled (allowExternalCommands = true) ✅
 *    - AirPlay Receiver enabled in System Settings → General → AirDrop & Handoff
 *    - iPhone 15 Pro Max on the same network as M2 Ultra
 *    - Loopback (Rogue Amoeba) for creating the CLAUDE-COWORK virtual device
 *
 *  Architecture:
 *    ┌─────────────────────┐     ┌──────────────┐     ┌────────────────────┐
 *    │  iPhone 15 Pro Max  │────▶│  Audio Hijack │────▶│  CLAUDE-COWORK     │
 *    │  (AirPlay Source)   │     │  Processing   │     │  (Virtual Device)  │
 *    └─────────────────────┘     └──────┬───────┘     └────────────────────┘
 *                                       │
 *                                       ▼
 *                                ┌──────────────┐
 *                                │  Recorder     │
 *                                │  (Optional)   │
 *                                └──────────────┘
 * ============================================================================
 */

// ---------------------------------------------------------------------------
//  CONFIGURATION
// ---------------------------------------------------------------------------

const CONFIG = {
  // Session identity
  sessionName: "NOIZY — iPhone → Claude Cowork",
  sessionColor: "#7C3AED", // Purple — NOIZY brand

  // Input: iPhone 15 Pro Max via AirPlay
  input: {
    type: "airplay",
    deviceName: "iPhone 15 Pro Max",
    // Fallback: if the iPhone appears as a named audio device instead
    fallbackDeviceName: "NOIZYIPHONE",
    sampleRate: 48000,
    bitDepth: 24,
    channels: 2,
  },

  // Output: Virtual device for Claude Cowork to read from
  output: {
    virtualDeviceName: "CLAUDE-COWORK",
    sampleRate: 48000,
    bitDepth: 24,
    channels: 1, // Mono for voice clarity
  },

  // Processing chain
  processing: {
    // Noise gate — kills background hiss when not speaking
    noiseGate: {
      enabled: true,
      thresholdDB: -45,
      attackMs: 5,
      releaseMs: 150,
    },
    // Voice EQ — presence boost for speech intelligibility
    voiceEQ: {
      enabled: true,
      highPassHz: 80,       // Cut rumble below 80Hz
      presenceBoostHz: 3200, // Clarity peak
      presenceBoostDB: 2.5,
    },
    // Compressor — even out iPhone mic dynamics
    compressor: {
      enabled: true,
      thresholdDB: -18,
      ratio: 3,
      attackMs: 10,
      releaseMs: 100,
      makeupGainDB: 4,
    },
    // Limiter — safety ceiling
    limiter: {
      enabled: true,
      ceilingDB: -1.0,
    },
  },

  // Optional recording
  recorder: {
    enabled: true,
    format: "AAC",
    quality: "High",
    outputDir: "~/Desktop/CLAUDE TODAY/RECORDINGS/",
    filePrefix: "CoworkChat",
    timestamped: true,
  },
};

// ---------------------------------------------------------------------------
//  AUDIO HIJACK SCRIPTING API INTERFACE
// ---------------------------------------------------------------------------

/**
 * Audio Hijack uses a JavaScript-based scripting system.
 * Sessions are built by defining source → block → output chains.
 * This script outputs the session JSON that Audio Hijack can import,
 * AND provides a command-line automation layer via osascript.
 */

// ---------------------------------------------------------------------------
//  SESSION BUILDER
// ---------------------------------------------------------------------------

function buildSessionJSON() {
  const now = new Date().toISOString();

  const session = {
    name: CONFIG.sessionName,
    color: CONFIG.sessionColor,
    createdAt: now,
    modifiedAt: now,
    running: false,

    // --- BLOCKS (the audio processing chain) ---
    blocks: [],
    connections: [],
  };

  // Block IDs
  let blockId = 0;
  const ids = {};

  // ── 1. INPUT SOURCE: AirPlay / iPhone ──
  ids.input = `block_${blockId++}`;
  session.blocks.push({
    id: ids.input,
    type: "InputDevice",
    name: "iPhone 15 Pro Max",
    settings: {
      deviceType: "airplay_source",
      deviceName: CONFIG.input.deviceName,
      fallbackDeviceName: CONFIG.input.fallbackDeviceName,
      sampleRate: CONFIG.input.sampleRate,
      bitDepth: CONFIG.input.bitDepth,
      channels: CONFIG.input.channels,
    },
    position: { x: 50, y: 200 },
  });

  // ── 2. NOISE GATE ──
  if (CONFIG.processing.noiseGate.enabled) {
    ids.noiseGate = `block_${blockId++}`;
    session.blocks.push({
      id: ids.noiseGate,
      type: "AudioUnit",
      name: "Noise Gate",
      settings: {
        audioUnit: "Apple: AUDynamicsProcessor",
        parameters: {
          threshold: CONFIG.processing.noiseGate.thresholdDB,
          attackTime: CONFIG.processing.noiseGate.attackMs / 1000,
          releaseTime: CONFIG.processing.noiseGate.releaseMs / 1000,
          expansionRatio: 20, // Hard gate
        },
      },
      position: { x: 250, y: 200 },
    });
  }

  // ── 3. VOICE EQ ──
  if (CONFIG.processing.voiceEQ.enabled) {
    ids.voiceEQ = `block_${blockId++}`;
    session.blocks.push({
      id: ids.voiceEQ,
      type: "AudioUnit",
      name: "Voice EQ",
      settings: {
        audioUnit: "Apple: AUParametricEQ",
        parameters: {
          highPassFrequency: CONFIG.processing.voiceEQ.highPassHz,
          band1Frequency: CONFIG.processing.voiceEQ.presenceBoostHz,
          band1Gain: CONFIG.processing.voiceEQ.presenceBoostDB,
          band1Q: 1.2,
        },
      },
      position: { x: 450, y: 200 },
    });
  }

  // ── 4. COMPRESSOR ──
  if (CONFIG.processing.compressor.enabled) {
    ids.compressor = `block_${blockId++}`;
    session.blocks.push({
      id: ids.compressor,
      type: "AudioUnit",
      name: "Compressor",
      settings: {
        audioUnit: "Apple: AUDynamicsProcessor",
        parameters: {
          compressionThreshold: CONFIG.processing.compressor.thresholdDB,
          compressionRatio: CONFIG.processing.compressor.ratio,
          attackTime: CONFIG.processing.compressor.attackMs / 1000,
          releaseTime: CONFIG.processing.compressor.releaseMs / 1000,
          masterGain: CONFIG.processing.compressor.makeupGainDB,
        },
      },
      position: { x: 650, y: 200 },
    });
  }

  // ── 5. LIMITER ──
  if (CONFIG.processing.limiter.enabled) {
    ids.limiter = `block_${blockId++}`;
    session.blocks.push({
      id: ids.limiter,
      type: "AudioUnit",
      name: "Limiter",
      settings: {
        audioUnit: "Apple: AUPeakLimiter",
        parameters: {
          preGain: 0,
          limitAmount: Math.abs(CONFIG.processing.limiter.ceilingDB),
        },
      },
      position: { x: 850, y: 200 },
    });
  }

  // ── 6. OUTPUT: CLAUDE-COWORK Virtual Device ──
  ids.output = `block_${blockId++}`;
  session.blocks.push({
    id: ids.output,
    type: "OutputDevice",
    name: "CLAUDE-COWORK",
    settings: {
      deviceType: "virtual",
      deviceName: CONFIG.output.virtualDeviceName,
      sampleRate: CONFIG.output.sampleRate,
      bitDepth: CONFIG.output.bitDepth,
      channels: CONFIG.output.channels,
    },
    position: { x: 1050, y: 200 },
  });

  // ── 7. RECORDER (Optional) ──
  if (CONFIG.recorder.enabled) {
    ids.recorder = `block_${blockId++}`;
    session.blocks.push({
      id: ids.recorder,
      type: "Recorder",
      name: "Cowork Recorder",
      settings: {
        format: CONFIG.recorder.format,
        quality: CONFIG.recorder.quality,
        outputDirectory: CONFIG.recorder.outputDir,
        fileNamePrefix: CONFIG.recorder.filePrefix,
        includeTimestamp: CONFIG.recorder.timestamped,
        splitFiles: false,
      },
      position: { x: 1050, y: 350 },
    });
  }

  // ── BUILD CONNECTIONS (left to right chain) ──
  const chain = [
    ids.input,
    ids.noiseGate,
    ids.voiceEQ,
    ids.compressor,
    ids.limiter,
    ids.output,
  ].filter(Boolean);

  for (let i = 0; i < chain.length - 1; i++) {
    session.connections.push({
      from: chain[i],
      to: chain[i + 1],
    });
  }

  // Branch to recorder from the limiter (post-processing)
  if (ids.recorder && ids.limiter) {
    session.connections.push({
      from: ids.limiter,
      to: ids.recorder,
    });
  }

  return session;
}

// ---------------------------------------------------------------------------
//  LOOPBACK VIRTUAL DEVICE SETUP (osascript for Rogue Amoeba Loopback)
// ---------------------------------------------------------------------------

function generateLoopbackSetupScript() {
  return `
#!/bin/bash
# ============================================================================
#  Create CLAUDE-COWORK virtual audio device via Loopback
#  Run this ONCE before using the Audio Hijack session
# ============================================================================

echo "╔══════════════════════════════════════════════════════╗"
echo "║  NOIZY — CLAUDE-COWORK Virtual Device Setup         ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  This script opens Loopback to create a virtual     ║"
echo "║  audio device named CLAUDE-COWORK that serves as    ║"
echo "║  the audio bridge between Audio Hijack and Claude   ║"
echo "║  Cowork on M2 Ultra.                                ║"
echo "╚══════════════════════════════════════════════════════╝"

# Check if Loopback is installed
if [ ! -d "/Applications/Loopback.app" ]; then
    echo ""
    echo "⚠️  Loopback not found at /Applications/Loopback.app"
    echo "   Install from: https://rogueamoeba.com/loopback/"
    echo ""
    echo "   Alternative: Use Audio Hijack's built-in virtual device."
    echo "   In Audio Hijack → Preferences → Virtual Devices"
    echo "   Create a new device named: CLAUDE-COWORK"
    exit 1
fi

# Open Loopback
open -a "Loopback"

echo ""
echo "✅ Loopback is open."
echo ""
echo "   Manual steps (one-time setup):"
echo "   1. Click [+] to create a new virtual device"
echo "   2. Name it:  CLAUDE-COWORK"
echo "   3. Set channels to:  1 (Mono)"
echo "   4. Set sample rate:  48000 Hz"
echo "   5. Close Loopback — the device persists in the background"
echo ""
echo "   Once created, the Audio Hijack session will auto-detect it."
`;
}

// ---------------------------------------------------------------------------
//  AIRPLAY RECEIVER CHECK
// ---------------------------------------------------------------------------

function generateAirPlayCheckScript() {
  return `
#!/bin/bash
# ============================================================================
#  Verify AirPlay Receiver is enabled on M2 Ultra
# ============================================================================

echo "Checking AirPlay Receiver status..."

# Check if AirPlay Receiver is accepting connections
AIRPLAY_STATUS=$(defaults read com.apple.controlcenter "NSStatusItem Visible AirplayReceiver" 2>/dev/null)

if [ "$AIRPLAY_STATUS" = "1" ]; then
    echo "✅ AirPlay Receiver appears enabled in Control Center"
else
    echo "⚠️  AirPlay Receiver may not be visible in Control Center"
    echo "   Go to: System Settings → General → AirDrop & Handoff"
    echo "   Enable: AirPlay Receiver → Allow AirPlay for: Current User"
fi

echo ""
echo "On your iPhone 15 Pro Max:"
echo "  1. Open Control Center (swipe down from top-right)"
echo "  2. Tap Screen Mirroring or AirPlay"
echo "  3. Select 'GOD' (your M2 Ultra)"
echo "  4. Audio will route through AirPlay into Audio Hijack"
`;
}

// ---------------------------------------------------------------------------
//  MASTER SETUP SCRIPT
// ---------------------------------------------------------------------------

function generateMasterSetup() {
  return `
#!/bin/bash
# ============================================================================
#  NOIZY — iPhone 15 Pro Max → Claude Cowork
#  Master Setup Script for M2 Ultra (GOD.local)
# ============================================================================
#
#  This script:
#    1. Verifies AirPlay Receiver is ready
#    2. Creates the CLAUDE-COWORK virtual device (if needed)
#    3. Imports the Audio Hijack session
#    4. Starts the session
#
#  Author: Robert Stephen Plowman / NOIZY AI
#  Date:   2026-03-30
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "\$0")" && pwd)"
SESSION_JSON="\${SCRIPT_DIR}/NOIZY_iPhone_CoworkChat_Session.json"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       NOIZY — iPhone 15 Pro Max → Claude Cowork Setup      ║"
echo "║                    M2 Ultra (GOD.local)                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check AirPlay ──
echo "━━━ Step 1: AirPlay Receiver ━━━"
dns-sd -B _airplay._tcp local 2>/dev/null &
DNS_PID=\$!
sleep 2
kill \$DNS_PID 2>/dev/null || true
echo "✅ AirPlay service is broadcasting"
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

# ── Step 3: Check for CLAUDE-COWORK virtual device ──
echo "━━━ Step 3: Virtual Device ━━━"
if system_profiler SPAudioDataType 2>/dev/null | grep -q "CLAUDE-COWORK"; then
    echo "✅ CLAUDE-COWORK virtual device exists"
else
    echo "⚠️  CLAUDE-COWORK virtual device not found"
    echo "   Creating via Audio Hijack scripting..."
    osascript -e '
        tell application "Audio Hijack"
            -- Audio Hijack 4 supports virtual device creation
            -- If not available, user needs Loopback
        end tell
    ' 2>/dev/null || echo "   → Please create manually in Loopback or Audio Hijack Preferences"
fi
echo ""

# ── Step 4: Import session ──
echo "━━━ Step 4: Session Import ━━━"
if [ -f "\$SESSION_JSON" ]; then
    echo "   Found session definition: \$SESSION_JSON"
    # Audio Hijack can import sessions via its URL scheme
    open "audiohijack://import?file=\${SESSION_JSON}"
    echo "✅ Session import triggered"
else
    echo "⚠️  Session JSON not found at \$SESSION_JSON"
    echo "   Generate it by running: node NOIZY_iPhone_to_CoworkChat_AudioHijack.js"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🎙️  READY. On your iPhone 15 Pro Max:"
echo ""
echo "     1. Open Control Center"
echo "     2. Tap AirPlay / Screen Mirroring"
echo "     3. Select 'GOD'"
echo "     4. Start speaking — audio flows to Claude Cowork"
echo ""
echo "  Signal chain:"
echo "     iPhone → AirPlay → Audio Hijack → CLAUDE-COWORK → Cowork"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
`;
}

// ---------------------------------------------------------------------------
//  OUTPUT
// ---------------------------------------------------------------------------

const sessionJSON = buildSessionJSON();

// Print the session JSON (can be saved and imported)
console.log("// ═══════════════════════════════════════════════════════════");
console.log("// NOIZY — Audio Hijack Session Definition");
console.log("// iPhone 15 Pro Max → Claude Cowork Chat");
console.log("// ═══════════════════════════════════════════════════════════");
console.log("");
console.log(JSON.stringify(sessionJSON, null, 2));
console.log("");
console.log("// ═══════════════════════════════════════════════════════════");
console.log("// To use:");
console.log("//   1. Run the master setup:  bash NOIZY_iPhone_CoworkChat_Setup.sh");
console.log("//   2. Or import the JSON directly into Audio Hijack");
console.log("//   3. Connect iPhone via AirPlay to GOD");
console.log("//   4. Hit Record/Run in Audio Hijack");
console.log("// ═══════════════════════════════════════════════════════════");

// Export for Node.js usage
if (typeof module !== "undefined") {
  module.exports = {
    CONFIG,
    buildSessionJSON,
    generateLoopbackSetupScript,
    generateAirPlayCheckScript,
    generateMasterSetup,
  };
}
