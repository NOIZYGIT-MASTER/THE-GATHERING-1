/**
 * HEAVEN — NOIZY HVS Consent Kernel API
 * Cloudflare Worker — gabriel_db D1 backend
 *
 * Author: Robert Stephen Plowman (RSP_001)
 * Version: 18.0.0 — April 2026 (GORUNFREE + EDGE CORE live)
 *
 * Consent as executable code.
 * Provenance as default.
 * Revocation as sacred.
 * Compensation as automatic.
 *
 * Routes (43 total):
 *   GET  /                                   (public — API index)
 *   GET  /health                             (public)
 *   GET  /dashboard                          (public — live HTML dashboard with health metrics)
 *   GET  /status                             (public — minimal JSON for monitoring systems)
 *   GET  /gabriel                            (public — Gabriel edge status)
 *   GET  /api/v1/actors
 *   GET  /api/v1/actors/:id
 *   POST /api/v1/actors
 *   GET  /api/v1/actors/:id/never-clauses
 *   GET  /api/v1/actors/:id/descendants
 *   GET  /api/v1/actors/:id/consent-tokens
 *   GET  /api/v1/actors/:id/voice-dna
 *   POST /api/v1/actors/:id/voice-dna
 *   GET  /api/v1/actors/:id/estate
 *   GET  /api/v1/consent-tokens
 *   POST /api/v1/consent-tokens
 *   POST /api/v1/consent-tokens/:id/revoke  (kill switch)
 *   GET  /api/v1/descendants/:id
 *   POST /api/v1/descendants
 *   POST /api/v1/synth-requests             (Never Clause enforced)
 *   GET  /api/v1/synth-requests/:id
 *   GET  /api/v1/licenses
 *   POST /api/v1/licenses
 *   GET  /api/v1/licensees
 *   POST /api/v1/licensees
 *   GET  /api/v1/ledger
 *   POST /api/v1/ledger/append              (DreamChamber usage reporting)
 *   GET  /api/v1/rate-table
 *   GET  /api/v1/union-tiers
 *   GET  /api/v1/estates
 *   GET  /api/v1/premis
 *   GET  /api/v1/stats
 *   GET  /api/v1/kpi/trust
 *   GET  /api/v1/kpi/safety
 *   GET  /api/v1/kpi/revenue
 *   GET  /api/v1/kpi/quality
 *   GET  /api/v1/kpi/risk
 *   GET  /api/v1/enterprise/audit
 *
 * GORUNFREE Routes:
 *   GET  /preflight                          (pre-flight insight)
 *   GET  /provenance/:id                     (provenance trail)
 *   GET  /provenance/:id/export              (export formats)
 *   GET  /absence/gaps                       (creative gaps)
 *   GET  /absence/archive                    (resurrection candidates)
 *   POST /absence/commission                 (commission workflow)
 *   GET  /absence/representation             (representation balance)
 */

import { dashboardHTML } from "./dashboard.js";
import { landingHTML } from "./landing.js";
import { handleWebhook } from "./webhooks.js";
import { handleDashboard, handleStatus } from "./routes/dashboard.js";

// GORUNFREE routes
import { handlePreflight } from "./routes/preflight.js";
import { handleProvenance, handleProvenanceExport } from "./routes/provenance.js";
import {
  handleAbsenceGaps,
  handleAbsenceArchive,
  handleAbsenceCommission,
  handleAbsenceRepresentation,
} from "./routes/absence.js";

// Operator routes (audit-first pattern)
import {
  handleOperatorApprove,
  handleTokenIssue,
  handleTokenValidate,
  handleOperatorStatus,
  handleOperatorAudit,
  handleFreezeRecord,
  handleFreezeResolve,
} from "./routes/operator.js";

// Creator trust routes (public, read-only, calm)
import { handleTrustStatus, handleTrustChanges } from "./routes/trust.js";

// EDGE CORE: Runtime startup assertions
import { assertAuditReadyCached } from "./edge-core/startup_assertions.js";

// Transparency and compliance routes
import { handleTransparency } from "./routes/transparency.js";
import { handleOperatorAuditDiff, handleCreatorDiff } from "./routes/audit-diff.js";
import { handleComplianceExport } from "./routes/compliance-export.js";
import { handleVerifyBundle } from "./routes/verify-bundle.js";
import { handleAnchorStatus, handleAnchorStatusWidget } from "./routes/anchor-status.js";
import { handleProofCoverage, handleProofCoverageWidget } from "./routes/proof-coverage.js";

// Chaos Arena and Voice Market
import { handleChaosArenaAPI } from "./chaos-arena/index.js";
import { handleVoiceMarketAPI } from "./voice-market/index.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-NOIZY-Key",
  "X-Powered-By": "HEAVEN/RSP_001",
  "Cache-Control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function err(message, status = 400) {
  return json({ error: message, status }, status);
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function authenticate(request, env) {
  const key =
    request.headers.get("X-NOIZY-Key") ||
    request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!env.NOIZY_API_KEY) {
    // Fail-closed unless explicitly in dev mode.
    // Doctrine: misconfiguration must surface, not silently reopen the gate.
    if (env.NOIZY_ENV === "development") return true;
    console.error(
      `[SECURITY] NOIZY_API_KEY missing in env=${env.NOIZY_ENV || "unknown"} — request denied`,
    );
    return false;
  }
  if (!key) return false;
  return key === env.NOIZY_API_KEY;
}

// ─── Rate Limiter (in-memory; free tier KV has 1000 writes/day cap) ─────────
// Uses module-level Map that persists across requests in the same isolate.
// Not cross-region accurate but zero KV cost.

const _rlMap = new Map();

async function checkRateLimit(_kv, ip, limit = 60, windowSec = 60) {
  const now = Math.floor(Date.now() / 1000);
  const entry = _rlMap.get(ip);
  if (!entry || now - entry.ts >= windowSec) {
    _rlMap.set(ip, { count: 1, ts: now });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, reset: windowSec - (now - entry.ts) };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

// ─── Cache API (free, no limits) ─────────────────────────────────────────────
// Replaces KV for hot read-through cache. KV still used for persistent state.

async function cacheGet(request, key) {
  try {
    const cache = caches.default;
    const cacheKey = new Request(`https://cache.noizy.internal/${key}`, request);
    const cached = await cache.match(cacheKey);
    if (!cached) return null;
    return await cached.json();
  } catch {
    return null;
  }
}

async function cacheSet(request, key, value, ttlSec = 60) {
  try {
    const cache = caches.default;
    const cacheKey = new Request(`https://cache.noizy.internal/${key}`, request);
    const resp = new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttlSec}`,
      },
    });
    await cache.put(cacheKey, resp);
  } catch {
    /* cache failures are non-fatal */
  }
}

async function cacheInvalidate(request, ...keys) {
  try {
    const cache = caches.default;
    for (const key of keys) {
      await cache.delete(new Request(`https://cache.noizy.internal/${key}`, request));
    }
  } catch {
    /* non-fatal */
  }
}

// ─── KV Cache (DEPRECATED for hot reads — kept for compat, now no-op) ────────

async function kvGet(_kv, _key) {
  return null; // Force re-compute; real reads go through cacheGet now
}

async function kvSet(_kv, _key, _value, _ttlSec = 300) {
  // No-op to avoid KV write limits; cacheSet is used instead
}

async function kvInvalidate(_kv, ..._keys) {
  // No-op
}

// Returns a prepared D1 statement ready for db.batch(). Does NOT execute.
// Use this when a state change and its ledger record must be atomic.
function ledgerAppendStmt(db, event) {
  return db
    .prepare(
      `
      INSERT INTO noizy_ledger
        (event_id, actor_id, descendant_id, licensee_id, license_id,
         consent_token_id, event_type, payload_json, amount_cad,
         actor_share_cad, noizy_share_cad, union_share_cad, source_system, recorded_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `,
    )
    .bind(
      event.event_id || uuid(),
      event.actor_id || null,
      event.descendant_id || null,
      event.licensee_id || null,
      event.license_id || null,
      event.consent_token_id || null,
      event.event_type,
      JSON.stringify(event.payload || {}),
      event.amount_cad || 0,
      event.actor_share_cad || 0,
      event.noizy_share_cad || 0,
      event.union_share_cad || 0,
      event.source_system || "GABRIEL",
      now(),
    );
}

// Loud ledger write. Throws on failure — ledger is append-only and a write
// miss breaks the provenance chain. Outer router catch will surface as 500.
async function ledgerAppend(db, event) {
  await ledgerAppendStmt(db, event).run();
}

