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
 *    - Audio Hijack 4.x with Scripting enabled (allowExternalCommands = true)
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
    noiseGate: {
      enabled: true,
      thresholdDB: -45,
      attackMs: 5,
      releaseMs: 150,
    },
    voiceEQ: {
      enabled: true,
      highPassHz: 80,
      presenceBoostHz: 3200,
      presenceBoostDB: 2.5,
    },
    compressor: {
      enabled: true,
      thresholdDB: -18,
      ratio: 3,
      attackMs: 10,
      releaseMs: 100,
      makeupGainDB: 4,
    },
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
    blocks: [],
    connections: [],
  };

  let blockId = 0;
  const ids = {};

  // 1. INPUT SOURCE: AirPlay / iPhone
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

  // 2. NOISE GATE
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
          expansionRatio: 20,
        },
      },
      position: { x: 250, y: 200 },
    });
  }

  // 3. VOICE EQ
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

  // 4. COMPRESSOR
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

  // 5. LIMITER
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

  // 6. OUTPUT: CLAUDE-COWORK Virtual Device
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

  // 7. RECORDER (Optional)
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

  // BUILD CONNECTIONS (left to right chain)
  const chain = [
    ids.input, ids.noiseGate, ids.voiceEQ,
    ids.compressor, ids.limiter, ids.output,
  ].filter(Boolean);

  for (let i = 0; i < chain.length - 1; i++) {
    session.connections.push({ from: chain[i], to: chain[i + 1] });
  }

  // Branch to recorder from the limiter (post-processing)
  if (ids.recorder && ids.limiter) {
    session.connections.push({ from: ids.limiter, to: ids.recorder });
  }

  return session;
}

// ---------------------------------------------------------------------------
//  OUTPUT
// ---------------------------------------------------------------------------

const sessionJSON = buildSessionJSON();

console.log("// NOIZY — Audio Hijack Session Definition");
console.log("// iPhone 15 Pro Max → Claude Cowork Chat");
console.log(JSON.stringify(sessionJSON, null, 2));
console.log("");
console.log("// To use:");
console.log("//   1. Run: bash NOIZY_iPhone_CoworkChat_Setup.sh");
console.log("//   2. Or import the JSON directly into Audio Hijack");
console.log("//   3. Connect iPhone via AirPlay to GOD");
console.log("//   4. Hit Record/Run in Audio Hijack");

if (typeof module !== "undefined") {
  module.exports = { CONFIG, buildSessionJSON };
}
