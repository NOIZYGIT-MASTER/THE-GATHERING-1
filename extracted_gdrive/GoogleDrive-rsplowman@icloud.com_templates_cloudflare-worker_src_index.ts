/**
 * NOIZY Empire — Cloudflare Worker Template
 * Constitutional: Every request checks consent before processing.
 * GORUNFREE · Gospel Deal enforced in code.
 */

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  GABRIEL_URL: string; // e.g. https://mesh.noizy.ai  — only needed if calling the daemon directly
  ENVIRONMENT: string; // production | staging
}

// ── Architectural note ────────────────────────────────────────────────────────
// This template queries the LOCAL D1 `consent_matrix` directly (offline-first,
// sub-10ms at the edge). The canonical source of truth lives in the GABRIEL
// daemon SQLite — D1 must be kept in sync via a write-through pattern: grants
// and revokes that land on GABRIEL should replicate to D1, or vice versa.
// Divergence between the two stores is a silent Article II violation.

// ── GORUNFREE Constitutional Constants ───────────────────────────────────────
const FOUNDING_ROYALTY_FLOOR = 0.75;
const NOIZYKIDZ_TITHE = 0.01;

// ── Consent Gate ─────────────────────────────────────────────────────────────
async function checkConsent(db: D1Database, hvs_id: string, use_type: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM consent_matrix
       WHERE hvs_id = ? AND use_type = ? AND granted = 1
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY id DESC LIMIT 1`,
    )
    .bind(hvs_id, use_type)
    .first();
  return !!row;
}

// ── Royalty Guard ─────────────────────────────────────────────────────────────
function validateRoyaltySplit(split: number): void {
  if (split < FOUNDING_ROYALTY_FLOOR) {
    throw new Error(
      `CONSTITUTIONAL VIOLATION: royalty_split ${split} below founding floor ${FOUNDING_ROYALTY_FLOOR}`,
    );
  }
}

// ── Audit Logger ─────────────────────────────────────────────────────────────
async function auditLog(
  db: D1Database,
  event_type: string,
  actor: string,
  payload: unknown,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO estate_audit (hvs_id, event_type, actor, payload)
       VALUES (NULL, ?, ?, ?)`,
    )
    .bind(event_type, actor, JSON.stringify(payload))
    .run();
}

// ── CORS Headers ──────────────────────────────────────────────────────────────
function corsHeaders(origin: string = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ── Main Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      // ── Health ────────────────────────────────────────────────────────────
      if (url.pathname === "/health") {
        return Response.json(
          { ok: true, env: env.ENVIRONMENT, gorunfree: true },
          { headers: corsHeaders(origin) },
        );
      }

      // ── Example: consent-gated endpoint ──────────────────────────────────
      if (url.pathname === "/api/voice/synthesize" && request.method === "POST") {
        const body = (await request.json()) as { hvs_id: string; text: string };

        // CONSTITUTIONAL: consent check before any voice synthesis
        const hasConsent = await checkConsent(env.DB, body.hvs_id, "voice_synthesis");
        if (!hasConsent) {
          await auditLog(env.DB, "CONSENT_DENIED", "worker", {
            hvs_id: body.hvs_id,
            use_type: "voice_synthesis",
          });
          return Response.json(
            { error: "Consent not granted for voice_synthesis", hvs_id: body.hvs_id },
            { status: 403, headers: corsHeaders(origin) },
          );
        }

        await auditLog(env.DB, "VOICE_SYNTHESIS_REQUEST", body.hvs_id, {
          text_length: body.text.length,
        });

        // TODO: implement synthesis logic here
        return Response.json(
          { ok: true, message: "Synthesis queued" },
          { headers: corsHeaders(origin) },
        );
      }

      // ── Kill Switch mirror: POST /api/consent/revoke ─────────────────────
      // Article V — append-only. Inserts a new consent_matrix row with granted=0.
      // Pair with daemon's /estate/consent/revoke; write-through keeps them aligned.
      if (url.pathname === "/api/consent/revoke" && request.method === "POST") {
        const body = (await request.json()) as {
          hvs_id: string;
          use_type: string;
          revoked_by: string;
          reason?: string;
        };
        if (!body.hvs_id || !body.use_type || !body.revoked_by) {
          return Response.json(
            { error: "hvs_id, use_type, revoked_by required" },
            { status: 400, headers: corsHeaders(origin) },
          );
        }
        await env.DB.prepare(
          `INSERT INTO consent_matrix (hvs_id, use_type, granted, granted_by, scope, expires_at)
           VALUES (?, ?, 0, ?, ?, NULL)`,
        )
          .bind(body.hvs_id, body.use_type, body.revoked_by, body.reason ?? null)
          .run();
        await auditLog(env.DB, "CONSENT_REVOKED", body.revoked_by, {
          hvs_id: body.hvs_id,
          use_type: body.use_type,
          reason: body.reason ?? null,
        });
        return Response.json(
          { ok: true, hvs_id: body.hvs_id, use_type: body.use_type, granted: false },
          { headers: corsHeaders(origin) },
        );
      }

      return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders(origin) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      return Response.json({ error: message }, { status: 500, headers: corsHeaders(origin) });
    }
  },
} satisfies ExportedHandler<Env>;
