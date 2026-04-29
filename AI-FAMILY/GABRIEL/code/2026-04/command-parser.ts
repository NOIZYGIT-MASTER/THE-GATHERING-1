// ═══════════════════════════════════════════════════════════════
// GABRIEL — Voice Command Parser
// Parses Whisper transcription output into structured NoisyCommands.
// Intent recognition: voice text → { command, target, params }
//
// Gabriel hears: "Record. Arm Engr Keith. 48k, 32-bit."
// Gabriel sends: { command: "record", target: "engr-keith",
//                  params: { sampleRate: 48000, bitDepth: 32, armed: true } }
//
// iPhone voice → Whisper → THIS PARSER → JSON webhook → Heaven
// ═══════════════════════════════════════════════════════════════

// ─── Types ───

export type CommandVerb =
  | "record" | "stop" | "play" | "pause"
  | "scan" | "deploy" | "status" | "control"
  | "arm" | "disarm" | "check" | "mix"
  | "snapshot" | "consent";

export type AgentTarget =
  | "gabriel" | "lucy" | "engr-keith" | "georgia-may"
  | "archivist" | "sentinel" | "dispatcher" | "scanner"
  | "deployer" | "gemma" | "all";

export interface ParsedCommand {
  command: CommandVerb;
  target: AgentTarget;
  params: Record<string, unknown>;
  confidence: number;      // 0.0 - 1.0
  rawTranscript: string;
}

export interface ParseResult {
  success: boolean;
  commands: ParsedCommand[];
  unrecognized?: string;
}

// ─── Agent name aliases (what people actually say) ───

const AGENT_ALIASES: Record<string, AgentTarget> = {
  // ENGR Keith variations
  "engineer keith": "engr-keith",
  "engr keith": "engr-keith",
  "engineer": "engr-keith",
  "keith": "engr-keith",
  "logic": "engr-keith",
  "logic pro": "engr-keith",
  "transport": "engr-keith",
  "audio engine": "engr-keith",

  // Georgia May variations
  "georgia may": "georgia-may",
  "georgia": "georgia-may",
  "voice estate": "georgia-may",
  "phoneme": "georgia-may",
  "voice": "georgia-may",
  "noizyvox": "georgia-may",

  // Lucy variations
  "lucy": "lucy",
  "dashboard": "lucy",
  "ipad": "lucy",
  "remote": "lucy",

  // Sentinel variations
  "sentinel": "sentinel",
  "consent": "sentinel",
  "guardian": "sentinel",
  "hvs": "sentinel",

  // Archivist variations
  "archivist": "archivist",
  "archive": "archivist",
  "session": "archivist",
  "provenance": "archivist",
  "audit": "archivist",

  // Dispatcher variations
  "dispatcher": "dispatcher",
  "dispatch": "dispatcher",
  "workflow": "dispatcher",
  "zapier": "dispatcher",
  "n8n": "dispatcher",
  "webhook": "dispatcher",

  // Scanner variations
  "scanner": "scanner",
  "scan": "scanner",
  "noise": "scanner",
  "micip": "scanner",
  "signal": "scanner",
  "analysis": "scanner",

  // Deployer variations
  "deployer": "deployer",
  "deploy": "deployer",
  "infrastructure": "deployer",
  "health check": "deployer",
  "build": "deployer",

  // Gemma variations
  "gemma": "gemma",
  "llm": "gemma",
  "ai": "gemma",
  "local model": "gemma",

  // Gabriel self-reference
  "gabriel": "gabriel",
  "self": "gabriel",

  // Broadcast
  "all": "all",
  "all agents": "all",
  "everyone": "all",
  "everything": "all",
  "mesh": "all",
};

// ─── Command verb patterns ───

const VERB_PATTERNS: Array<{ pattern: RegExp; verb: CommandVerb; confidence: number }> = [
  // Recording
  { pattern: /\b(start\s+)?record(ing)?\b/i,       verb: "record",   confidence: 0.95 },
  { pattern: /\bstop(\s+recording)?\b/i,            verb: "stop",     confidence: 0.95 },
  { pattern: /\barm(\s+recording)?\b/i,             verb: "arm",      confidence: 0.90 },
  { pattern: /\bdisarm\b/i,                         verb: "disarm",   confidence: 0.90 },

  // Transport
  { pattern: /\bplay(back)?\b/i,                    verb: "play",     confidence: 0.90 },
  { pattern: /\bpause\b/i,                          verb: "pause",    confidence: 0.90 },

  // Operations
  { pattern: /\bscan\b/i,                           verb: "scan",     confidence: 0.85 },
  { pattern: /\bdeploy\b/i,                         verb: "deploy",   confidence: 0.90 },
  { pattern: /\b(check\s+)?status\b/i,              verb: "status",   confidence: 0.85 },
  { pattern: /\bcheck\b/i,                          verb: "check",    confidence: 0.80 },
  { pattern: /\bcontrol\b/i,                        verb: "control",  confidence: 0.80 },
  { pattern: /\bmix(ing)?\b/i,                      verb: "mix",      confidence: 0.80 },
  { pattern: /\bsnapshot\b/i,                       verb: "snapshot", confidence: 0.90 },
  { pattern: /\bconsent\b/i,                        verb: "consent",  confidence: 0.85 },
];