// ─── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const db = env.GABRIEL_DB;
    const kv = env.GABRIEL_KV;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // EDGE CORE: Assert audit infrastructure is ready
    // Skip for health check to allow monitoring during outages
    if (path !== "/health") {
      try {
        await assertAuditReadyCached(env, ctx);
      } catch (auditErr) {
        console.error("[EDGE CORE]", auditErr.message);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Service unavailable — audit infrastructure not ready",
            edge_core: auditErr.message,
          }),
          {
            status: 503,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }
    }

    try {
      // Rate limiting (60 req/min per IP, uses KV)
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const rl = await checkRateLimit(kv, ip);
      if (!rl.allowed) {
        return json({ error: "Rate limit exceeded", retry_after: rl.reset }, 429);
      }

      // Auth check (skip for health, dashboard, status, root, api index, gabriel status, webhooks, GORUNFREE, OPTIONS)
      if (
        path !== "/health" &&
        path !== "/dashboard" &&
        path !== "/status" &&
        path !== "/" &&
        path !== "/api/v1" &&
        path !== "/gabriel" &&
        path !== "/preflight" &&
        !path.startsWith("/webhooks") &&
        !path.startsWith("/provenance") &&
        !path.startsWith("/absence") &&
        path !== "/api/dispatch" &&
        !authenticate(request, env)
      ) {
        return err("Unauthorized — provide X-NOIZY-Key header", 401);
      }

      // ── Webhooks ────────────────────────────────────────────────────────────
      if (path.startsWith("/webhooks")) {
        return handleWebhook(request, env);
      }
      // ── Health ──────────────────────────────────────────────────────────────
      if (path === "/health" && method === "GET") {
        const cached = await cacheGet(request, "health");
        if (cached) return json(cached);

        const actorCount = await db.prepare("SELECT COUNT(*) as c FROM hvs_actors").first();
        const ledgerCount = await db.prepare("SELECT COUNT(*) as c FROM noizy_ledger").first();
        const tokenCount = await db.prepare("SELECT COUNT(*) as c FROM hvs_consent_tokens").first();
        const data = {
          status: "LIVE",
          version: env.NOIZY_VERSION,
          environment: env.NOIZY_ENV,
          database: "gabriel_db",
          actors: actorCount?.c || 0,
          consent_tokens: tokenCount?.c || 0,
          ledger_events: ledgerCount?.c || 0,
          timestamp: now(),
          uptime: "edge",
          mission:
            "Consent as executable code. Provenance as default. Revocation as sacred. Compensation as automatic.",
        };
        await cacheSet(request, "health", data, 60); // cache 60s (KV minimum TTL)
        return json(data);
      }

      // ── Dispatch — forward to central-gateway mesh on GOD ──────────────────
      if (path === "/api/dispatch" && method === "POST") {
        const body = await request.json();
        const { actor, device, intent, target } = body;
        if (!actor || !target || !intent) {
          return err("actor, target, and intent required");
        }

        const meshOrigin = env.MESH_ORIGIN || "http://127.0.0.1:9696";
        const meshHeaders = { "Content-Type": "application/json" };

        // CF Access Service Token headers (for tunnel-protected mesh)
        if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
          meshHeaders["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
          meshHeaders["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
        }

        try {
          const meshRes = await fetch(`${meshOrigin}/dispatch`, {
            method: "POST",
            headers: meshHeaders,
            body: JSON.stringify(body),
          });
          const meshData = await meshRes.json();

          await ledgerAppend(db, {
            event_type: "DISPATCH",
            actor_id: actor,
            payload: { intent, target, device, mesh_status: meshRes.status },
          });

          return json({
            ok: meshRes.ok,
            dispatch: meshData,
            timestamp: now(),
          });
        } catch (meshErr) {
          const detail = meshErr instanceof Error ? meshErr.message : "Mesh unreachable";
          await ledgerAppend(db, {
            event_type: "DISPATCH_ERROR",
            actor_id: actor,
            payload: { intent, target, error: detail },
          });
          return json({ error: "Mesh unreachable", detail }, 502);
        }
      }

      // ── Actors ──────────────────────────────────────────────────────────────
      if (path === "/api/v1/actors" && method === "GET") {
        const cached = await cacheGet(request, "actors:all");
        if (cached) return json(cached);
        const { results } = await db
          .prepare("SELECT * FROM hvs_actors ORDER BY onboarded_at DESC")
          .all();
        const data = { actors: results };
        await cacheSet(request, "actors:all", data, 120);
        return json(data);
      }

      if (path === "/api/v1/actors" && method === "POST") {
        const body = await request.json();
        const {
          actor_id,
          display_name,
          legal_name,
          email,
          country,
          is_founding,
          union_member,
          union_name,
        } = body;
        if (!actor_id || !display_name) return err("actor_id and display_name are required");

        // Graceful duplicate — return existing actor rather than 500 on UNIQUE conflict
        const existing = await db
          .prepare(
            "SELECT * FROM hvs_actors WHERE actor_id = ? OR (email IS NOT NULL AND email = ?)",
          )
          .bind(actor_id, email || "")
          .first();
        if (existing) {
          return json(
            {
              actor: existing,
              conflict: true,
              message: "Actor already registered — sovereignty intact",
            },
            200,
          );
        }

        await db
          .prepare(
            `
          INSERT INTO hvs_actors (actor_id, display_name, legal_name, email, country, is_founding, union_member, union_name)
          VALUES (?,?,?,?,?,?,?,?)
        `,
          )
          .bind(
            actor_id,
            display_name,
            legal_name || null,
            email || null,
            country || "CA",
            is_founding ? 1 : 0,
            union_member ? 1 : 0,
            union_name || null,
          )
          .run();

        await ledgerAppend(db, {
          actor_id,
          event_type: "system.audit",
          payload: { action: "actor.created", display_name, is_founding },
        });

        const actor = await db
          .prepare("SELECT * FROM hvs_actors WHERE actor_id = ?")
          .bind(actor_id)
          .first();
        await cacheInvalidate(request, "actors:all", "health");
        return json({ actor }, 201);
      }

      const actorMatch = path.match(/^\/api\/v1\/actors\/([^/]+)$/);
      if (actorMatch && method === "GET") {
        const actor = await db
          .prepare("SELECT * FROM hvs_actors WHERE actor_id = ?")
          .bind(actorMatch[1])
          .first();
        if (!actor) return err("Actor not found", 404);
        return json({ actor });
      }

      const neverClausesMatch = path.match(/^\/api\/v1\/actors\/([^/]+)\/never-clauses$/);
      if (neverClausesMatch && method === "GET") {
        const { results } = await db
          .prepare("SELECT * FROM hvs_never_clauses WHERE actor_id = ? ORDER BY clause_id")
          .bind(neverClausesMatch[1])
          .all();
        return json({ never_clauses: results, count: results.length });
      }

      const descendantsMatch = path.match(/^\/api\/v1\/actors\/([^/]+)\/descendants$/);
      if (descendantsMatch && method === "GET") {
        const { results } = await db
          .prepare("SELECT * FROM hvs_descendants WHERE actor_id = ? ORDER BY created_at DESC")
          .bind(descendantsMatch[1])
          .all();
        return json({ descendants: results, count: results.length });
      }

      const consentTokensActorMatch = path.match(/^\/api\/v1\/actors\/([^/]+)\/consent-tokens$/);
      if (consentTokensActorMatch && method === "GET") {
        const { results } = await db
          .prepare("SELECT * FROM hvs_consent_tokens WHERE actor_id = ? ORDER BY issued_at DESC")
          .bind(consentTokensActorMatch[1])
          .all();
        return json({ consent_tokens: results, count: results.length });
      }

      // ── Consent Tokens ──────────────────────────────────────────────────────
      if (path === "/api/v1/consent-tokens" && method === "POST") {
        const body = await request.json();
        const {
          actor_id,
          descendant_id,
          use_categories,
          territories,
          languages,
          licensee_id,
          time_window_start,
          time_window_end,
          expires_at,
        } = body;
        if (!actor_id || !use_categories) return err("actor_id and use_categories are required");

        const actor = await db
          .prepare("SELECT * FROM hvs_actors WHERE actor_id = ?")
          .bind(actor_id)
          .first();
        if (!actor) return err("Actor not found", 404);
        if (actor.status !== "active")
          return err(`Actor status is ${actor.status} — cannot issue consent token`);

        const token_id = uuid();
        const token_hash = await hashToken(token_id + actor_id + now());

        // Atomic: INSERT + ledger event land together or not at all.
        const insertStmt = db
          .prepare(
            `
          INSERT INTO hvs_consent_tokens
            (token_id, actor_id, descendant_id, token_hash, use_categories, territories,
             languages, time_window_start, time_window_end, licensee_id, expires_at, status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,'active')
        `,
          )
          .bind(
            token_id,
            actor_id,
            descendant_id || null,
            token_hash,
            JSON.stringify(use_categories),
            JSON.stringify(territories || ["GLOBAL"]),
            JSON.stringify(languages || ["*"]),
            time_window_start || null,
            time_window_end || null,
            licensee_id || null,
            expires_at || null,
          );

        const ledgerStmt = ledgerAppendStmt(db, {
          actor_id,
          descendant_id: descendant_id || null,
          consent_token_id: token_id,
          event_type: "consent.issued",
          payload: { use_categories, territories, licensee_id },
        });

        await db.batch([insertStmt, ledgerStmt]);

        const token = await db
          .prepare("SELECT * FROM hvs_consent_tokens WHERE token_id = ?")
          .bind(token_id)
          .first();
        await cacheInvalidate(request, "health");
        return json({ consent_token: token }, 201);
      }

      // Kill switch — revoke consent token (idempotent, race-safe, atomic)
      const revokeMatch = path.match(/^\/api\/v1\/consent-tokens\/([^/]+)\/revoke$/);
      if (revokeMatch && method === "POST") {
        const token_id = revokeMatch[1];
        const body = await request.json().catch(() => null);
        if (body === null) return err("Invalid JSON body", 400);

        const token = await db
          .prepare("SELECT * FROM hvs_consent_tokens WHERE token_id = ?")
          .bind(token_id)
          .first();
        if (!token) return err("Consent token not found", 404);

        // Idempotent: if already revoked, return existing state.
        if (token.status === "revoked") {
          return json({
            status: "revoked",
            message: "Token was already revoked. State is unchanged.",
            token_id,
            revoked_at: token.revoked_at,
            already_revoked: true,
          });
        }

        const revoked_at = now();
        const reason = body.reason || "Actor revoked consent";

        // Race-safe UPDATE: only change row if still active. Atomic with ledger.
        const updateStmt = db
          .prepare(
            `UPDATE hvs_consent_tokens
             SET status = 'revoked', revoked_at = ?, revocation_reason = ?
             WHERE token_id = ? AND status = 'active'`,
          )
          .bind(revoked_at, reason, token_id);

        const ledgerStmt = ledgerAppendStmt(db, {
          actor_id: token.actor_id,
          descendant_id: token.descendant_id,
          consent_token_id: token_id,
          event_type: "kill_switch.activated",
          payload: { reason, token_id },
        });

        const results = await db.batch([updateStmt, ledgerStmt]);

        // If UPDATE changed 0 rows, we lost a race — someone else revoked it.
        // Return their revocation as ours (idempotent), don't double-log.
        if (results[0].meta.changes === 0) {
          const fresh = await db
            .prepare("SELECT revoked_at FROM hvs_consent_tokens WHERE token_id = ?")
            .bind(token_id)
            .first();
          return json({
            status: "revoked",
            message: "Token was already revoked concurrently. State is unchanged.",
            token_id,
            revoked_at: fresh?.revoked_at || revoked_at,
            already_revoked: true,
            race_resolved: true,
          });
        }

        await cacheInvalidate(request, "health");
        return json({
          status: "revoked",
          message:
            "Your voice is at rest. No new synthesis is possible. All existing licenses are flagged for review.",
          token_id,
          revoked_at,
        });
      }

      // ── Descendants ──────────────────────────────────────────────────────────
      if (path === "/api/v1/descendants" && method === "POST") {
        const body = await request.json();
        const {
          actor_id,
          parent_dna_id,
          name,
          character_type,
          emotional_tags,
          consent_scope,
          licensing_enabled,
          approval_required,
          synthesis_model,
        } = body;
        if (!actor_id || !parent_dna_id || !name)
          return err("actor_id, parent_dna_id, and name required");

        // Get actor's royalty floor
        const actor = await db
          .prepare("SELECT * FROM hvs_actors WHERE actor_id = ?")
          .bind(actor_id)
          .first();
        if (!actor) return err("Actor not found", 404);
        const royalty_floor = actor.is_founding ? 85.0 : 75.0;

        const descendant_id = uuid();
        await db
          .prepare(
            `
          INSERT INTO hvs_descendants
            (descendant_id, actor_id, parent_dna_id, name, character_type, emotional_tags,
             consent_scope, licensing_enabled, approval_required, synthesis_model, royalty_floor_pct)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `,
          )
          .bind(
            descendant_id,
            actor_id,
            parent_dna_id,
            name,
            character_type || null,
            JSON.stringify(emotional_tags || []),
            consent_scope || "private",
            licensing_enabled ? 1 : 0,
            approval_required !== false ? 1 : 0,
            synthesis_model || null,
            royalty_floor,
          )
          .run();

        await ledgerAppend(db, {
          actor_id,
          descendant_id,
          event_type: "descendant.created",
          payload: { name, character_type, consent_scope, royalty_floor },
        });

        const descendant = await db
          .prepare("SELECT * FROM hvs_descendants WHERE descendant_id = ?")
          .bind(descendant_id)
          .first();
        await cacheInvalidate(request, "health");
        return json({ descendant }, 201);
      }

      const descendantMatch = path.match(/^\/api\/v1\/descendants\/([^/]+)$/);
      if (descendantMatch && method === "GET") {
        const d = await db
          .prepare("SELECT * FROM hvs_descendants WHERE descendant_id = ?")
          .bind(descendantMatch[1])
          .first();
        if (!d) return err("Descendant not found", 404);
        return json({ descendant: d });
      }

      // ── Synth Requests (Never Clause Enforced) ───────────────────────────────
      if (path === "/api/v1/synth-requests" && method === "POST") {
        const body = await request.json();
        const {
          actor_id,
          descendant_id,
          consent_token_id,
          use_category,
          script_hash,
          emotional_profile,
          licensee_id,
        } = body;
        if (!actor_id || !descendant_id || !consent_token_id || !use_category) {
          return err("actor_id, descendant_id, consent_token_id, and use_category are required");
        }

        // 1. Validate consent token
        const token = await db
          .prepare(
            "SELECT * FROM hvs_consent_tokens WHERE token_id = ? AND actor_id = ? AND status = ?",
          )
          .bind(consent_token_id, actor_id, "active")
          .first();
        if (!token) {
          await ledgerAppend(db, {
            actor_id,
            descendant_id,
            event_type: "synth.blocked",
            payload: {
              reason: "No valid active consent token",
              consent_token_id,
            },
          });
          return err("No valid active consent token — synthesis blocked", 403);
        }

        // 2. Check token expiry
        if (token.expires_at && new Date(token.expires_at) < new Date()) {
          await db
            .prepare("UPDATE hvs_consent_tokens SET status = ? WHERE token_id = ?")
            .bind("expired", consent_token_id)
            .run();
          await ledgerAppend(db, {
            actor_id,
            event_type: "consent.expired",
            payload: { consent_token_id },
          });
          return err("Consent token has expired — synthesis blocked", 403);
        }

        // 3. Never Clause check
        const { results: never_clauses } = await db
          .prepare("SELECT * FROM hvs_never_clauses WHERE actor_id = ? AND is_global = 1")
          .bind(actor_id)
          .all();

        // Doctrine: Never Clauses are immovable. An actor with zero clauses
        // is unprotected — fail closed and alert, never synthesize.
        if (!never_clauses || never_clauses.length === 0) {
          await ledgerAppend(db, {
            actor_id,
            descendant_id,
            consent_token_id,
            event_type: "never_clauses.missing",
            payload: {
              use_category,
              blocker: "actor has zero global Never Clauses — synthesis denied",
            },
          });
          return err(
            "Actor Never Clauses not provisioned — synthesis blocked. Contact support to complete onboarding.",
            403,
          );
        }

        // Check use_category against known never clause categories
        const blockedClause = never_clauses.find((nc) => {
          const cat = nc.category.toLowerCase();
          const uc = use_category.toLowerCase();
          return (
            (cat === "political" && (uc.includes("politic") || uc.includes("propaganda"))) ||
            (cat === "sexual" &&
              (uc.includes("adult") || uc.includes("sexual") || uc.includes("porn"))) ||
            (cat === "weapons" &&
              (uc.includes("weapon") || uc.includes("violence") || uc.includes("harm"))) ||
            (cat === "deception" &&
              (uc.includes("deceiv") || uc.includes("impersonat") || uc.includes("fraud"))) ||
            (cat === "hate" && (uc.includes("hate") || uc.includes("demean"))) ||
            (cat === "transfer" && (uc.includes("transfer") || uc.includes("sublicens")))
          );
        });

        const request_id = uuid();

        if (blockedClause) {
          await db
            .prepare(
              `
            INSERT INTO hvs_synth_requests
              (request_id, actor_id, descendant_id, consent_token_id, licensee_id,
               script_hash, use_category, never_clause_check, blocked_clause_id, status)
            VALUES (?,?,?,?,?,?,?,'blocked',?,'blocked')
          `,
            )
            .bind(
              request_id,
              actor_id,
              descendant_id,
              consent_token_id,
              licensee_id || null,
              script_hash || null,
              use_category,
              blockedClause.clause_id,
            )
            .run();

          await ledgerAppend(db, {
            actor_id,
            descendant_id,
            consent_token_id,
            event_type: "never_clause.blocked",
            payload: {
              clause_code: blockedClause.clause_code,
              use_category,
              request_id,
            },
          });

          return json(
            {
              status: "blocked",
              request_id,
              blocked_by: blockedClause.clause_code,
              message: blockedClause.clause_text,
            },
            403,
          );
        }

        // 4. All clear — create synth request with C2PA credentials
        await db
          .prepare(
            `
          INSERT INTO hvs_synth_requests
            (request_id, actor_id, descendant_id, consent_token_id, licensee_id,
             script_hash, use_category, emotional_profile, never_clause_check, status)
          VALUES (?,?,?,?,?,?,?,?,'passed','approved')
        `,
          )
          .bind(
            request_id,
            actor_id,
            descendant_id,
            consent_token_id,
            licensee_id || null,
            script_hash || null,
            use_category,
            emotional_profile ? JSON.stringify(emotional_profile) : null,
          )
          .run();

        // Generate C2PA content credential manifest
        const synthReq = {
          request_id,
          actor_id,
          descendant_id,
          consent_token_id,
          use_category,
          status: "approved",
        };
        const c2paManifest = await generateC2PAManifest(synthReq, env);

        // Store C2PA manifest in a KV bucket for retrieval
        if (kv) {
          await kv.put(
            `c2pa:${request_id}`,
            JSON.stringify(c2paManifest),
            { expirationTtl: 31536000 }, // 1 year
          );
        }

        // Append C2PA credential event to ledger
        await ledgerAppend(db, {
          actor_id,
          descendant_id,
          consent_token_id,
          event_type: "synth.approved",
          payload: {
            use_category,
            request_id,
            never_clause_check: "passed",
            c2pa_manifest_signature: c2paManifest.signature,
          },
        });

        return json(
          {
            status: "approved",
            request_id,
            never_clause_check: "passed",
            c2pa_signature: c2paManifest.signature,
            message: "Synthesis approved. Proceed with generation.",
          },
          201,
        );
      }

      const synthMatch = path.match(/^\/api\/v1\/synth-requests\/([^/]+)$/);
      if (synthMatch && method === "GET") {
        const req = await db
          .prepare("SELECT * FROM hvs_synth_requests WHERE request_id = ?")
          .bind(synthMatch[1])
          .first();
        if (!req) return err("Synth request not found", 404);
        return json({ synth_request: req });
      }

      // ── C2PA Manifest Retrieval ────────────────────────────────────────────────
      const c2paMatch = path.match(/^\/api\/v1\/synth-requests\/([^/]+)\/c2pa$/);
      if (c2paMatch && method === "GET") {
        const request_id = c2paMatch[1];
        const req = await db
          .prepare("SELECT * FROM hvs_synth_requests WHERE request_id = ?")
          .bind(request_id)
          .first();
        if (!req) return err("Synth request not found", 404);

        // Try to retrieve C2PA manifest from KV
        let c2paManifest = null;
        if (kv) {
          const cached = await kv.get(`c2pa:${request_id}`, "json");
          if (cached) {
            c2paManifest = cached;
          }
        }

        // If not in KV, regenerate from request data
        if (!c2paManifest) {
          c2paManifest = await generateC2PAManifest(req, env);
        }

        return json({
          request_id,
          c2pa_manifest: c2paManifest,
          retrieved_at: now(),
          note: "C2PA content credentials provide cryptographic proof of synthesis provenance and consent enforcement.",
        });
      }

      // ── Licenses ─────────────────────────────────────────────────────────────
      if (path === "/api/v1/licenses" && method === "GET") {
        const actor_id = url.searchParams.get("actor_id");
        const query = actor_id
          ? "SELECT * FROM hvs_licenses WHERE actor_id = ? ORDER BY issued_at DESC"
          : "SELECT * FROM hvs_licenses ORDER BY issued_at DESC LIMIT 100";
        const { results } = actor_id
          ? await db.prepare(query).bind(actor_id).all()
          : await db.prepare(query).all();
        return json({ licenses: results, count: results.length });
      }

      if (path === "/api/v1/licenses" && method === "POST") {
        const body = await request.json();
        const {
          licensee_id,
          actor_id,
          descendant_id,
          consent_token_id,
          use_category,
          territory,
          duration_type,
          license_fee_cad,
        } = body;
        if (!licensee_id || !actor_id || !descendant_id || !consent_token_id || !use_category) {
          return err(
            "licensee_id, actor_id, descendant_id, consent_token_id, use_category required",
          );
        }

        const actor = await db
          .prepare("SELECT * FROM hvs_actors WHERE actor_id = ?")
          .bind(actor_id)
          .first();
        if (!actor) return err("Actor not found", 404);

        const actor_share = actor.is_founding ? 85.0 : 75.0;
        const noizy_share = actor.is_founding ? 15.0 : 25.0;
        const fee = license_fee_cad || 0;
        const license_id = uuid();

        await db
          .prepare(
            `
          INSERT INTO hvs_licenses
            (license_id, licensee_id, actor_id, descendant_id, consent_token_id,
             use_category, territory, duration_type, license_fee_cad, actor_share_pct, noizy_share_pct)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `,
          )
          .bind(
            license_id,
            licensee_id,
            actor_id,
            descendant_id,
            consent_token_id,
            use_category,
            territory || "GLOBAL",
            duration_type || "perpetual",
            fee,
            actor_share,
            noizy_share,
          )
          .run();

        await ledgerAppend(db, {
          actor_id,
          descendant_id,
          licensee_id,
          license_id,
          consent_token_id,
          event_type: "license.issued",
          amount_cad: fee,
          actor_share_cad: (fee * actor_share) / 100,
          noizy_share_cad: (fee * noizy_share) / 100,
          payload: {
            use_category,
            territory,
            duration_type,
            license_fee_cad: fee,
          },
        });

        await cacheInvalidate(request, "health");
        return json(
          {
            license_id,
            actor_share_pct: actor_share,
            noizy_share_pct: noizy_share,
          },
          201,
        );
      }

      // ── Ledger ───────────────────────────────────────────────────────────────
      if (path === "/api/v1/ledger" && method === "GET") {
        const actor_id = url.searchParams.get("actor_id");
        const event_type = url.searchParams.get("event_type");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

        let query = "SELECT * FROM noizy_ledger WHERE 1=1";
        const params = [];
        if (actor_id) {
          query += " AND actor_id = ?";
          params.push(actor_id);
        }
        if (event_type) {
          query += " AND event_type = ?";
          params.push(event_type);
        }
        query += " ORDER BY recorded_at DESC LIMIT ?";
        params.push(limit);

        const { results } = await db
          .prepare(query)
          .bind(...params)
          .all();
        return json({ events: results, count: results.length });
      }

      // ── Rate Table ───────────────────────────────────────────────────────────
      if (path === "/api/v1/rate-table" && method === "GET") {
        const cached = await cacheGet(request, "rate_table");
        if (cached) return json(cached);
        const { results } = await db
          .prepare("SELECT * FROM hvs_rate_table ORDER BY base_fee_cad")
          .all();
        const data = { rate_table: results };
        await cacheSet(request, "rate_table", data, 600); // cache 10 min
        return json(data);
      }

      // ── Voice DNA ────────────────────────────────────────────────────────────
      const voiceDnaActorMatch = path.match(/^\/api\/v1\/actors\/([^/]+)\/voice-dna$/);
      if (voiceDnaActorMatch) {
        const actor_id = voiceDnaActorMatch[1];
        if (method === "GET") {
          const { results } = await db
            .prepare("SELECT * FROM hvs_voice_dna WHERE actor_id = ? ORDER BY version DESC")
            .bind(actor_id)
            .all();
          return json({ voice_dna: results, count: results.length });
        }
        if (method === "POST") {
          const body = await request.json();
          const {
            recording_date,
            duration_sec,
            file_hash,
            storage_uri,
            synthesis_model,
            sample_count,
            quality_score,
            notes,
          } = body;
          const dna_id = `DNA-${actor_id}-${Date.now()}`;
          const latest = await db
            .prepare("SELECT MAX(version) as v FROM hvs_voice_dna WHERE actor_id = ?")
            .bind(actor_id)
            .first();
          const version = (latest?.v || 0) + 1;
          await db
            .prepare(
              `
            INSERT INTO hvs_voice_dna
              (dna_id, actor_id, version, recording_date, duration_sec, file_hash,
               storage_uri, synthesis_model, sample_count, quality_score, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
          `,
            )
            .bind(
              dna_id,
              actor_id,
              version,
              recording_date || now(),
              duration_sec || null,
              file_hash || null,
              storage_uri || null,
              synthesis_model || null,
              sample_count || 0,
              quality_score || null,
              notes || null,
            )
            .run();
          await ledgerAppend(db, {
            actor_id,
            event_type: "voice_dna.recorded",
            payload: { dna_id, version, synthesis_model, sample_count },
          });
          await cacheInvalidate(request, "health");
          const dna = await db
            .prepare("SELECT * FROM hvs_voice_dna WHERE dna_id = ?")
            .bind(dna_id)
            .first();
          return json({ voice_dna: dna }, 201);
        }
      }

      // ── Estates ───────────────────────────────────────────────────────────────
      if (path === "/api/v1/estates" && method === "GET") {
        const { results } = await db.prepare("SELECT * FROM hvs_estates").all();
        return json({ estates: results, count: results.length });
      }
      const estateActorMatch = path.match(/^\/api\/v1\/actors\/([^/]+)\/estate$/);
      if (estateActorMatch && method === "GET") {
        const estate = await db
          .prepare("SELECT * FROM hvs_estates WHERE actor_id = ?")
          .bind(estateActorMatch[1])
          .first();
        if (!estate) return err("Estate not found", 404);
        return json({ estate });
      }

      // ── Union Tiers ───────────────────────────────────────────────────────────
      if (path === "/api/v1/union-tiers" && method === "GET") {
        const cached = await cacheGet(request, "union_tiers");
        if (cached) return json(cached);
        const { results } = await db
          .prepare("SELECT * FROM hvs_union_tiers ORDER BY min_earnings_cad")
          .all();
        const data = { union_tiers: results };
        await cacheSet(request, "union_tiers", data, 3600); // cache 1hr — rarely changes
        return json(data);
      }

      // ── Licensees ─────────────────────────────────────────────────────────────
      if (path === "/api/v1/licensees" && method === "GET") {
        const { results } = await db
          .prepare("SELECT * FROM hvs_licensees ORDER BY onboarded_at DESC")
          .all();
        return json({ licensees: results, count: results.length });
      }
      if (path === "/api/v1/licensees" && method === "POST") {
        const body = await request.json();
        const { display_name, legal_name, email, country, organization_type } = body;
        if (!display_name) return err("display_name required", 400);
        const licensee_id = `LIC-${uuid().substring(0, 8).toUpperCase()}`;
        await db
          .prepare(
            `
          INSERT INTO hvs_licensees (licensee_id, display_name, legal_name, email, country, organization_type)
          VALUES (?,?,?,?,?,?)
        `,
          )
          .bind(
            licensee_id,
            display_name,
            legal_name || null,
            email || null,
            country || "CA",
            organization_type || "individual",
          )
          .run();
        await ledgerAppend(db, {
          event_type: "licensee.onboarded",
          payload: { licensee_id, display_name, organization_type },
        });
        const licensee = await db
          .prepare("SELECT * FROM hvs_licensees WHERE licensee_id = ?")
          .bind(licensee_id)
          .first();
        return json({ licensee }, 201);
      }

      // ── PREMIS Events ─────────────────────────────────────────────────────────
      if (path === "/api/v1/premis" && method === "GET") {
        const actor_id = url.searchParams.get("actor_id");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
        let query = "SELECT * FROM hvs_premis_events WHERE 1=1";
        const params = [];
        if (actor_id) {
          query += " AND actor_id = ?";
          params.push(actor_id);
        }
        query += " ORDER BY event_datetime DESC LIMIT ?";
        params.push(limit);
        const { results } = await db
          .prepare(query)
          .bind(...params)
          .all();
        return json({ premis_events: results, count: results.length });
      }

      // ── Stats (new) ───────────────────────────────────────────────────────────
      if (path === "/api/v1/stats" && method === "GET") {
        const actors = await db.prepare("SELECT COUNT(*) as c FROM hvs_actors").first();
        const tokens = await db.prepare("SELECT COUNT(*) as c FROM hvs_consent_tokens").first();
        const activeTokens = await db
          .prepare("SELECT COUNT(*) as c FROM hvs_consent_tokens WHERE status = 'active'")
          .first();
        const descendants = await db.prepare("SELECT COUNT(*) as c FROM hvs_descendants").first();
        const synthTotal = await db.prepare("SELECT COUNT(*) as c FROM hvs_synth_requests").first();
        const synthBlocked = await db
          .prepare("SELECT COUNT(*) as c FROM hvs_synth_requests WHERE status = 'blocked'")
          .first();
        const ledger = await db.prepare("SELECT COUNT(*) as c FROM noizy_ledger").first();
        const revenue = await db
          .prepare(
            "SELECT COALESCE(SUM(amount_cad),0) as total FROM noizy_ledger WHERE event_type = 'license.issued'",
          )
          .first();
        return json({
          system: "HEAVEN",
          version: env.NOIZY_VERSION,
          stats: {
            actors: actors?.c || 0,
            consent_tokens: {
              total: tokens?.c || 0,
              active: activeTokens?.c || 0,
            },
            descendants: descendants?.c || 0,
            synth_requests: {
              total: synthTotal?.c || 0,
              blocked: synthBlocked?.c || 0,
            },
            ledger_events: ledger?.c || 0,
            total_revenue_cad: revenue?.total || 0,
          },
          timestamp: now(),
        });
      }

      // ── KPI Views ────────────────────────────────────────────────────────────
      if (path === "/api/v1/kpi/trust") {
        const result = await db.prepare("SELECT * FROM kpi_trust").first();
        return json({ kpi: "trust", data: result });
      }
      if (path === "/api/v1/kpi/safety") {
        const result = await db.prepare("SELECT * FROM kpi_safety").first();
        return json({ kpi: "safety", data: result });
      }
      if (path === "/api/v1/kpi/revenue") {
        const { results } = await db.prepare("SELECT * FROM kpi_revenue").all();
        return json({ kpi: "revenue", data: results });
      }
      if (path === "/api/v1/kpi/quality") {
        const { results } = await db.prepare("SELECT * FROM kpi_quality").all();
        return json({ kpi: "quality", data: results });
      }
      if (path === "/api/v1/kpi/risk") {
        const { results } = await db.prepare("SELECT * FROM kpi_risk").all();
        return json({ kpi: "risk", data: results });
      }

      // ── Enterprise Audit ─────────────────────────────────────────────────────
      if (path === "/api/v1/enterprise/audit") {
        const { results } = await db.prepare("SELECT * FROM enterprise_audit").all();
        return json({
          audit: results,
          count: results.length,
          generated_at: now(),
        });
      }

      // ── Dashboard (comprehensive health & status) ──────────────────────────────
      if (path === "/dashboard" && method === "GET") {
        return handleDashboard(request, env);
      }

      // ── Status (minimal JSON for monitoring systems) ───────────────────────────
      if (path === "/status" && method === "GET") {
        return handleStatus(request, env);
      }

      // ── Ledger Append (external write from DreamChamber) ─────────────────────
      if (path === "/api/v1/ledger/append" && method === "POST") {
        const body = await request.json();
        const { event_type, payload, actor_id, amount_cad } = body;
        if (!event_type) return err("event_type is required", 400);
        // Allowlist: only permitted event types from external callers.
        // Fixed names + prefix allowlist for boss-tier + control-plane callers.
        const ALLOWED_EXTERNAL_EVENTS = new Set([
          "ai.usage",
          "ai.stream",
          "chat.session",
          "system.audit",
          "license.issued",
          "license.viewed",
          "consent.checked",
        ]);
        const ALLOWED_EXTERNAL_PREFIXES = [
          "intent.", // GABRIEL daemon intents (intent.received.*, intent.stubbed.*)
          "command.", // THE-GATHERING control-plane commands
          "gabriel.", // GABRIEL-emitted bookkeeping
          "lucy.", // LUCY DAZEFLOW events
          "army.", // NOIZYARMY task.* / soldier.* reports
        ];
        const prefixOk = ALLOWED_EXTERNAL_PREFIXES.some((p) => event_type.startsWith(p));
        if (!ALLOWED_EXTERNAL_EVENTS.has(event_type) && !prefixOk) {
          return err(`event_type '${event_type}' is not permitted from external callers`, 403);
        }
        const eventId = body.event_id || uuid();
        await ledgerAppend(db, {
          event_id: eventId,
          actor_id: actor_id || null,
          event_type,
          payload: payload || {},
          amount_cad: amount_cad || 0,
          actor_share_cad: body.actor_share_cad || 0,
          noizy_share_cad: body.noizy_share_cad || 0,
          union_share_cad: body.union_share_cad || 0,
          source_system: body.source_system || "external-caller",
        });
        return json({ appended: true, id: eventId, event_type, timestamp: now() }, 201);
      }

      // ── Gabriel ──────────────────────────────────────────────────────────────
      if (path === "/gabriel" && method === "GET") {
        const [actors, tokens, activeTokens, neverClauses, ledger, descendants, voiceDna] =
          await Promise.all([
            db.prepare("SELECT COUNT(*) as c FROM hvs_actors").first(),
            db.prepare("SELECT COUNT(*) as c FROM hvs_consent_tokens").first(),
            db
              .prepare("SELECT COUNT(*) as c FROM hvs_consent_tokens WHERE status = 'active'")
              .first(),
            db.prepare("SELECT COUNT(*) as c FROM hvs_never_clauses").first(),
            db.prepare("SELECT COUNT(*) as c FROM noizy_ledger").first(),
            db.prepare("SELECT COUNT(*) as c FROM hvs_descendants").first(),
            db.prepare("SELECT COUNT(*) as c FROM hvs_voice_dna").first(),
          ]);
        const rsp = await db.prepare("SELECT * FROM hvs_actors WHERE actor_id = 'RSP_001'").first();
        const recentLedger = await db
          .prepare(
            "SELECT event_type, recorded_at FROM noizy_ledger ORDER BY recorded_at DESC LIMIT 5",
          )
          .all();
        return json({
          gabriel: "ONLINE",
          identity: "AI Orchestration Layer — NOIZY Empire",
          doctrine: [
            "Consent as executable code",
            "Provenance as default",
            "Revocation as sacred",
            "Compensation as automatic",
          ],
          empire: {
            actors: actors?.c || 0,
            consent_tokens: {
              total: tokens?.c || 0,
              active: activeTokens?.c || 0,
            },
            never_clauses_in_force: neverClauses?.c || 0,
            ledger_events: ledger?.c || 0,
            descendants: descendants?.c || 0,
            voice_dna_records: voiceDna?.c || 0,
          },
          founding_actor: rsp
            ? {
                id: rsp.actor_id,
                name: rsp.display_name,
                country: rsp.country,
                onboarded_at: rsp.onboarded_at,
              }
            : null,
          recent_ledger: recentLedger?.results || [],
          portals: {
            NOIZYVOX: "Voice sovereignty — consent capture — voice profiles",
            NOIZYFISH: "888-title catalogue — C2PA stamped — 75/25 perpetual",
            NOIZYKIDZ: "Rhythm Root Island — neurodivergent kids — Unity/Godot",
            NOIZYLAB: "Sonic healing — binaural protocols — AirPlay delivery",
            WISDOM: "Elder legacy — inheritable voice archive — 100-year estate",
            myFAMILY: "Love in code — consent-native — deployed when needed",
          },
          kernel: "heaven.rsp-5f3.workers.dev",
          days_to_deadline: Math.ceil((new Date("2026-04-17").getTime() - Date.now()) / 86400000),
          timestamp: now(),
        });
      }

      // ── Root — Landing Page (GET + HEAD) ────────────────────────────────────
      if (path === "/" && (method === "GET" || method === "HEAD")) {
        // Browser request → serve landing page
        const accept = request.headers.get("Accept") || "";
        if (accept.includes("text/html")) {
          const body = method === "GET" ? landingHTML() : null;
          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=60",
              "X-Powered-By": "HEAVEN/RSP_001",
            },
          });
        }
        // API client → return JSON index
        const indexData = {
          name: "HEAVEN",
          description: "NOIZY HVS Consent Kernel API",
          version: env.NOIZY_VERSION,
          docs: "/health",
          endpoints: [
            "GET  /health",
            "GET  /dashboard",
            "GET  /status",
            "GET  /api/v1/actors",
            "POST /api/v1/actors",
            "GET  /api/v1/actors/:id",
            "GET  /api/v1/actors/:id/never-clauses",
            "GET  /api/v1/actors/:id/descendants",
            "GET  /api/v1/actors/:id/consent-tokens",
            "POST /api/v1/consent-tokens",
            "POST /api/v1/consent-tokens/:id/revoke",
            "GET  /api/v1/descendants/:id",
            "POST /api/v1/descendants",
            "POST /api/v1/synth-requests",
            "GET  /api/v1/synth-requests/:id",
            "GET  /api/v1/synth-requests/:id/c2pa",
            "GET  /api/v1/licenses",
            "POST /api/v1/licenses",
            "GET  /api/v1/ledger",
            "GET  /api/v1/rate-table",
            "GET  /api/v1/union-tiers",
            "GET  /api/v1/licensees",
            "POST /api/v1/licensees",
            "GET  /api/v1/actors/:id/voice-dna",
            "POST /api/v1/actors/:id/voice-dna",
            "GET  /api/v1/actors/:id/estate",
            "GET  /api/v1/estates",
            "GET  /api/v1/premis",
            "GET  /api/v1/stats",
            "GET  /api/v1/kpi/trust",
            "GET  /api/v1/kpi/safety",
            "GET  /api/v1/kpi/revenue",
            "GET  /api/v1/kpi/quality",
            "GET  /api/v1/kpi/risk",
            "GET  /api/v1/enterprise/audit",
            "POST /api/v1/ledger/append",
            "GET  /gabriel",
            "GET  /preflight                   (GORUNFREE — pre-flight insight)",
            "GET  /provenance/:id              (GORUNFREE — provenance trail)",
            "GET  /provenance/:id/export       (GORUNFREE — export as PDF/JSON/C2PA)",
            "GET  /absence/gaps                (GORUNFREE — creative gaps)",
            "GET  /absence/archive             (GORUNFREE — resurrection candidates)",
            "POST /absence/commission          (GORUNFREE — commission workflow)",
            "GET  /absence/representation      (GORUNFREE — representation balance)",
            "POST /api/v1/family/members",
            "GET  /api/v1/family/members",
            "POST /api/v1/family/consent",
            "GET  /api/v1/family/consent/:member_id",
            "POST /api/v1/family/messages",
            "GET  /api/v1/family/messages/:member_id",
            "POST /api/v1/heal/session",
            "GET  /api/v1/heal/outcomes",
            "GET  /api/v1/noizyvox/*  (proxy → GOD.local:8421 — voices, calm, research)",
          ],
          mission: "Consent as executable code.",
        };
        if (method === "HEAD") {
          return new Response(null, { status: 200, headers: CORS_HEADERS });
        }
        return json(indexData);
      }

      // ── /api/v1 Index ─────────────────────────────────────────────────────────
      if (path === "/api/v1" && (method === "GET" || method === "HEAD")) {
        if (method === "HEAD") {
          return new Response(null, { status: 200, headers: CORS_HEADERS });
        }
        return json({
          api: "HEAVEN HVS Consent Kernel",
          version: "v1",
          base: "/api/v1",
          resources: {
            actors: "/api/v1/actors",
            descendants: "/api/v1/descendants",
            consent_tokens: "/api/v1/consent-tokens",
            synth_requests: "/api/v1/synth-requests",
            licenses: "/api/v1/licenses",
            licensees: "/api/v1/licensees",
            ledger: "/api/v1/ledger",
            rate_table: "/api/v1/rate-table",
            union_tiers: "/api/v1/union-tiers",
            estates: "/api/v1/estates",
            premis: "/api/v1/premis",
            stats: "/api/v1/stats",
            kpi: "/api/v1/kpi/*",
            family: "/api/v1/family/*",
            heal: "/api/v1/heal/*",
          },
          mission: "Consent as executable code.",
        });
      }

      // ── myFamily.AI — Constitutional Voice Legacy ─────────────────────────

      // Register family member
      if (path === "/api/v1/family/members" && method === "POST") {
        const body = await request.json();
        const { email, display_name } = body;
        if (!email || !display_name) return err("email and display_name required");
        const id = uuid();
        const c2pa = `c2pa:noizy:family:${id}:${Date.now()}`;
        // Graceful duplicate — return existing rather than 500 on UNIQUE conflict
        const existingMember = await db
          .prepare(
            "SELECT id, email, display_name, status, created_at FROM family_members WHERE email = ?",
          )
          .bind(email)
          .first();
        if (existingMember) {
          return json(
            {
              ok: true,
              member_id: existingMember.id,
              conflict: true,
              message: "Member already registered — sovereignty intact",
            },
            200,
          );
        }

        await db
          .prepare(
            `INSERT INTO family_members (id, email, display_name, hvs_acknowledged, consent_version)
           VALUES (?, ?, ?, 1, '1.0')`,
          )
          .bind(id, email, display_name)
          .run();
        await ledgerAppend(db, {
          actor_id: id,
          event_type: "family.member.registered",
          payload: { email, display_name, c2pa },
        });
        return json({ ok: true, member_id: id, c2pa_stamp: c2pa }, 201);
      }

      // List all family members
      if (path === "/api/v1/family/members" && method === "GET") {
        const { results } = await db
          .prepare(
            "SELECT id, email, display_name, status, consent_version, created_at FROM family_members ORDER BY created_at DESC",
          )
          .all();
        return json({ members: results, count: results.length });
      }

      // Store consent matrix — the constitutional declaration
      if (path === "/api/v1/family/consent" && method === "POST") {
        const body = await request.json();
        if (!body.member_id || !body.use_cases?.length || !body.beneficiary_ids?.length)
          return err("member_id, use_cases, beneficiary_ids required");
        const id = uuid();
        const c2pa = `c2pa:noizy:consent:${id}:${Date.now()}`;
        await db
          .prepare(
            `INSERT INTO consent_matrix (id, member_id, use_cases, restrictions, beneficiary_ids, c2pa_stamp, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            body.member_id,
            JSON.stringify(body.use_cases),
            JSON.stringify(body.restrictions ?? {}),
            JSON.stringify(body.beneficiary_ids),
            c2pa,
            body.expires_at ?? null,
          )
          .run();
        await ledgerAppend(db, {
          actor_id: body.member_id,
          event_type: "family.consent.stored",
          payload: { consent_id: id, use_cases: body.use_cases, perpetual: !body.expires_at, c2pa },
        });
        return json({ ok: true, consent_id: id, c2pa_stamp: c2pa }, 201);
      }

      // Read consent matrix for a member
      const consentReadMatch = path.match(/^\/api\/v1\/family\/consent\/([^/]+)$/);
      if (consentReadMatch && method === "GET") {
        const { results } = await db
          .prepare(
            "SELECT * FROM consent_matrix WHERE member_id = ? AND is_active = 1 ORDER BY recorded_at DESC",
          )
          .bind(consentReadMatch[1])
          .all();
        return json({ consents: results, count: results.length });
      }

      // Register pre-recorded message (metadata only — audio on M2 Ultra)
      if (path === "/api/v1/family/messages" && method === "POST") {
        const body = await request.json();
        if (!body.from_member_id || !body.file_ref || !body.message_type)
          return err("from_member_id, file_ref, message_type required");
        const id = uuid();
        await db
          .prepare(
            `INSERT INTO messages (id, from_member_id, to_beneficiary_ids, message_type, file_ref, duration_seconds, trigger_conditions)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            body.from_member_id,
            JSON.stringify(body.to_beneficiary_ids ?? []),
            body.message_type,
            body.file_ref,
            body.duration_seconds ?? null,
            JSON.stringify(body.trigger_conditions ?? {}),
          )
          .run();
        await ledgerAppend(db, {
          actor_id: body.from_member_id,
          event_type: "family.message.registered",
          payload: { message_id: id, type: body.message_type, note: "audio_local_m2ultra" },
        });
        return json({ ok: true, message_id: id }, 201);
      }

      // Read messages for a member
      const msgReadMatch = path.match(/^\/api\/v1\/family\/messages\/([^/]+)$/);
      if (msgReadMatch && method === "GET") {
        const { results } = await db
          .prepare(
            "SELECT id, message_type, duration_seconds, trigger_conditions, created_at FROM messages WHERE from_member_id = ? ORDER BY created_at DESC",
          )
          .bind(msgReadMatch[1])
          .all();
        return json({
          messages: results,
          count: results.length,
          note: "file_refs omitted — audio local on M2 Ultra",
        });
      }

      // ── NOIZYLAB Healing Sessions ──────────────────────────────────────────

      if (path === "/api/v1/heal/session" && method === "POST") {
        const body = await request.json();
        if (!body.beneficiary_member_id || !body.protocol_type)
          return err("beneficiary_member_id and protocol_type required");
        const id = uuid();
        await db
          .prepare(
            `INSERT INTO healing_sessions
             (id, beneficiary_member_id, protocol_type, voice_message_id, noizyfish_track_id,
              frequency_hz, duration_seconds, biometric_before, biometric_after, outcome, consent_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            body.beneficiary_member_id,
            body.protocol_type,
            body.voice_message_id ?? null,
            body.noizyfish_track_id ?? null,
            body.frequency_hz ?? null,
            body.duration_seconds ?? null,
            JSON.stringify(body.biometric_before ?? {}),
            JSON.stringify(body.biometric_after ?? {}),
            body.outcome ?? "pending",
            body.consent_verified ? 1 : 0,
          )
          .run();
        await ledgerAppend(db, {
          actor_id: body.beneficiary_member_id,
          event_type: "noizylab.healing.session",
          payload: {
            session_id: id,
            protocol: body.protocol_type,
            frequency_hz: body.frequency_hz,
            outcome: body.outcome ?? "pending",
            consent_verified: body.consent_verified,
          },
        });
        return json({ ok: true, session_id: id }, 201);
      }

      // Healing outcomes — research data for Anthropic partnership
      if (path === "/api/v1/heal/outcomes" && method === "GET") {
        const { results } = await db
          .prepare(
            `SELECT protocol_type, frequency_hz,
                  COUNT(*) as sessions,
                  SUM(CASE WHEN outcome = 'improved' THEN 1 ELSE 0 END) as improved,
                  SUM(CASE WHEN outcome = 'neutral'  THEN 1 ELSE 0 END) as neutral,
                  SUM(CASE WHEN outcome = 'flagged'  THEN 1 ELSE 0 END) as flagged
           FROM healing_sessions
           GROUP BY protocol_type, frequency_hz
           ORDER BY sessions DESC`,
          )
          .all();
        return json({
          outcomes: results,
          note: "Constitutional research data — anonymized by default",
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // GORUNFREE Routes — Creator-Perceived Speed, Provenance, Absence
      // ═══════════════════════════════════════════════════════════════════════

      // ── Preflight (Pre-Flight Insight) ─────────────────────────────────────
      if (path === "/preflight" && method === "GET") {
        return handlePreflight(request, env);
      }

      // ── Provenance Trail ───────────────────────────────────────────────────
      const provenanceExportMatch = path.match(/^\/provenance\/([^/]+)\/export$/);
      if (provenanceExportMatch && method === "GET") {
        return handleProvenanceExport(request, env);
      }

      const provenanceMatch = path.match(/^\/provenance\/([^/]+)$/);
      if (provenanceMatch && method === "GET") {
        return handleProvenance(request, env);
      }

      // ── Absence Intelligence ───────────────────────────────────────────────
      if (path === "/absence/gaps" && method === "GET") {
        return handleAbsenceGaps(request, env);
      }

      if (path === "/absence/archive" && method === "GET") {
        return handleAbsenceArchive(request, env);
      }

      if (path === "/absence/commission" && method === "POST") {
        return handleAbsenceCommission(request, env);
      }

      if (path === "/absence/representation" && method === "GET") {
        return handleAbsenceRepresentation(request, env);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // Operator Routes — Audit-First Pattern
      // Requires authentication. Audit D1 write before state change.
      // ═══════════════════════════════════════════════════════════════════════

      if (path === "/operator/approve" && method === "POST") {
        if (!authenticate(request, env)) {
          return err("Unauthorized — provide X-NOIZY-Key header", 401);
        }
        return handleOperatorApprove(request, env);
      }

      if (path === "/operator/token/issue" && method === "POST") {
        if (!authenticate(request, env)) {
          return err("Unauthorized", 401);
        }
        return handleTokenIssue(request, env);
      }

      if (path === "/operator/token/validate" && method === "POST") {
        if (!authenticate(request, env)) {
          return err("Unauthorized", 401);
        }
        return handleTokenValidate(request, env);
      }

      if (path === "/operator/status" && method === "GET") {
        if (!authenticate(request, env)) {
          return err("Unauthorized", 401);
        }
        return handleOperatorStatus(request, env);
      }

      if (path === "/operator/audit" && method === "GET") {
        if (!authenticate(request, env)) {
          return err("Unauthorized", 401);
        }
        return handleOperatorAudit(request, env);
      }

      if (path === "/operator/freeze" && method === "POST") {
        if (!authenticate(request, env)) {
          return err("Unauthorized", 401);
        }
        return handleFreezeRecord(request, env);
      }

      if (path === "/operator/freeze/resolve" && method === "POST") {
        if (!authenticate(request, env)) {
          return err("Unauthorized", 401);
        }
        return handleFreezeResolve(request, env);
      }

      // ── Creator Trust Dashboard (public, read-only, calm) ─────────────────
      if (path === "/trust/status" && method === "GET") {
        return handleTrustStatus(request, env);
      }

      if (path === "/trust/changes" && method === "GET") {
        return handleTrustChanges(request, env);
      }

      if (path === "/trust/transparency" && method === "GET") {
        return handleTransparency(request, env);
      }

      if (path === "/trust/changes/diff" && method === "GET") {
        return handleCreatorDiff(request, env);
      }

      // ── Operator Compliance & Audit Diff (authenticated) ────────────────────
      if (path === "/operator/audit/diff" && method === "GET") {
        return handleOperatorAuditDiff(request, env);
      }

      if (path === "/operator/compliance/export" && method === "GET") {
        return handleComplianceExport(request, env);
      }

      if (path === "/operator/compliance/verify-bundle" && method === "GET") {
        return handleVerifyBundle(request, env);
      }

      // ── Public Anchor Status Widget ────────────────────────────────────────
      if (path === "/trust/anchor-status" && method === "GET") {
        return handleAnchorStatus(request, env);
      }

      if (path === "/trust/anchor-status.html" && method === "GET") {
        return handleAnchorStatusWidget(request, env);
      }

      if (path === "/trust/proof-coverage" && method === "GET") {
        return handleProofCoverage(request, env);
      }

      if (path === "/trust/proof-coverage.html" && method === "GET") {
        return handleProofCoverageWidget(request, env);
      }

      // ═══════════════════════════════════════════════════════════════════════

      // ── NOIZYVOX Platform info ────────────────────────────────────────────
      // noizyvox-platform runs locally on GOD.local:8421 (FastAPI)
      // Direct access: http://GOD.local:8421/api/v1/
      // Cloudflare Workers cannot reach GOD.local — use Cloudflare Tunnel
      // to expose GOD.local:8421 publicly, then set NOIZYVOX_UPSTREAM env var
      if (path.startsWith("/api/v1/noizyvox/")) {
        const upstream = env.NOIZYVOX_UPSTREAM;
        if (!upstream) {
          return json(
            {
              error: "NOIZYVOX Platform not tunneled",
              local: "http://GOD.local:8421/api/v1/",
              docs: "http://GOD.local:8421/docs",
              setup:
                "Add NOIZYVOX_UPSTREAM env var pointing to your Cloudflare Tunnel URL for GOD.local:8421",
            },
            503,
          );
        }
        try {
          const proxied = await fetch(`${upstream}${path.replace("/api/v1/noizyvox", "")}`, {
            method,
            headers: {
              Authorization: `Bearer ${env.NOIZY_KEY || "local-dev-token"}`,
              "Content-Type": request.headers.get("Content-Type") || "application/json",
            },
            body: method !== "GET" && method !== "HEAD" ? request.body : undefined,
            signal: AbortSignal.timeout(10000),
          });
          const body = await proxied.text();
          await ledgerAppend(db, {
            event_type: "noizyvox.proxy",
            payload: { path, method, status: proxied.status },
          });
          return new Response(body, {
            status: proxied.status,
            headers: {
              "Content-Type": proxied.headers.get("Content-Type") || "application/json",
              ...CORS_HEADERS,
            },
          });
        } catch (e) {
          return json({ error: "NOIZYVOX upstream unreachable", detail: e.message }, 503);
        }
      }

      // ── WebSocket — noizybeast real-time Gabriel connection ──────────────
      if (path === "/ws" || path === "/gabriel/ws") {
        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
          return json({
            endpoint: "wss://heaven.rsp-5f3.workers.dev/ws",
            protocol: "WebSocket",
            usage: "Connect and send JSON: {type, payload}",
            types: ["ping", "command", "voice", "consent.check", "empire.status", "heal.trigger"],
          });
        }

        const [client, server] = Object.values(new WebSocketPair());
        server.accept();

        // Send welcome frame immediately on connect
        server.send(
          JSON.stringify({
            type: "connected",
            gabriel: "ONLINE",
            version: env.NOIZY_VERSION,
            doctrine: "Consent as executable code",
            days_to_deadline: Math.ceil((new Date("2026-04-17").getTime() - Date.now()) / 86400000),
            timestamp: new Date().toISOString(),
          }),
        );

        server.addEventListener("message", async (event) => {
          let msg;
          try {
            msg = JSON.parse(event.data);
          } catch {
            server.send(JSON.stringify({ type: "error", detail: "Invalid JSON" }));
            return;
          }

          const { type, payload } = msg;

          // Ping — keepalive
          if (type === "ping") {
            server.send(JSON.stringify({ type: "pong", ts: new Date().toISOString() }));
            return;
          }

          // Empire status — live pull from D1
          if (type === "empire.status") {
            try {
              const [actors, tokens, ledger] = await Promise.all([
                env.GABRIEL_DB.prepare("SELECT COUNT(*) as c FROM hvs_actors").first(),
                env.GABRIEL_DB.prepare(
                  "SELECT COUNT(*) as c FROM hvs_consent_tokens WHERE status='active'",
                ).first(),
                env.GABRIEL_DB.prepare("SELECT COUNT(*) as c FROM noizy_ledger").first(),
              ]);
              server.send(
                JSON.stringify({
                  type: "empire.status",
                  actors: actors?.c || 0,
                  active_tokens: tokens?.c || 0,
                  ledger_events: ledger?.c || 0,
                  ts: new Date().toISOString(),
                }),
              );
            } catch (e) {
              server.send(JSON.stringify({ type: "error", detail: e.message }));
            }
            return;
          }

          // Consent check — validate a token before synthesis
          if (type === "consent.check") {
            const { token_id } = payload || {};
            if (!token_id) {
              server.send(
                JSON.stringify({
                  type: "consent.result",
                  valid: false,
                  reason: "token_id required",
                }),
              );
              return;
            }
            try {
              const token = await env.GABRIEL_DB.prepare(
                "SELECT status, use_categories, expires_at FROM hvs_consent_tokens WHERE token_id = ?",
              )
                .bind(token_id)
                .first();
              const valid =
                token?.status === "active" &&
                (!token.expires_at || new Date(token.expires_at) > new Date());
              server.send(
                JSON.stringify({
                  type: "consent.result",
                  valid,
                  status: token?.status || "not_found",
                  reason: valid
                    ? "Consent active — sovereignty confirmed"
                    : "Consent invalid or revoked",
                }),
              );
            } catch (e) {
              server.send(JSON.stringify({ type: "error", detail: e.message }));
            }
            return;
          }

          // Heal trigger — initiate a therapeutic protocol
          if (type === "heal.trigger") {
            const { member_id, protocol_type, frequency_hz } = payload || {};
            if (!member_id || !protocol_type) {
              server.send(
                JSON.stringify({ type: "error", detail: "member_id and protocol_type required" }),
              );
              return;
            }
            server.send(
              JSON.stringify({
                type: "heal.started",
                member_id,
                protocol_type,
                frequency_hz: frequency_hz || 6.0,
                delivery: "AirPlay",
                message: `${protocol_type} at ${frequency_hz || 6}Hz — routing to AirPlay`,
                ts: new Date().toISOString(),
              }),
            );
            return;
          }

          // Voice — transcription received from noizybeast Web Speech API
          if (type === "voice") {
            const { transcript, confidence } = payload || {};
            server.send(
              JSON.stringify({
                type: "voice.received",
                transcript,
                confidence,
                gabriel: "logged",
                ts: new Date().toISOString(),
              }),
            );
            return;
          }

          // Default — echo with routing hint
          server.send(
            JSON.stringify({
              type: "unknown",
              received: type,
              supported: ["ping", "empire.status", "consent.check", "heal.trigger", "voice"],
            }),
          );
        });

        server.addEventListener("close", () => {
          // Connection closed — no cleanup needed (stateless edge worker)
        });

        return new Response(null, { status: 101, webSocket: client });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // CHAOS ARENA — Public Trust Verification Surface
      // "Break the proof if you can."
      // ═══════════════════════════════════════════════════════════════════════
      if (path.startsWith("/chaos-arena")) {
        return handleChaosArenaAPI(request, env);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // VOICE MARKET — Higher-Trust Voice Licensing
      // Monetization on verified governance
      // ═══════════════════════════════════════════════════════════════════════
      if (path.startsWith("/voice-market")) {
        // Require auth for write operations
        if (method !== "GET" && method !== "OPTIONS" && !authenticate(request, env)) {
          return err("Unauthorized — provide X-NOIZY-Key header", 401);
        }
        return handleVoiceMarketAPI(request, env);
      }

      // ════════════════════════════════════════════════════════════════════
      // Heaven Ops Kernel · CF orchestration (2026-04-20, compartment 2)
      // ════════════════════════════════════════════════════════════════════
      // Doctrine: Heaven IS the Cloudflare NOIZY Professor. Every CF op
      // lands here, writes to cf_ops_log (before + after), then executes
      // against the CF API using env.CF_OPS_TOKEN. Agents call Heaven.
      // Heaven calls CF. Ledger knows everything.

      if (path.startsWith("/api/v1/ops/cf/")) {
        if (!authenticate(request, env)) {
          return err("Unauthorized — provide X-NOIZY-Key header", 401);
        }
        return handleCfOp(path, method, request, env);
      }

      // ── 404 ──────────────────────────────────────────────────────────────
      return err(`Route not found: ${method} ${path}`, 404);
    } catch (e) {
      console.error("HEAVEN error:", e);
      return json({ error: "Internal server error", detail: e.message }, 500);
    }
  },

  // ── NOIZY 2036 · Cloudflare Cron Trigger — hourly self-healing reconciliation
  // Wired via wrangler.toml: crons = ["0 * * * *"]
  // Runs at the edge globally, no local dependency. Writes before/after rows
  // to cf_ops_log for every correction. Drift with no matching handler is
  // logged but not auto-corrected (defense in depth against reconciler bugs).
  async scheduled(event, env, ctx) {
    const corr = crypto.randomUUID();
    try {
      await env.GABRIEL_DB.prepare(
        `INSERT INTO cf_ops_log
         (id, correlation_id, phase, actor_id, initiator_surface, verb, payload_json, http_status, ok)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      )
        .bind(
          crypto.randomUUID(),
          corr,
          "before",
          "reconciler",
          "cf-cron:" + event.cron,
          "cf.reconcile.cron",
          JSON.stringify({
            cron: event.cron,
            scheduled_at: new Date(event.scheduledTime).toISOString(),
          }),
          null,
          null,
        )
        .run();

      const diff = await noizy2036Diff(env);
      let corrected = 0;
      for (const d of diff.drifts) {
        if (d.kind === "missing_cd") {
          const r = await runCfOp(env, {
            verb: "cf.cd-bind",
            actor_id: "reconciler",
            initiator_surface: "cf-cron:" + event.cron,
            request: { target_zone: d.zone, target_hostname: d.hostname, target_worker: d.service },
            payload: d,
            cfReq: {
              method: "PUT",
              path: `/accounts/${CF_ACCOUNT_ID}/workers/domains`,
              body: {
                environment: "production",
                hostname: d.hostname,
                service: d.service,
                zone_name: d.zone,
              },
            },
          });
          if (r.ok) corrected++;
        } else if (d.kind === "observability_off") {
          const r = await runCfOp(env, {
            verb: "cf.observability",
            actor_id: "reconciler",
            initiator_surface: "cf-cron:" + event.cron,
            request: { target_worker: d.worker },
            payload: d,
            cfReq: {
              method: "PATCH",
              path: `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${d.worker}/script-settings`,
              body: { observability: { enabled: true, head_sampling_rate: 1.0 } },
            },
          });
          if (r.ok) corrected++;
        }
      }

      await env.GABRIEL_DB.prepare(
        `INSERT INTO cf_ops_log
         (id, correlation_id, phase, actor_id, initiator_surface, verb, payload_json, result_json, http_status, ok)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
        .bind(
          crypto.randomUUID(),
          corr,
          "after",
          "reconciler",
          "cf-cron:" + event.cron,
          "cf.reconcile.cron",
          JSON.stringify({ cron: event.cron }),
          JSON.stringify({
            declared_count: diff.declared_count,
            drift_count: diff.drifts.length,
            corrected,
          }),
          200,
          1,
        )
        .run();
    } catch (e) {
      console.error("[scheduled] reconcile error:", e.message);
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
// HEAVEN OPS KERNEL · Cloudflare orchestration
// ════════════════════════════════════════════════════════════════════════════
// Every CF op goes through runCfOp() which:
//   1. Writes a `before` row to cf_ops_log
//   2. Executes against api.cloudflare.com using env.CF_OPS_TOKEN
//   3. Writes an `after` or `error` row with HTTP status + result JSON
//   4. Returns { ok, correlation_id, http_status, result }
//
// env.CF_OPS_TOKEN must be a fine-grained CF token with scope for the specific
// resources being touched. Bootstrap: `wrangler secret put CF_OPS_TOKEN` on
// this Worker. Rotate quarterly.

const CF_API = "https://api.cloudflare.com/client/v4";
const CF_ACCOUNT_ID = "5f36aa9795348ea681d0b21910dfc82a"; // NOIZYFISH

// ════════════════════════════════════════════════════════════════════════════
// NOIZY 2036 · DECLARED STATE — the constitutional source of truth
// ════════════════════════════════════════════════════════════════════════════
// What the empire MUST look like at all times. Reconciliation loop diffs
// live CF state against this and self-heals. Edit here, deploy Heaven, the
// edge reconciles within the hour.
const NOIZY_2036_STATE = {
  // Worker Custom Domain bindings — hostname → service
  custom_domains: [
    { hostname: "heaven.noizy.ai", service: "heaven", zone: "noizy.ai" },
    { hostname: "mcp.noizy.ai", service: "noizy-mcp", zone: "noizy.ai" },
    { hostname: "metabeast.noizy.ai", service: "metabeast-remote", zone: "noizy.ai" },
    { hostname: "dream.noizy.ai", service: "dreamchamber-landing", zone: "noizy.ai" },
    { hostname: "gabriel.noizy.ai", service: "gabriel", zone: "noizy.ai" },
    { hostname: "lucy.noizy.ai", service: "noizy-landing", zone: "noizy.ai" },
    { hostname: "wisdom.noizy.ai", service: "noizy-landing", zone: "noizy.ai" },
    { hostname: "dashboard.noizy.ai", service: "noizy-landing", zone: "noizy.ai" },
    { hostname: "consent.noizy.ai", service: "heaven", zone: "noizy.ai" },
    { hostname: "webhooks.noizy.ai", service: "heaven", zone: "noizy.ai" },
    { hostname: "control.noizy.ai", service: "heaven", zone: "noizy.ai" },
    { hostname: "cb01.noizy.ai", service: "heaven", zone: "noizy.ai" },
    { hostname: "www.noizy.ai", service: "noizy-landing", zone: "noizy.ai" },
    { hostname: "noizyfish.com", service: "noizyfish-landing", zone: "noizyfish.com" },
    { hostname: "www.noizyfish.com", service: "noizyfish-landing", zone: "noizyfish.com" },
    { hostname: "fishmusicinc.com", service: "fishmusicinc-landing", zone: "fishmusicinc.com" },
    { hostname: "www.fishmusicinc.com", service: "fishmusicinc-landing", zone: "fishmusicinc.com" },
    { hostname: "noizylab.ca", service: "noizylab-ca-landing", zone: "noizylab.ca" },
    { hostname: "www.noizylab.ca", service: "noizylab-ca-landing", zone: "noizylab.ca" },
  ],
  // Workers that MUST have observability on
  observability_required: [
    "heaven",
    "gabriel",
    "noizy-mcp",
    "noizy-app",
    "noizy-landing",
    "mc96-follower",
    "cf01-discord",
    "metabeast-remote",
    "dreamchamber-landing",
    "noizyfish-landing",
    "noizykidz-landing",
    "noizyvox-landing",
    "fishmusicinc-landing",
    "noizylab-landing",
    "noizylab-ca-landing",
    "noizyworld",
    "heaven17",
  ],
};

/**
 * noizy2036Diff — compare live CF state to declared state. Pure read; no writes.
 * Returns { declared_count, drifts: [{kind, ...}] }.
 */
async function noizy2036Diff(env) {
  if (!env.CF_OPS_TOKEN) {
    return {
      declared_count: 0,
      drifts: [{ kind: "token_missing", detail: "CF_OPS_TOKEN not set" }],
    };
  }
  const headers = { Authorization: `Bearer ${env.CF_OPS_TOKEN}` };
  const [cds, scripts] = await Promise.all([
    fetch(`${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/domains?per_page=200`, { headers }).then(
      (r) => r.json(),
    ),
    fetch(`${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/scripts?per_page=200`, { headers }).then(
      (r) => r.json(),
    ),
  ]);
  const liveCdSet = new Set((cds.result ?? []).map((c) => `${c.hostname}::${c.service}`));
  const liveWorkerSet = new Set((scripts.result ?? []).map((w) => w.id));

  const drifts = [];
  // CD drift — declared hostname+service missing or mis-bound
  for (const want of NOIZY_2036_STATE.custom_domains) {
    const key = `${want.hostname}::${want.service}`;
    if (!liveCdSet.has(key)) {
      // Does the hostname exist at all, just on wrong service?
      const existingForHost = (cds.result ?? []).find((c) => c.hostname === want.hostname);
      if (existingForHost) {
        drifts.push({
          kind: "mis-bound_cd",
          hostname: want.hostname,
          want_service: want.service,
          live_service: existingForHost.service,
          zone: want.zone,
        });
      } else {
        drifts.push({
          kind: "missing_cd",
          hostname: want.hostname,
          service: want.service,
          zone: want.zone,
        });
      }
    }
  }

  // Observability drift — check each required worker's script-settings
  // (parallel; tolerate individual failures)
  const obsProbes = await Promise.allSettled(
    NOIZY_2036_STATE.observability_required.map(async (worker) => {
      if (!liveWorkerSet.has(worker)) return { worker, missing: true };
      const r = await fetch(
        `${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/scripts/${worker}/script-settings`,
        { headers },
      ).then((r) => r.json());
      const enabled = r.result?.observability?.enabled === true;
      return { worker, enabled, missing: false };
    }),
  );
  for (const p of obsProbes) {
    if (p.status !== "fulfilled") continue;
    const v = p.value;
    if (v.missing) drifts.push({ kind: "worker_missing", worker: v.worker });
    else if (!v.enabled) drifts.push({ kind: "observability_off", worker: v.worker });
  }

  const declared_count =
    NOIZY_2036_STATE.custom_domains.length + NOIZY_2036_STATE.observability_required.length;
  return { declared_count, drifts };
}

function opUuid() {
  // RFC 4122 v4
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function cfOpsLogWrite(env, row) {
  // Caller supplies: correlation_id, phase, actor_id, initiator_surface, verb,
  // target_zone?, target_hostname?, target_worker?, target_resource_id?,
  // payload_json?, result_json?, http_status?, ok?, error_message?
  const id = opUuid();
  try {
    await env.GABRIEL_DB.prepare(
      `INSERT INTO cf_ops_log
       (id, correlation_id, phase, actor_id, initiator_surface, verb,
        target_zone, target_hostname, target_worker, target_resource_id,
        payload_json, result_json, http_status, ok, error_message)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        id,
        row.correlation_id,
        row.phase,
        row.actor_id ?? null,
        row.initiator_surface ?? null,
        row.verb,
        row.target_zone ?? null,
        row.target_hostname ?? null,
        row.target_worker ?? null,
        row.target_resource_id ?? null,
        JSON.stringify(row.payload ?? {}),
        row.result ? JSON.stringify(row.result) : null,
        row.http_status ?? null,
        row.ok === undefined ? null : row.ok ? 1 : 0,
        row.error_message ?? null,
      )
      .run();
    return id;
  } catch (e) {
    console.error("cf_ops_log write failed:", e.message);
    return null;
  }
}

async function runCfOp(env, { verb, payload, request, actor_id, initiator_surface, cfReq }) {
  // cfReq = { method, path, body? } — the actual CF API call
  const correlation_id = opUuid();
  await cfOpsLogWrite(env, {
    correlation_id,
    phase: "before",
    actor_id,
    initiator_surface,
    verb,
    target_zone: request.target_zone,
    target_hostname: request.target_hostname,
    target_worker: request.target_worker,
    target_resource_id: request.target_resource_id,
    payload,
  });

  if (!env.CF_OPS_TOKEN) {
    await cfOpsLogWrite(env, {
      correlation_id,
      phase: "error",
      actor_id,
      initiator_surface,
      verb,
      target_zone: request.target_zone,
      target_hostname: request.target_hostname,
      target_worker: request.target_worker,
      target_resource_id: request.target_resource_id,
      payload,
      http_status: 0,
      ok: false,
      error_message: "CF_OPS_TOKEN not configured on Heaven",
    });
    return {
      ok: false,
      correlation_id,
      error:
        "CF_OPS_TOKEN not set on Heaven Worker. `wrangler secret put CF_OPS_TOKEN` with a fine-grained token scoped to the ops you need.",
    };
  }

  let status = 0;
  let body = {};
  try {
    const init = {
      method: cfReq.method,
      headers: {
        Authorization: `Bearer ${env.CF_OPS_TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    if (cfReq.body) init.body = JSON.stringify(cfReq.body);
    const res = await fetch(`${CF_API}${cfReq.path}`, init);
    status = res.status;
    try {
      body = await res.json();
    } catch {
      body = { parse_error: "non-JSON response" };
    }
  } catch (e) {
    await cfOpsLogWrite(env, {
      correlation_id,
      phase: "error",
      actor_id,
      initiator_surface,
      verb,
      target_zone: request.target_zone,
      target_hostname: request.target_hostname,
      target_worker: request.target_worker,
      target_resource_id: request.target_resource_id,
      payload,
      http_status: 0,
      ok: false,
      error_message: e.message,
    });
    return { ok: false, correlation_id, error: e.message };
  }

  const ok = status >= 200 && status < 300 && body.success !== false;
  await cfOpsLogWrite(env, {
    correlation_id,
    phase: ok ? "after" : "error",
    actor_id,
    initiator_surface,
    verb,
    target_zone: request.target_zone,
    target_hostname: request.target_hostname,
    target_worker: request.target_worker,
    target_resource_id: request.target_resource_id,
    payload,
    result: body,
    http_status: status,
    ok,
    error_message: ok ? null : JSON.stringify(body.errors ?? body),
  });
  return { ok, correlation_id, http_status: status, result: body };
}

async function handleCfOp(path, method, request, env) {
  const tail = path.replace("/api/v1/ops/cf/", "");
  const actor_id = request.headers.get("X-NOIZY-Actor") || "RSP_001";
  const initiator_surface = request.headers.get("X-NOIZY-Surface") || "heaven-api";
  let body = {};
  if (method === "POST") {
    try {
      body = await request.json();
    } catch {
      return err("invalid JSON body", 400);
    }
  }

  // ── GET /api/v1/ops/cf/audit ─────────────────────────────────────────
  if (tail === "audit" && method === "GET") {
    const url = new URL(request.url);
    const verb = url.searchParams.get("verb");
    const actor = url.searchParams.get("actor");
    const since = url.searchParams.get("since"); // ISO or unix seconds
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 500);
    let q = `SELECT id, correlation_id, phase, actor_id, verb, target_zone, target_hostname,
             target_worker, http_status, ok, recorded_at FROM cf_ops_log WHERE 1=1`;
    const binds = [];
    if (verb) {
      q += " AND verb = ?";
      binds.push(verb);
    }
    if (actor) {
      q += " AND actor_id = ?";
      binds.push(actor);
    }
    if (since) {
      q += " AND recorded_at >= ?";
      binds.push(since);
    }
    q += " ORDER BY recorded_at DESC LIMIT ?";
    binds.push(limit);
    const r = await env.GABRIEL_DB.prepare(q)
      .bind(...binds)
      .all();
    return json({ ok: true, events: r.results ?? [], count: (r.results ?? []).length });
  }

  // ── GET /api/v1/ops/cf/inventory ─────────────────────────────────────
  if (tail === "inventory" && method === "GET") {
    if (!env.CF_OPS_TOKEN) {
      return err("CF_OPS_TOKEN not set — inventory requires CF API access", 503);
    }
    const headers = { Authorization: `Bearer ${env.CF_OPS_TOKEN}` };
    const [zones, cds, workers] = await Promise.all([
      fetch(`${CF_API}/zones?account.id=${CF_ACCOUNT_ID}&per_page=50`, { headers }).then((r) =>
        r.json(),
      ),
      fetch(`${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/domains?per_page=100`, { headers }).then(
        (r) => r.json(),
      ),
      fetch(`${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/scripts?per_page=100`, { headers }).then(
        (r) => r.json(),
      ),
    ]);
    return json({
      ok: true,
      zones: (zones.result ?? []).map((z) => ({ name: z.name, status: z.status })),
      custom_domains: (cds.result ?? []).map((c) => ({
        hostname: c.hostname,
        service: c.service,
        zone: c.zone_name,
      })),
      workers: (workers.result ?? []).map((w) => w.id),
    });
  }

  // ── Mutating ops ─────────────────────────────────────────────────────
  if (method !== "POST") return err(`method ${method} not supported on ${path}`, 405);

  const opCtx = {
    actor_id,
    initiator_surface,
    request: {
      target_zone: body.zone ?? null,
      target_hostname: body.hostname ?? null,
      target_worker: body.worker ?? body.service ?? null,
      target_resource_id: body.tunnel_id ?? body.zone_id ?? null,
    },
    payload: body,
  };

  if (tail === "cd-bind") {
    if (!body.hostname || !body.service || !body.zone) {
      return err("hostname, service, zone required", 400);
    }
    const r = await runCfOp(env, {
      verb: "cf.cd-bind",
      ...opCtx,
      cfReq: {
        method: "PUT",
        path: `/accounts/${CF_ACCOUNT_ID}/workers/domains`,
        body: {
          environment: "production",
          hostname: body.hostname,
          service: body.service,
          zone_name: body.zone,
        },
      },
    });
    return json(r, r.ok ? 200 : 502);
  }

  if (tail === "route-add") {
    if (!body.zone_id || !body.pattern || !body.worker) {
      return err("zone_id, pattern, worker required", 400);
    }
    const r = await runCfOp(env, {
      verb: "cf.route-add",
      ...opCtx,
      cfReq: {
        method: "POST",
        path: `/zones/${body.zone_id}/workers/routes`,
        body: { pattern: body.pattern, script: body.worker },
      },
    });
    return json(r, r.ok ? 200 : 502);
  }

  if (tail === "secret-push") {
    if (!body.worker || !body.key || body.value === undefined) {
      return err("worker, key, value required", 400);
    }
    const r = await runCfOp(env, {
      verb: "cf.secret-push",
      ...opCtx,
      payload: { worker: body.worker, key: body.key, value_length: String(body.value).length },
      cfReq: {
        method: "PUT",
        path: `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${body.worker}/secrets`,
        body: { name: body.key, text: String(body.value), type: "secret_text" },
      },
    });
    return json(r, r.ok ? 200 : 502);
  }

  if (tail === "email-enable") {
    if (!body.zone_id) return err("zone_id required", 400);
    const r = await runCfOp(env, {
      verb: "cf.email-enable",
      ...opCtx,
      cfReq: { method: "POST", path: `/zones/${body.zone_id}/email/routing/enable` },
    });
    return json(r, r.ok ? 200 : 502);
  }

  if (tail === "tunnel-config") {
    if (!body.tunnel_id || !Array.isArray(body.ingress)) {
      return err("tunnel_id, ingress[] required", 400);
    }
    const r = await runCfOp(env, {
      verb: "cf.tunnel-config",
      ...opCtx,
      cfReq: {
        method: "PUT",
        path: `/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${body.tunnel_id}/configurations`,
        body: { config: { ingress: body.ingress } },
      },
    });
    return json(r, r.ok ? 200 : 502);
  }

  if (tail === "observability") {
    if (!body.worker) return err("worker required", 400);
    const r = await runCfOp(env, {
      verb: "cf.observability",
      ...opCtx,
      cfReq: {
        method: "PATCH",
        path: `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${body.worker}/script-settings`,
        body: {
          observability: {
            enabled: body.enabled !== false,
            head_sampling_rate: body.sampling ?? 1.0,
          },
        },
      },
    });
    return json(r, r.ok ? 200 : 502);
  }

  if (tail === "reconcile") {
    // 2036 SELF-HEALING LOOP — compares live CF state against the declared
    // state in NOIZY_2036_STATE, reports drift, and (if body.apply=true)
    // calls relevant ops to correct it. Invoked by Cron Trigger hourly or
    // on-demand by any agent.
    const dryRun = body.apply !== true;
    const diff = await noizy2036Diff(env);
    const corrections = [];
    if (!dryRun) {
      for (const d of diff.drifts) {
        if (d.kind === "missing_cd") {
          const r = await runCfOp(env, {
            verb: "cf.cd-bind",
            actor_id: "reconciler",
            initiator_surface,
            request: { target_zone: d.zone, target_hostname: d.hostname, target_worker: d.service },
            payload: d,
            cfReq: {
              method: "PUT",
              path: `/accounts/${CF_ACCOUNT_ID}/workers/domains`,
              body: {
                environment: "production",
                hostname: d.hostname,
                service: d.service,
                zone_name: d.zone,
              },
            },
          });
          corrections.push({ drift: d, result: r });
        } else if (d.kind === "observability_off") {
          const r = await runCfOp(env, {
            verb: "cf.observability",
            actor_id: "reconciler",
            initiator_surface,
            request: { target_worker: d.worker },
            payload: d,
            cfReq: {
              method: "PATCH",
              path: `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${d.worker}/script-settings`,
              body: { observability: { enabled: true, head_sampling_rate: 1.0 } },
            },
          });
          corrections.push({ drift: d, result: r });
        }
      }
    }
    await cfOpsLogWrite(env, {
      correlation_id: opUuid(),
      phase: "after",
      actor_id,
      initiator_surface,
      verb: "cf.reconcile",
      payload: { dry_run: dryRun, drift_count: diff.drifts.length },
      result: { drifts: diff.drifts.length, corrections: corrections.length },
      http_status: 200,
      ok: true,
    });
    return json({
      ok: true,
      dry_run: dryRun,
      declared_objects: diff.declared_count,
      drift_count: diff.drifts.length,
      drifts: diff.drifts,
      corrections_applied: corrections.length,
      corrections,
    });
  }

  if (tail === "dns-apply") {
    // body.plan = [{type,name,content,proxied?,priority?}, ...]
    if (!body.zone_id || !Array.isArray(body.plan)) {
      return err("zone_id, plan[] required", 400);
    }
    const results = [];
    for (const rec of body.plan) {
      const r = await runCfOp(env, {
        verb: "cf.dns-record",
        actor_id,
        initiator_surface,
        request: { target_zone: body.zone ?? null, target_hostname: rec.name ?? null },
        payload: rec,
        cfReq: {
          method: "POST",
          path: `/zones/${body.zone_id}/dns_records`,
          body: {
            type: rec.type,
            name: rec.name,
            content: rec.content,
            proxied: rec.proxied ?? false,
            priority: rec.priority,
            ttl: rec.ttl ?? 1,
          },
        },
      });
      results.push(r);
    }
    const okCount = results.filter((r) => r.ok).length;
    return json(
      { ok: okCount === results.length, applied: okCount, total: results.length, results },
      okCount === results.length ? 200 : 207,
    );
  }

  return err(`unknown ops verb: ${tail}`, 404);
}

// ─── C2PA Manifest (Lightweight) ──────────────────────────────────────────────

async function generateC2PAManifest(synthRequest, env) {
  const assertions = {
    consent_token_id: synthRequest.consent_token_id,
    actor_id: synthRequest.actor_id,
    descendant_id: synthRequest.descendant_id,
    never_clauses_checked: "passed",
    timestamp: now(),
    use_category: synthRequest.use_category,
    status: synthRequest.status,
  };

  // Create SHA-256 signature from assertions + secret
  const secret = env.C2PA_SECRET || "NOIZY-HVS-17.0.0";
  const assertionsJson = JSON.stringify(assertions);
  const signInput = assertionsJson + secret;
  const encoder = new TextEncoder();
  const signData = encoder.encode(signInput);
  const hashBuffer = await crypto.subtle.digest("SHA-256", signData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const manifest = {
    claim_generator: "NOIZY-HVS/17.0.0",
    title: "Synthetic Voice Output",
    claim_made_at: now(),
    claim_made_by: "HEAVEN Consent Kernel",
    assertions: assertions,
    signature: signature,
    schema_version: "2.0",
    never_clause_enforcement: {
      political: synthRequest.use_category?.toLowerCase().includes("politic") === false,
      sexual: synthRequest.use_category?.toLowerCase().includes("adult") === false,
      weapons: synthRequest.use_category?.toLowerCase().includes("weapon") === false,
      deception: synthRequest.use_category?.toLowerCase().includes("deceiv") === false,
      hate: synthRequest.use_category?.toLowerCase().includes("hate") === false,
    },
  };

  return manifest;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

async function hashToken(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
