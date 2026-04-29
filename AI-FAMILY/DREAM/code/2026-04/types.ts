// NOIZY HEAVEN — Core Types
// Every command, every response, every agent — typed.

// ═══════════════════════════════════════════════════════
// ENVIRONMENT BINDINGS
// ═══════════════════════════════════════════════════════

export interface Env {
  // D1
  COMMAND_LOG: D1Database;
  AGENT_MEMORY: D1Database;

  // KV
  GABRIEL_VOICE: KVNamespace;
  GABRIEL_KV: KVNamespace;
  FEATURE_FLAGS: KVNamespace;
  GAP_SOLVER: KVNamespace;

  // Secrets (set via wrangler secret put)
  HEAVEN_AUTH_TOKEN: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  TUNNEL_ORIGIN: string;

  // Vars
  ENVIRONMENT: string;
  GOD_GABRIEL_PORT: string;
  GOD_LUCY_PORT: string;
  GOD_ENGR_KEITH_PORT: string;
  GOD_GEORGIA_MAY_PORT: string;
  GOD_ARCHIVIST_PORT: string;
  GOD_SENTINEL_PORT: string;
  GOD_DISPATCHER_PORT: string;
  GOD_SCANNER_PORT: string;
  GOD_DEPLOYER_PORT: string;
  GOD_GEMMA_PORT: string;
}

// ═══════════════════════════════════════════════════════
// COMMAND PROTOCOL
// ═══════════════════════════════════════════════════════

export type CommandSource = "gabriel" | "lucy" | "discord";

export type CommandVerb =
  | "record"
  | "stop"
  | "play"
  | "pause"
  | "scan"
  | "deploy"
  | "status"
  | "control"
  | "arm"
  | "disarm"
  | "check"
  | "mix"
  | "snapshot"
  | "consent";

export type AgentTarget =
  | "gabriel"
  | "lucy"
  | "engr-keith"
  | "georgia-may"
  | "archivist"
  | "sentinel"
  | "dispatcher"
  | "scanner"
  | "deployer"
  | "gemma"
  | "all";

export interface NoisyCommand {
  source: CommandSource;
  command: CommandVerb;
  target: AgentTarget;
  params: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
  consentToken?: string;
}

export interface NoisyResponse {
  status: "ok" | "error" | "pending" | "denied";
  agent: AgentTarget;
  command: CommandVerb;
  result: Record<string, unknown>;
  timestamp: string;
  logged: boolean;
  sessionId?: string;
  denial?: string; // Voice of Refusal message
}

// ═══════════════════════════════════════════════════════
// AGENT REGISTRY
// ═══════════════════════════════════════════════════════

export interface AgentNode {
  name: AgentTarget;
  port: number;
  healthEndpoint: string;
  role: string;
  status: "online" | "offline" | "degraded";
}

export const AGENT_REGISTRY: Record<AgentTarget, { port: number; role: string }> = {
  gabriel:       { port: 7001, role: "orchestrator" },
  lucy:          { port: 7002, role: "dashboard" },
  "engr-keith":  { port: 7003, role: "audio-engine" },
  "georgia-may": { port: 7004, role: "voice-estate" },
  archivist:     { port: 7005, role: "provenance" },
  sentinel:      { port: 7006, role: "consent-guardian" },
  dispatcher:    { port: 7007, role: "workflow-trigger" },
  scanner:       { port: 7008, role: "audio-analysis" },
  deployer:      { port: 7009, role: "infrastructure" },
  gemma:         { port: 7010, role: "local-llm" },
  all:           { port: 0,    role: "broadcast" },
};

// ═══════════════════════════════════════════════════════
// SESSION STATE (pushed to Lucy every 500ms)
// ═══════════════════════════════════════════════════════

export interface SessionState {
  sessionId: string;
  recording: boolean;
  armed: boolean;
  sampleRate: number;    // 48000
  bitDepth: number;      // 32
  signalHealth: "green" | "yellow" | "red";
  activeAgents: AgentTarget[];
  phonemeMatrixFill: number; // 0.0 - 1.0
  lastCommand: NoisyCommand | null;
  lastResponse: NoisyResponse | null;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════
// DISCORD INTERACTION TYPES
// ═══════════════════════════════════════════════════════

export interface DiscordInteraction {
  type: number; // 1 = PING, 2 = APPLICATION_COMMAND
  data?: {
    name: string;
    options?: Array<{
      name: string;
      value: string | number | boolean;
    }>;
  };
  token: string;
  id: string;
}

// ═══════════════════════════════════════════════════════
// D1 COMMAND LOG RECORD
// ═══════════════════════════════════════════════════════

export interface CommandLogRecord {
  id: string;
  source: CommandSource;
  command: CommandVerb;
  target: AgentTarget;
  params: string; // JSON stringified
  session_id: string;
  consent_token: string | null;
  status: "ok" | "error" | "pending" | "denied";
  response: string; // JSON stringified
  created_at: string;
}
