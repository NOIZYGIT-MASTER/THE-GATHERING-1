// ============================================================
// NOIZY Discord Agent — GABRIEL Integration
// Routes requests from Discord to the NOIZY agent mesh.
//
// Architecture: Discord → NOIZY Bot → GABRIEL → Agent Mesh
//
// GABRIEL is the sovereign orchestrator. All agent mesh
// requests route through GABRIEL, never direct to sub-agents.
// ============================================================

import type { Env } from '../types';

export interface AgentRequest {
  from: string;         // Requesting agent (e.g., 'NOIZY_DISCORD')
  to: string;           // Target agent (e.g., 'GABRIEL', 'ENGR_KEITH')
  action: string;       // What to do
  payload: Record<string, unknown>;
  requestor: {
    discord_id: string;
    username: string;
    guild_id?: string;
    channel_id?: string;
  };
  timestamp: string;
}

export interface AgentResponse {
  from: string;
  status: 'ok' | 'error' | 'deferred' | 'blocked';
  data?: Record<string, unknown>;
  message?: string;
}

/**
 * Send a request to GABRIEL via D1 command queue.
 * GABRIEL processes commands asynchronously.
 *
 * This is the local-first pattern: commands are queued in D1,
 * GABRIEL picks them up on its next cycle.
 */
export async function sendToGabriel(
  env: Env,
  request: AgentRequest
): Promise<string> {
  const commandId = `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  try {
    // Ensure command queue table exists
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS gabriel_command_queue (
        command_id TEXT PRIMARY KEY,
        from_agent TEXT NOT NULL,
        to_agent TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        requestor TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        result TEXT,
        created_at TEXT NOT NULL,
        processed_at TEXT
      )`
    ).run();

    await env.DB.prepare(
      `INSERT INTO gabriel_command_queue
        (command_id, from_agent, to_agent, action, payload, requestor, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
      .bind(
        commandId,
        request.from,
        request.to,
        request.action,
        JSON.stringify(request.payload),
        JSON.stringify(request.requestor),
        request.timestamp
      )
      .run();
  } catch (err) {
    console.error('[GABRIEL] Command queue write failed:', err);
    throw err;
  }

  return commandId;
}

/**
 * Check the status of a GABRIEL command.
 */
export async function checkCommand(
  env: Env,
  commandId: string
): Promise<AgentResponse> {
  try {
    const row = await env.DB.prepare(
      `SELECT status, result, from_agent FROM gabriel_command_queue WHERE command_id = ?`
    )
      .bind(commandId)
      .first<{ status: string; result: string | null; from_agent: string }>();

    if (!row) {
      return { from: 'GABRIEL', status: 'error', message: 'Command not found' };
    }

    return {
      from: row.from_agent,
      status: row.status as AgentResponse['status'],
      data: row.result ? JSON.parse(row.result) : undefined,
    };
  } catch (err) {
    return { from: 'GABRIEL', status: 'error', message: String(err) };
  }
}

/**
 * Log an agent mesh interaction for the transparency ledger.
 */
export async function logMeshEvent(
  env: Env,
  event: {
    from_agent: string;
    to_agent: string;
    action: string;
    outcome: string;
    discord_user_id?: string;
  }
): Promise<void> {
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS agent_mesh_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_agent TEXT NOT NULL,
        to_agent TEXT NOT NULL,
        action TEXT NOT NULL,
        outcome TEXT NOT NULL,
        discord_user_id TEXT,
        timestamp TEXT NOT NULL
      )`
    ).run();

    await env.DB.prepare(
      `INSERT INTO agent_mesh_log (from_agent, to_agent, action, outcome, discord_user_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        event.from_agent,
        event.to_agent,
        event.action,
        event.outcome,
        event.discord_user_id ?? null,
        new Date().toISOString()
      )
      .run();
  } catch (err) {
    console.error('[MESH] Log write failed:', err);
  }
}
