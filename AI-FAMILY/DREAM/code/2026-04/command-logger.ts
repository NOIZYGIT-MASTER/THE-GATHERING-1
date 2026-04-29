// ═══════════════════════════════════════════════════════════════
// NOIZY HEAVEN — Command Logger
// Append-only D1 audit trail. Every command logged. No exceptions.
// ═══════════════════════════════════════════════════════════════

import { Env, NoisyCommand, NoisyResponse } from "./types";

export async function logCommand(
  env: Env,
  command: NoisyCommand & { sessionId: string; timestamp: string },
  response: NoisyResponse
): Promise<void> {
  try {
    await env.COMMAND_LOG.prepare(
      `INSERT INTO command_log (
        id, source, command, target, params,
        session_id, consent_token, status, response, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        command.source,
        command.command,
        command.target,
        JSON.stringify(command.params || {}),
        command.sessionId,
        command.consentToken || null,
        response.status,
        JSON.stringify(response.result || {}),
        command.timestamp
      )
      .run();
  } catch (err) {
    // Log failures must not break the command flow
    // But we surface them so they can be caught in monitoring
    console.error("D1 command_log write failed:", err);
  }
}
