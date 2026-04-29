// ═══════════════════════════════════════════════════════════════
// LUCY — WebSocket State Sync Server
// Real-time state push to iPad every 500ms.
// Receives all Gabriel commands, agent health, session state.
//
// iPad connects via WebSocket → Lucy pushes:
//   - Recording state (armed, recording, stopped)
//   - Signal health (green/yellow/red)
//   - Agent mesh status (all 10 nodes)
//   - Phoneme matrix fill percentage
//   - MICIP audio quality metrics
//   - Last command + response
//   - Transport state (play/stop/record)
//   - Cloudflare tunnel health
// ═══════════════════════════════════════════════════════════════

// ─── Types ───

export type AgentTarget =
  | "gabriel" | "lucy" | "engr-keith" | "georgia-may"
  | "archivist" | "sentinel" | "dispatcher" | "scanner"
  | "deployer" | "gemma";

export type SignalHealth = "green" | "yellow" | "red";
export type TransportState = "stopped" | "playing" | "recording" | "paused";

export interface AgentStatus {
  name: AgentTarget;
  port: number;
  status: "online" | "offline" | "degraded";
  lastSeen: string;
  role: string;
}

export interface AudioMetrics {
  sampleRate: number;
  bitDepth: number;
  peakDb: number;
  rmsDb: number;
  noiseFloorDb: number;
  signalToNoise: number;
  clipping: boolean;
}

export interface PhonemeMatrixState {
  totalPhonemes: number;
  capturedPhonemes: number;
  fillPercentage: number; // 0.0 - 1.0
  lastCapture: string;
  activeVoiceId: string | null;
}

export interface SessionState {
  sessionId: string;
  recording: boolean;
  armed: boolean;
  transport: TransportState;
  sampleRate: number;
  bitDepth: number;
  signalHealth: SignalHealth;
  agents: AgentStatus[];
  phonemeMatrix: PhonemeMatrixState;
  audioMetrics: AudioMetrics;
  tunnelHealth: "connected" | "degraded" | "disconnected";
  lastCommand: unknown;
  lastResponse: unknown;
  commandCount: number;
  sessionStart: string;
  timestamp: string;
}

// ─── Agent registry for health polling ───

const AGENTS: Array<{ name: AgentTarget; port: number; role: string }> = [
  { name: "gabriel",      port: 7001, role: "orchestrator" },
  { name: "lucy",         port: 7002, role: "dashboard" },
  { name: "engr-keith",   port: 7003, role: "audio-engine" },
  { name: "georgia-may",  port: 7004, role: "voice-estate" },
  { name: "archivist",    port: 7005, role: "provenance" },
  { name: "sentinel",     port: 7006, role: "consent-guardian" },
  { name: "dispatcher",   port: 7007, role: "workflow-trigger" },
  { name: "scanner",      port: 7008, role: "audio-analysis" },
  { name: "deployer",     port: 7009, role: "infrastructure" },
  { name: "gemma",        port: 7010, role: "local-llm" },
];

// ═══════════════════════════════════════════════════════════════
// LUCY STATE MANAGER
// Holds the canonical state, pushes to all connected iPads.
// ═══════════════════════════════════════════════════════════════

