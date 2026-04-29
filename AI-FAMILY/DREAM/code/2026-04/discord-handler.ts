// ═══════════════════════════════════════════════════════════════
// NOIZY HEAVEN — Discord Bot Handler
// Receives Discord slash commands, maps them to NoisyCommands,
// routes through the same pipeline as Gabriel voice + Lucy touch.
// iPhone / Discord parity: same commands, same confirmations.
// ═══════════════════════════════════════════════════════════════

import { Env, NoisyCommand, DiscordInteraction, AGENT_REGISTRY, AgentTarget, CommandVerb } from "./types";
import { logCommand } from "./command-logger";

// Discord interaction types
const INTERACTION_PING = 1;
const INTERACTION_COMMAND = 2;

// Discord response types
const RESPONSE_PONG = 1;
const RESPONSE_CHANNEL_MESSAGE = 4;
const RESPONSE_DEFERRED = 5;

// ═══════════════════════════════════════════════════════════════
// SLASH COMMAND DEFINITIONS
// Register these with Discord API:
//
// /noizy record [target]     — Start recording
// /noizy stop [target]       — Stop recording
// /noizy play                — Play transport
// /noizy pause               — Pause transport
// /noizy status [target]     — Check agent status
// /noizy scan                — Run audio scan
// /noizy deploy [target]     — Deploy agent/system
// /noizy arm                 — Arm recording channels
// /noizy agents              — List all agent states
// /noizy session             — Show current session info
// ═══════════════════════════════════════════════════════════════

export async function handleDiscordInteraction(
  interaction: DiscordInteraction,
  env: Env
): Promise<Response> {
  // Handle Discord PING (verification)
  if (interaction.type === INTERACTION_PING) {
    return discordResponse({ type: RESPONSE_PONG });
  }

  // Handle slash commands
  if (interaction.type === INTERACTION_COMMAND && interaction.data) {
    return await handleSlashCommand(interaction, env);
  }

  return discordResponse({
    type: RESPONSE_CHANNEL_MESSAGE,
    data: { content: "Unknown interaction type." },
  });
}

async function handleSlashCommand(
  interaction: DiscordInteraction,
  env: Env
): Promise<Response> {
  const commandName = interaction.data?.name;
  const options = interaction.data?.options || [];

  // Parse options into a map
  const opts: Record<string, string | number | boolean> = {};
  for (const opt of options) {
    opts[opt.name] = opt.value;
  }

  // Map Discord command to NoisyCommand
  let command: CommandVerb;
  let target: AgentTarget = (opts.target as AgentTarget) || "gabriel";

  switch (commandName) {
    case "noizy":
      // Subcommand style: /noizy record engr-keith
      command = (opts.action as CommandVerb) || "status";
      target = (opts.target as AgentTarget) || "gabriel";
      break;

    case "record":
      command = "record";
      target = (opts.target as AgentTarget) || "engr-keith";
      break;

    case "stop":
      command = "stop";
      target = (opts.target as AgentTarget) || "engr-keith";
      break;

    case "play":
      command = "play";
      target = "engr-keith";
      break;

    case "pause":
      command = "pause";
      target = "engr-keith";
      break;

    case "status":
      command = "status";
      target = (opts.target as AgentTarget) || "all";
      break;

    case "scan":
      command = "scan";
      target = "scanner";
      break;

    case "deploy":
      command = "deploy";
      target = (opts.target as AgentTarget) || "deployer";
      break;

    case "arm":
      command = "arm";
      target = "engr-keith";
      break;

    case "agents":
      return await handleAgentsCommand(env);

    case "session":
      return await handleSessionCommand(env);

    default:
      return discordMessage(`Unknown command: \`${commandName}\``);
  }

  // Validate target
  if (!AGENT_REGISTRY[target]) {
    return discordMessage(`Unknown agent: \`${target}\`. Available: ${Object.keys(AGENT_REGISTRY).join(", ")}`);
  }

  // Build NoisyCommand
  const noisyCommand: NoisyCommand = {
    source: "discord",
    command,
    target,
    params: opts,
    timestamp: new Date().toISOString(),
  };

  // Route to GOD via tunnel
  try {
    const agent = AGENT_REGISTRY[target];
    const tunnelUrl = target === "all"
      ? `${env.TUNNEL_ORIGIN}:7001/command`  // Gabriel handles broadcast
      : `${env.TUNNEL_ORIGIN}:${agent.port}/command`;

    const res = await fetch(tunnelUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noisyCommand),
      signal: AbortSignal.timeout(8000),
    });

    const result = await res.json() as Record<string, unknown>;
    const sessionId = (result.sessionId as string) || "unknown";

    // Log to D1
    const noisyResponse = {
      status: res.ok ? "ok" as const : "error" as const,
      agent: target,
      command,
      result,
      timestamp: new Date().toISOString(),
      logged: true,
      sessionId,
    };
    await logCommand(env, { ...noisyCommand, sessionId, timestamp: noisyCommand.timestamp }, noisyResponse);

    // Format Discord response
    const statusEmoji = res.ok ? "✅" : "❌";
    const agentName = target.toUpperCase().replace("-", " ");
    return discordMessage(
      `${statusEmoji} **${agentName}** → \`${command}\`\n` +
      `Session: \`${sessionId}\`\n` +
      `\`\`\`json\n${JSON.stringify(result, null, 2).slice(0, 1800)}\n\`\`\``
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "agent unreachable";
    return discordMessage(`❌ **${target.toUpperCase()}** unreachable: ${message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// SPECIAL COMMANDS
// ═══════════════════════════════════════════════════════════════

async function handleAgentsCommand(env: Env): Promise<Response> {
  const agents = Object.entries(AGENT_REGISTRY)
    .filter(([name]) => name !== "all")
    .map(([name, config]) => `• **${name.toUpperCase()}** :${config.port} — ${config.role}`)
    .join("\n");

  return discordMessage(`**NOIZY Agent Mesh — 10 Nodes**\n\n${agents}`);
}

async function handleSessionCommand(env: Env): Promise<Response> {
  const state = await env.GABRIEL_KV.get("current_session_state", "json") as Record<string, unknown> | null;
  if (!state) {
    return discordMessage("No active session.");
  }
  return discordMessage(
    `**Active Session**\n\`\`\`json\n${JSON.stringify(state, null, 2).slice(0, 1800)}\n\`\`\``
  );
}

// ═══════════════════════════════════════════════════════════════
// DISCORD SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════

export async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToUint8Array(publicKey),
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"]
    );

    const message = new TextEncoder().encode(timestamp + body);
    const sig = hexToUint8Array(signature);

    return await crypto.subtle.verify("Ed25519", key, sig, message);
  } catch {
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function discordResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

function discordMessage(content: string): Response {
  return discordResponse({
    type: RESPONSE_CHANNEL_MESSAGE,
    data: { content },
  });
}
