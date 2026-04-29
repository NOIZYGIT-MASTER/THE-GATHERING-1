// ═══════════════════════════════════════════════════════════════
// NOIZY HEAVEN — Global Command Router
// Cloudflare Worker | TypeScript
// Robert Stephen Plowman | NOIZYFISH | April 2026
//
// Routes all commands from Gabriel (iPhone), Lucy (iPad),
// and Discord through to GOD agent mesh via CF Tunnel.
// Logs every command to D1. Enforces consent. Returns confirmations.
// ═══════════════════════════════════════════════════════════════

import { Env, NoisyCommand, NoisyResponse, AGENT_REGISTRY, AgentTarget, CommandVerb } from "./types";
import { handleDiscordInteraction, verifyDiscordSignature } from "./discord-handler";
import { logCommand } from "./command-logger";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ─── CORS for Gabriel/Lucy apps ───
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    try {
      // ─── Route: POST /command ───
      // Primary command endpoint. Gabriel, Lucy, Discord all route here.
      if (path === "/command" && request.method === "POST") {
        return await handleCommand(request, env);
      }

      // ─── Route: POST /discord ───
      // Discord interaction webhook endpoint
      if (path === "/discord" && request.method === "POST") {
        return await handleDiscord(request, env);
      }

      // ─── Route: GET /status ───
      // System-wide status check
      if (path === "/status" && request.method === "GET") {
        return await handleStatus(env);
      }

      // ─── Route: GET /agents ───
      // List all agents and their states
      if (path === "/agents" && request.method === "GET") {
        return await handleAgentList(env);
      }

      // ─── Route: GET /health ───
      // Heaven worker health check
      if (path === "/health") {
        return json({ status: "ok", service: "heaven", timestamp: now() });
      }

      // ─── Route: GET /session ───
      // Current session state (Lucy polls this or gets via WebSocket)
      if (path === "/session" && request.method === "GET") {
        return await handleSessionState(env);
      }

      // ─── Route: GET /log ───
      // Recent command history (Gabriel displays this)
      if (path === "/log" && request.method === "GET") {
        return await handleCommandLog(request, env);
      }

      return json({ error: "not_found", path }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.error("Heaven error:", message);
      return json({ status: "error", error: message, timestamp: now() }, 500);
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// COMMAND HANDLER — The core of Heaven
// ═══════════════════════════════════════════════════════════════

async function handleCommand(request: Request, env: Env): Promise<Response> {
  // Authenticate
  const authError = authenticate(request, env);
  if (authError) return authError;

  // Parse command
  const body = await request.json() as NoisyCommand;
  const { source, command, target, params, consentToken } = body;

  // Validate
  if (!source || !command || !target) {
    return json({ status: "error", error: "missing required fields: source, command, target" }, 400);
  }

  if (!AGENT_REGISTRY[target]) {
    return json({ status: "error", error: `unknown agent target: ${target}` }, 400);
  }

  const sessionId = body.sessionId || await getOrCreateSession(env);
  const timestamp = now();

  // ─── Consent check via Sentinel (for voice operations) ───
  const voiceCommands: CommandVerb[] = ["record", "arm", "consent"];
  if (voiceCommands.includes(command)) {
    const consentResult = await checkConsent(env, target, command, consentToken);
    if (consentResult.denied) {
      const denialResponse: NoisyResponse = {
        status: "denied",
        agent: "sentinel",
        command,
        result: {},
        timestamp,
        logged: true,
        sessionId,
        denial: consentResult.reason,
      };
      await logCommand(env, { ...body, sessionId, timestamp }, denialResponse);
      return json(denialResponse, 403);
    }
  }

  // ─── Route to GOD agent(s) via CF Tunnel ───
  let response: NoisyResponse;

  if (target === "all") {
    // Broadcast to all agents
    const results = await broadcastToAgents(env, body);
    response = {
      status: "ok",
      agent: "all",
      command,
      result: { agents: results },
      timestamp,
      logged: true,
      sessionId,
    };
  } else {
    // Route to specific agent
    const agentResult = await routeToAgent(env, target, body);
    response = {
      status: agentResult.ok ? "ok" : "error",
      agent: target,
      command,
      result: agentResult.data || {},
      timestamp,
      logged: true,
      sessionId,
    };
  }

  // ─── Log to D1 ───
  await logCommand(env, { ...body, sessionId, timestamp }, response);

  // ─── Push state update to Lucy via KV (she polls or subscribes) ───
  await pushStateUpdate(env, sessionId, body, response);

  return json(response);
}

// ═══════════════════════════════════════════════════════════════
// DISCORD HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleDiscord(request: Request, env: Env): Promise<Response> {
  // Verify Discord signature
  const signature = request.headers.get("x-signature-ed25519") || "";
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const body = await request.text();

  const isValid = await verifyDiscordSignature(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
  if (!isValid) {
    return json({ error: "invalid signature" }, 401);
  }

  const interaction = JSON.parse(body);
  return handleDiscordInteraction(interaction, env);
}

// ═══════════════════════════════════════════════════════════════
// STATUS & MONITORING
// ═══════════════════════════════════════════════════════════════

async function handleStatus(env: Env): Promise<Response> {
  const agents = Object.entries(AGENT_REGISTRY)
    .filter(([name]) => name !== "all")
    .map(([name, config]) => ({
      name,
      port: config.port,
      role: config.role,
    }));

  return json({
    status: "ok",
    service: "heaven",
    environment: env.ENVIRONMENT,
    agents,
    timestamp: now(),
  });
}

async function handleAgentList(env: Env): Promise<Response> {
  const healthChecks = await Promise.allSettled(
    Object.entries(AGENT_REGISTRY)
      .filter(([name]) => name !== "all")
      .map(async ([name, config]) => {
        try {
          const res = await fetch(`${env.TUNNEL_ORIGIN}:${config.port}/health`, {
            signal: AbortSignal.timeout(3000),
          });
          return { name, port: config.port, role: config.role, status: res.ok ? "online" : "degraded" };
        } catch {
          return { name, port: config.port, role: config.role, status: "offline" };
        }
      })
  );

  const agents = healthChecks.map((r) =>
    r.status === "fulfilled" ? r.value : { name: "unknown", status: "offline" }
  );

  return json({ agents, timestamp: now() });
}

async function handleSessionState(env: Env): Promise<Response> {
  const state = await env.GABRIEL_KV.get("current_session_state", "json");
  if (!state) {
    return json({ status: "no_active_session", timestamp: now() });
  }
  return json(state);
}

async function handleCommandLog(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const result = await env.COMMAND_LOG.prepare(
    "SELECT * FROM command_log ORDER BY created_at DESC LIMIT ?"
  ).bind(limit).all();

  return json({ commands: result.results, timestamp: now() });
}

// ═══════════════════════════════════════════════════════════════
// AGENT ROUTING — CF Tunnel to GOD
// ═══════════════════════════════════════════════════════════════

async function routeToAgent(
  env: Env,
  target: AgentTarget,
  command: NoisyCommand
): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  const agent = AGENT_REGISTRY[target];
  if (!agent || target === "all") {
    return { ok: false, data: { error: "invalid target" } };
  }

  try {
    const res = await fetch(`${env.TUNNEL_ORIGIN}:${agent.port}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json() as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "agent unreachable";
    return { ok: false, data: { error: message, agent: target } };
  }
}

async function broadcastToAgents(
  env: Env,
  command: NoisyCommand
): Promise<Array<{ agent: string; status: string }>> {
  const targets = Object.keys(AGENT_REGISTRY).filter((n) => n !== "all") as AgentTarget[];

  const results = await Promise.allSettled(
    targets.map(async (target) => {
      const result = await routeToAgent(env, target, { ...command, target });
      return { agent: target, status: result.ok ? "ok" : "error" };
    })
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { agent: "unknown", status: "error" }
  );
}

// ═══════════════════════════════════════════════════════════════
// CONSENT CHECK — Sentinel gate
// ═══════════════════════════════════════════════════════════════

async function checkConsent(
  env: Env,
  target: AgentTarget,
  command: CommandVerb,
  consentToken?: string
): Promise<{ denied: boolean; reason?: string }> {
  try {
    const sentinel = AGENT_REGISTRY["sentinel"];
    const res = await fetch(`${env.TUNNEL_ORIGIN}:${sentinel.port}/consent/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, command, consentToken }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const data = await res.json() as { reason?: string };
      return { denied: true, reason: data.reason || "Consent check failed" };
    }

    return { denied: false };
  } catch {
    // If Sentinel is unreachable, deny by default — fail closed
    return { denied: true, reason: "Sentinel unreachable — consent cannot be verified. Fail closed." };
  }
}

// ═══════════════════════════════════════════════════════════════
// STATE SYNC — Push updates for Lucy
// ═══════════════════════════════════════════════════════════════

async function pushStateUpdate(
  env: Env,
  sessionId: string,
  command: NoisyCommand,
  response: NoisyResponse
): Promise<void> {
  const state = {
    sessionId,
    lastCommand: command,
    lastResponse: response,
    timestamp: now(),
  };
  await env.GABRIEL_KV.put("current_session_state", JSON.stringify(state));
}

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function getOrCreateSession(env: Env): Promise<string> {
  const existing = await env.GABRIEL_KV.get("active_session_id");
  if (existing) return existing;

  const sessionId = `session_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await env.GABRIEL_KV.put("active_session_id", sessionId);
  return sessionId;
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

function authenticate(request: Request, env: Env): Response | null {
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${env.HEAVEN_AUTH_TOKEN}`) {
    return json({ status: "error", error: "unauthorized" }, 401);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function now(): string {
  return new Date().toISOString();
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