// ─── Audio parameter extraction ───

const PARAM_PATTERNS = {
  sampleRate: [
    { pattern: /\b48\s*k(hz)?\b/i,    value: 48000 },
    { pattern: /\b44\.?1\s*k(hz)?\b/i, value: 44100 },
    { pattern: /\b96\s*k(hz)?\b/i,    value: 96000 },
    { pattern: /\b192\s*k(hz)?\b/i,   value: 192000 },
  ],
  bitDepth: [
    { pattern: /\b32\s*(-?\s*)?bit\b/i,  value: 32 },
    { pattern: /\b24\s*(-?\s*)?bit\b/i,  value: 24 },
    { pattern: /\b16\s*(-?\s*)?bit\b/i,  value: 16 },
  ],
};

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════

export function parseVoiceCommand(transcript: string): ParseResult {
  const cleaned = transcript.trim().toLowerCase();

  if (!cleaned) {
    return { success: false, commands: [], unrecognized: "empty transcript" };
  }

  // Split on periods, commas, and "then" to handle compound commands
  // "Record. Arm Engr Keith. 48k, 32 bit."
  const segments = cleaned
    .split(/[.!]\s*|\bthen\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const commands: ParsedCommand[] = [];
  const unrecognizedParts: string[] = [];

  for (const segment of segments) {
    const parsed = parseSingleCommand(segment, transcript);
    if (parsed) {
      commands.push(parsed);
    } else {
      unrecognizedParts.push(segment);
    }
  }

  // If we found at least one command, try to attach audio params
  // from unrecognized parts to the most relevant command
  if (commands.length > 0 && unrecognizedParts.length > 0) {
    const audioParams = extractAudioParams(unrecognizedParts.join(" "));
    if (Object.keys(audioParams).length > 0) {
      // Attach to the record/arm command, or first command
      const recordCmd = commands.find((c) => c.command === "record" || c.command === "arm");
      const targetCmd = recordCmd || commands[0];
      targetCmd.params = { ...targetCmd.params, ...audioParams };
    }
  }

  return {
    success: commands.length > 0,
    commands,
    unrecognized: unrecognizedParts.length > 0 ? unrecognizedParts.join("; ") : undefined,
  };
}

function parseSingleCommand(segment: string, rawTranscript: string): ParsedCommand | null {
  // Find verb
  let matchedVerb: CommandVerb | null = null;
  let verbConfidence = 0;

  for (const { pattern, verb, confidence } of VERB_PATTERNS) {
    if (pattern.test(segment)) {
      matchedVerb = verb;
      verbConfidence = confidence;
      break;
    }
  }

  if (!matchedVerb) return null;

  // Find target agent
  const target = extractTarget(segment);

  // Extract audio parameters
  const params = extractAudioParams(segment);

  return {
    command: matchedVerb,
    target: target || inferDefaultTarget(matchedVerb),
    params,
    confidence: verbConfidence * (target ? 1.0 : 0.85),
    rawTranscript,
  };
}

function extractTarget(text: string): AgentTarget | null {
  // Check longest aliases first to avoid partial matches
  const sorted = Object.entries(AGENT_ALIASES)
    .sort(([a], [b]) => b.length - a.length);

  for (const [alias, target] of sorted) {
    if (text.includes(alias)) {
      return target;
    }
  }
  return null;
}

function inferDefaultTarget(verb: CommandVerb): AgentTarget {
  switch (verb) {
    case "record":
    case "stop":
    case "play":
    case "pause":
    case "arm":
    case "disarm":
    case "mix":
      return "engr-keith";
    case "scan":
      return "scanner";
    case "deploy":
      return "deployer";
    case "consent":
      return "sentinel";
    case "snapshot":
      return "archivist";
    default:
      return "gabriel";
  }
}

function extractAudioParams(text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const [paramName, patterns] of Object.entries(PARAM_PATTERNS)) {
    for (const { pattern, value } of patterns) {
      if (pattern.test(text)) {
        params[paramName] = value;
        break;
      }
    }
  }

  // Check for "armed" / "arm" state
  if (/\barm(ed)?\b/i.test(text)) {
    params.armed = true;
  }

  // Check for "locked" / "lock" state
  if (/\block(ed)?\b/i.test(text)) {
    params.locked = true;
  }

  return params;
}

// ═══════════════════════════════════════════════════════════════
// COMPOUND COMMAND EXAMPLE
//
// Input: "Record. Arm Engr Keith. 48k, 32-bit. Session file locked."
//
// Output: {
//   success: true,
//   commands: [
//     { command: "record", target: "engr-keith", params: { sampleRate: 48000, bitDepth: 32, armed: true, locked: true }, confidence: 0.95 },
//     { command: "arm",    target: "engr-keith", params: { armed: true }, confidence: 0.90 }
//   ]
// }
// ═══════════════════════════════════════════════════════════════