export class LucyStateManager {
  private connections: Set<WebSocket> = new Set();
  private state: SessionState;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private healthPollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = this.defaultState();
  }

  // ─── WebSocket lifecycle ───

  handleUpgrade(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.connections.add(server);

    server.addEventListener("message", (event) => {
      this.handleClientMessage(server, event.data as string);
    });

    server.addEventListener("close", () => {
      this.connections.delete(server);
    });

    server.addEventListener("error", () => {
      this.connections.delete(server);
    });

    // Send current state immediately on connect
    server.send(JSON.stringify({ type: "state", data: this.state }));

    return new Response(null, { status: 101, webSocket: client });
  }

  // ─── Client messages from iPad ───

  private handleClientMessage(ws: WebSocket, raw: string): void {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case "command":
          // iPad sent a touch command (transport, mix, etc.)
          // Forward to Gabriel for routing
          this.forwardToGabriel(msg.data);
          break;

        case "ping":
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
          break;

        case "request_state":
          ws.send(JSON.stringify({ type: "state", data: this.state }));
          break;
      }
    } catch {
      // Invalid message — ignore
    }
  }

  // ─── State updates (called by Gabriel when commands execute) ───

  updateFromCommand(command: unknown, response: unknown): void {
    this.state.lastCommand = command;
    this.state.lastResponse = response;
    this.state.commandCount++;
    this.state.timestamp = new Date().toISOString();

    // Parse transport state changes
    const cmd = command as { command?: string };
    if (cmd.command === "record") {
      this.state.recording = true;
      this.state.transport = "recording";
    } else if (cmd.command === "stop") {
      this.state.recording = false;
      this.state.transport = "stopped";
    } else if (cmd.command === "play") {
      this.state.transport = "playing";
    } else if (cmd.command === "pause") {
      this.state.transport = "paused";
    } else if (cmd.command === "arm") {
      this.state.armed = true;
    } else if (cmd.command === "disarm") {
      this.state.armed = false;
    }

    this.broadcastState();
  }

  updateAgentHealth(agents: AgentStatus[]): void {
    this.state.agents = agents;
    this.state.timestamp = new Date().toISOString();
  }

  updateAudioMetrics(metrics: AudioMetrics): void {
    this.state.audioMetrics = metrics;
    this.state.signalHealth = this.calculateSignalHealth(metrics);
    this.state.timestamp = new Date().toISOString();
  }

  updatePhonemeMatrix(matrix: PhonemeMatrixState): void {
    this.state.phonemeMatrix = matrix;
    this.state.timestamp = new Date().toISOString();
  }

  updateTunnelHealth(status: "connected" | "degraded" | "disconnected"): void {
    this.state.tunnelHealth = status;
    this.state.timestamp = new Date().toISOString();
  }

  // ─── Broadcast to all connected iPads ───

  private broadcastState(): void {
    const payload = JSON.stringify({ type: "state", data: this.state });
    for (const ws of this.connections) {
      try {
        ws.send(payload);
      } catch {
        this.connections.delete(ws);
      }
    }
  }

  // ─── Start 500ms sync loop ───

  startSync(): void {
    if (this.syncInterval) return;

    // Push state every 500ms
    this.syncInterval = setInterval(() => {
      this.state.timestamp = new Date().toISOString();
      this.broadcastState();
    }, 500);

    // Poll agent health every 10s
    this.healthPollInterval = setInterval(() => {
      this.pollAgentHealth();
    }, 10000);
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.healthPollInterval) {
      clearInterval(this.healthPollInterval);
      this.healthPollInterval = null;
    }
  }

  // ─── Health polling ───

  private async pollAgentHealth(): Promise<void> {
    const results = await Promise.allSettled(
      AGENTS.map(async (agent) => {
        try {
          const res = await fetch(`http://${agent.name}:${agent.port}/health`, {
            signal: AbortSignal.timeout(2000),
          });
          return {
            name: agent.name,
            port: agent.port,
            role: agent.role,
            status: res.ok ? "online" as const : "degraded" as const,
            lastSeen: new Date().toISOString(),
          };
        } catch {
          return {
            name: agent.name,
            port: agent.port,
            role: agent.role,
            status: "offline" as const,
            lastSeen: "",
          };
        }
      })
    );

    this.state.agents = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { name: "gabriel" as AgentTarget, port: 0, role: "unknown", status: "offline" as const, lastSeen: "" }
    );
  }

  // ─── Forward iPad touch commands to Gabriel ───

  private async forwardToGabriel(command: unknown): Promise<void> {
    try {
      const res = await fetch("http://gabriel:7001/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...command as object, source: "lucy" }),
        signal: AbortSignal.timeout(5000),
      });
      const result = await res.json();
      this.updateFromCommand(command, result);
    } catch (err) {
      console.error("Lucy → Gabriel forward failed:", err);
    }
  }

  // ─── Signal health calculation ───

  private calculateSignalHealth(metrics: AudioMetrics): SignalHealth {
    if (metrics.clipping || metrics.signalToNoise < 20) return "red";
    if (metrics.signalToNoise < 40 || metrics.peakDb > -3) return "yellow";
    return "green";
  }

  // ─── Default state ───

  private defaultState(): SessionState {
    return {
      sessionId: "",
      recording: false,
      armed: false,
      transport: "stopped",
      sampleRate: 48000,
      bitDepth: 32,
      signalHealth: "green",
      agents: AGENTS.map((a) => ({
        ...a,
        status: "offline" as const,
        lastSeen: "",
      })),
      phonemeMatrix: {
        totalPhonemes: 0,
        capturedPhonemes: 0,
        fillPercentage: 0,
        lastCapture: "",
        activeVoiceId: null,
      },
      audioMetrics: {
        sampleRate: 48000,
        bitDepth: 32,
        peakDb: -60,
        rmsDb: -60,
        noiseFloorDb: -80,
        signalToNoise: 60,
        clipping: false,
      },
      tunnelHealth: "disconnected",
      lastCommand: null,
      lastResponse: null,
      commandCount: 0,
      sessionStart: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Accessors ───

  getState(): SessionState {
    return this.state;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════

export const lucyState = new LucyStateManager();
