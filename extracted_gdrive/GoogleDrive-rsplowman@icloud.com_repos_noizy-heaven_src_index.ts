/**
 * HEAVEN — NOIZY Empire API Gateway
 * Constitutional Infrastructure for Human Creativity
 *
 * v18.1.0 — 2026-04-17
 *   + AI inference routes (Whisper STT, LLaMA summarize/chat, SDXL image)
 *   + R2 Voice Vault upload/download with signed metadata
 *   + GAP_SOLVER endpoints (GORUNFREE absence intelligence)
 *   + KV-backed rate limiting (per-IP, per-actor)
 *   + Feature flag enforcement on every protected route
 *   + Dynamic health version from env
 *   + Request dedup via idempotency key (KV_SESSIONS)
 *   + Consolidated CORS — single origin policy
 *
 * Routes: noizy.ai/*
 * Gabriel watches every transaction.
 * HVS: 75/25. Perpetual. Locked at protocol level.
 *
 * Author: Robert Stephen Plowman / MC96ECO
 */

// ── NOIZYSTREAM v2 Signaling (Durable Object) ────────────────────────────────
export { SignalingRoom } from "./signaling";
import { handleStreamRoute } from "./signaling";
import { NoizyClaw, RouterSignal } from "./noizyclaw";
import { alertDiscord } from "./lib/discord-webhook";


interface Env {
  // ── D1 Databases ──────────────────────────────────────────────────────
  DB_MEMORY: D1Database; // agent-memory — constitutional ledger
  DB_REPAIRS: D1Database; // noizy-prod   — repair tickets / deploy log
  DB_AQUARIUM: D1Database; // aquarium-archive — NOIZYFISH catalog

  // ── KV Namespaces ─────────────────────────────────────────────────────
  KV_SIGNUPS: KVNamespace;
  KV_ROYALTIES: KVNamespace;
  KV_GUILD: KVNamespace;
  KV_SESSIONS: KVNamespace; // also used for idempotency keys & rate limits
  KV_SUBMISSIONS: KVNamespace;
  KV_MEMCELL: KVNamespace;
  FEATURE_FLAGS: KVNamespace; // <1ms runtime feature-flag reads
  GAP_SOLVER: KVNamespace; // GORUNFREE absence intelligence

  // ── R2 Object Storage ─────────────────────────────────────────────────
  VOICE_VAULT: R2Bucket; // noizy-voice-vault

  // ── Workers AI ────────────────────────────────────────────────────────
  AI: Ai;

  // ── Durable Objects ───────────────────────────────────────────────────
  SIGNALING_ROOMS: DurableObjectNamespace;

  // ── Environment Variables ─────────────────────────────────────────────
  NOIZY_ENV: string;
  NOIZY_VERSION: string;
  FOUNDING_ACTOR_FLOOR: string;
  STANDARD_ACTOR_FLOOR: string;
  VOICE_VAULT_BUCKET: string;
  MESH_ORIGIN: string;

  // ── Secrets ──────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: string;
  NOIZY_SECRET: string;
  NOIZY_KEY: string;
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
  N8N_WEBHOOK_SECRET: string;
  N8N_WEBHOOK_URL: string;
  LINEAR_API_KEY: string;
  LINEAR_TEAM_ID: string;
  NOTION_API_KEY: string;
  NOTION_DB_ID: string;
  SLACK_WEBHOOK_URL: string; // #noizy-alerts — fires on kill-switch + Never-Clause violation (legacy, 2026-04-27 → Discord)
  SLACK_BOT_TOKEN: string; // xoxb-... required for /api/slack/audio file downloads
  DISCORD_WEBHOOK_URL: string; // #noizy-alerts — Discord migration target (2026-04-27)
}

// ── NOIZYCLAW Router Contract ────────────────────────────────────────────────
// The Law of the Request: deterministic routing + tool policy.
interface RouterDecision {
  request_id: string;
  source: "discord" | "slack" | "ios" | "web" | "system";
  signals: {
    intent: string;
    risk: "low" | "medium" | "high";
    auth_type: "machine" | "human" | "anonymous";
    posture_verified: boolean;
  };
  decision: {
    models: string[];
    tools_allowed: string[];
    execution_hub: "GOD_M2_ULTRA" | "EDGE_WORKER";
    blocked: boolean;
    reason: string;
  };
}


// ── CORS ──────────────────────────────────────────────────────────────────────
// Allowlist of origins permitted for credentialed (non-public) requests.
// Responses default to production origin; `applyDynamicOrigin` rewrites the
// `Access-Control-Allow-Origin` to echo the request Origin when it matches.
const CORS_ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://noizy.ai",
  "https://www.noizy.ai",
  "https://staging.noizy.ai",
  "https://noizy-landing.rsp-5f3.workers.dev",
  "https://heaven.rsp-5f3.workers.dev",
  "http://localhost:7777",
  "http://localhost:9777",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://noizy.ai",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Noizy-Key, X-Idempotency-Key",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

// Public endpoints get wildcard origin
const CORS_PUBLIC = {
  ...CORS_HEADERS,
  "Access-Control-Allow-Origin": "*",
};

// Rewrite a response's Access-Control-Allow-Origin to echo the request Origin
// when that Origin is in the allowlist. Leaves wildcard-origin public responses
// untouched so unauthenticated clients continue to get "*".
function applyDynamicOrigin(request: Request, response: Response): Response {
  const reqOrigin = request.headers.get("Origin");
  if (!reqOrigin || !CORS_ALLOWED_ORIGINS.has(reqOrigin)) return response;
  const currentAllow = response.headers.get("Access-Control-Allow-Origin");
  if (currentAllow !== "https://noizy.ai") return response;
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", reqOrigin);
  const existingVary = newHeaders.get("Vary");
  if (!existingVary || !existingVary.toLowerCase().includes("origin")) {
    newHeaders.set("Vary", existingVary ? `${existingVary}, Origin` : "Origin");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function cors(pub = false): Response {
  return new Response(null, { headers: pub ? CORS_PUBLIC : CORS_HEADERS });
}

function json(data: unknown, status = 200, pub = false): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(pub ? CORS_PUBLIC : CORS_HEADERS),
    },
  });
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Uses KV_SESSIONS: key = "rl:{window}:{actor}" → count
// Window = 60s buckets, limit = 120 req/min per actor

const RL_LIMIT = 120;
const RL_WINDOW = 60; // seconds

async function checkRateLimit(
  kv: KVNamespace,
  actorId: string,
  cf: IncomingRequestCfProperties | undefined,
): Promise<{ ok: boolean; remaining: number }> {
  const windowKey = Math.floor(Date.now() / 1000 / RL_WINDOW);
  const ip = (cf as any)?.connectingIp ?? "unknown";
  const key = `rl:${windowKey}:${actorId}:${ip}`;

  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= RL_LIMIT) {
    return { ok: false, remaining: 0 };
  }

  // Increment — TTL covers this window + next
  await kv.put(key, String(count + 1), { expirationTtl: RL_WINDOW * 2 });
  return { ok: true, remaining: RL_LIMIT - count - 1 };
}

// ── Feature Flags ─────────────────────────────────────────────────────────────
// Flags stored as JSON in KV_MEMCELL under key "flags"
// Example: { "ai_inference": true, "voice_vault": true, "gap_solver": true }

interface FeatureFlags {
  ai_inference?: boolean;
  voice_vault?: boolean;
  gap_solver?: boolean;
  maintenance?: boolean;
  [key: string]: boolean | undefined;
}

async function getFlags(kv: KVNamespace): Promise<FeatureFlags> {
  try {
    const raw = await kv.get("flags");
    return raw ? (JSON.parse(raw) as FeatureFlags) : {};
  } catch {
    return {};
  }
}

async function flagEnabled(kv: KVNamespace, flag: string): Promise<boolean> {
  const flags = await getFlags(kv);
  // Default ON for all flags unless explicitly false
  return flags[flag] !== false;
}

// ── Idempotency ───────────────────────────────────────────────────────────────
// Header: X-Idempotency-Key → cache response for 5 min in KV_SESSIONS

async function checkIdempotency(kv: KVNamespace, key: string | null): Promise<Response | null> {
  if (!key) return null;
  const cached = await kv.get(`idem:${key}`);
  if (!cached) return null;
  const { body, status } = JSON.parse(cached) as { body: string; status: number };
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, "X-Idempotent-Replay": "true" },
  });
}

async function saveIdempotency(
  kv: KVNamespace,
  key: string | null,
  response: Response,
): Promise<void> {
  if (!key) return;
  const body = await response.clone().text();
  await kv.put(`idem:${key}`, JSON.stringify({ body, status: response.status }), {
    expirationTtl: 300,
  });
}

// ── Gabriel: immutable constitutional audit trail ─────────────────────────────
async function gabriel(
  db: D1Database,
  event_type: string,
  actor_id: string | null,
  target_id: string | null,
  payload: unknown,
  sovereignty_check?: unknown,
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO gabriel_log (id, event_type, actor_id, target_id, payload, sovereignty_check, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      id,
      event_type,
      actor_id ?? null,
      target_id ?? null,
      JSON.stringify(payload),
      sovereignty_check ? JSON.stringify(sovereignty_check) : null,
    )
    .run();
  return id;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// ── Auth: Zero Trust + Machine Identity ──────────────────────────────────────
function authenticated(request: Request, env: Env): { ok: boolean; type: "machine" | "human" | "anonymous"; actor?: string; posture?: string } {
  // 1. Machine Auth: Cloudflare Access Service Tokens
  const clientId = request.headers.get("CF-Access-Client-Id");
  const clientSecret = request.headers.get("CF-Access-Client-Secret");
  if (clientId && clientSecret && clientId === env.CF_ACCESS_CLIENT_ID && clientSecret === env.CF_ACCESS_CLIENT_SECRET) {
    return { ok: true, type: "machine", actor: "bot:service-token" };
  }

  // 2. Human Auth: Sovereign Key + Device Posture
  const key = request.headers.get("X-Noizy-Key");
  if (key && key === env.NOIZY_KEY) {
    const posture = request.headers.get("CF-Device-Posture") || "unverified";
    return { ok: true, type: "human", actor: "human:rsp", posture };
  }

  return { ok: false, type: "anonymous" };
}

// ── NOIZYCLAW Router Decision Engine ──────────────────────────────────────────
// Generates the RouterDecision JSON passed to models in the pool.
function decideRoute(request: Request, auth: { type: string; actor?: string; posture?: string }, intent = "general"): RouterDecision {
  const url = new URL(request.url);
  const risk = intent.includes("kill") || intent.includes("delete") || intent.includes("revoke") ? "high" : "low";
  const postureVerified = auth.posture === "secure" || request.headers.has("cf-device-id");

  return {
    request_id: crypto.randomUUID(),
    source: (request.headers.get("X-Noizy-Source") as any) || "web",
    signals: {
      intent,
      risk,
      auth_type: auth.type as any,
      posture_verified: postureVerified
    },
    decision: {
      models: risk === "high" ? ["local-reasoner", "claude-3-5-sonnet"] : ["local-fast"],
      tools_allowed: risk === "high" ? ["ledger.write", "kill_switch", "proof.bundle"] : ["ledger.write"],
      execution_hub: "GOD_M2_ULTRA", // Default all heavy lifting to the M2 Ultra execution hub
      blocked: false,
      reason: `Authenticated via ${auth.type} (${auth.posture || "no-posture"}). Intent: ${intent}.`
    }
  };
}


function authenticatedN8N(request: Request, env: Env): boolean {
  const sig = request.headers.get("X-N8N-Signature");
  return !!sig && !!env.N8N_WEBHOOK_SECRET && sig === env.N8N_WEBHOOK_SECRET;
}

// ── Outbound: Linear ─────────────────────────────────────────────────────────
async function createLinearTicket(
  env: Env,
  title: string,
  description: string,
  priority: number = 2,
  labelIds?: string[],
): Promise<{ id: string; url: string } | null> {
  if (!env.LINEAR_API_KEY || !env.LINEAR_TEAM_ID) return null;
  const mutation = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { id url } }
    }`;
  const vars = {
    input: {
      teamId: env.LINEAR_TEAM_ID,
      title,
      description,
      priority,
      ...(labelIds?.length ? { labelIds } : {}),
    },
  };
  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: env.LINEAR_API_KEY },
      body: JSON.stringify({ query: mutation, variables: vars }),
    });
    const data = (await res.json()) as {
      data?: { issueCreate?: { success: boolean; issue?: { id: string; url: string } } };
    };
    return data.data?.issueCreate?.issue ?? null;
  } catch {
    return null;
  }
}

// ── Outbound: Notion ─────────────────────────────────────────────────────────
async function appendToNotion(
  env: Env,
  title: string,
  content: string,
  tags: string[] = [],
  sourceType: string = "system",
): Promise<string | null> {
  if (!env.NOTION_API_KEY || !env.NOTION_DB_ID) return null;
  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DB_ID },
        properties: {
          Name: { title: [{ text: { content: title } }] },
          Tags: { multi_select: tags.map((t) => ({ name: t })) },
          SourceType: { select: { name: sourceType } },
          LoggedAt: { date: { start: new Date().toISOString() } },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ text: { content: content.slice(0, 2000) } }] },
          },
        ],
      }),
    });
    const page = (await res.json()) as { id?: string };
    return page.id ?? null;
  } catch {
    return null;
  }
}

// ── Outbound: n8n ────────────────────────────────────────────────────────────
async function pushToN8N(env: Env, payload: Record<string, unknown>): Promise<void> {
  if (!env.N8N_WEBHOOK_URL) return;
  try {
    await fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Noizy-Source": "heaven",
        "X-N8N-Signature": env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    /* fire and forget */
  }
}

// ── Outbound: Slack critical alerts (#noizy-alerts) ─────────────────────────
// NEXT_25 Move 16: Slack webhook for CRITICAL events
async function alertSlack(
  env: Env,
  text: string,
  level: "critical" | "warning" | "info" = "info",
): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) return;
  const emoji = level === "critical" ? "🚨" : level === "warning" ? "⚠️" : "ℹ️";
  try {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${emoji} *HEAVEN ALERT* [${level.toUpperCase()}] — ${new Date().toISOString()}\n${text}`,
      }),
    });
  } catch {
    /* fire and forget — gabriel already logged */
  }
}

// ── Consent Verification — Real Kernel ───────────────────────────────────────
async function verifyConsent(
  db: D1Database,
  memberId: string,
  useCase: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const row = (await db
      .prepare(
        `SELECT id, use_cases FROM consent_matrix 
         WHERE member_id = ? AND revoked_at IS NULL 
         AND (expires_at IS NULL OR expires_at > datetime('now'))`
      )
      .bind(memberId)
      .first()) as { id: string; use_cases: string } | null;

    if (!row) {
      return { ok: false, error: "No active consent matrix found for member." };
    }

    const useCases = JSON.parse(row.use_cases) as string[];
    if (!useCases.includes(useCase)) {
      return { ok: false, error: `Consent for use case '${useCase}' not granted.` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Consent check failed: ${err instanceof Error ? err.message : "internal error"}` };
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return applyDynamicOrigin(request, await handleRequest(request, env));
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    const cf = (request as any).cf as IncomingRequestCfProperties | undefined;

    if (method === "OPTIONS") return cors(path.startsWith("/stream/"));

    // ── Maintenance gate ─────────────────────────────────────────────────────
    const flags = await getFlags(env.FEATURE_FLAGS);
    if (flags.maintenance && path !== "/api/health") {
      return json({ error: "Service temporarily unavailable", maintenance: true }, 503, true);
    }

    // ── Public routes ────────────────────────────────────────────────────────

    if (path === "/" || path === "/api/health") {
      return new Response(
        JSON.stringify(
          {
            status: "alive",
            service: "HEAVEN",
            version: env.NOIZY_VERSION ?? "18.1.0",
            env: env.NOIZY_ENV ?? "production",
            timestamp: new Date().toISOString(),
            gabriel: "watching",
            hvs: "75/25 perpetual",
            portals: ["NOIZYVOX", "NOIZYFISH", "NOIZYKIDZ", "NOIZYLAB", "WISDOM", "myFAMILY"],
            features: {
              ai_inference: flags.ai_inference !== false,
              voice_vault: flags.voice_vault !== false,
              gap_solver: flags.gap_solver !== false,
            },
          },
          null,
          2,
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // Email signup — public, no auth
    if (path === "/api/signup" && method === "POST") {
      const { email } = (await request.json()) as { email?: string };
      if (!email || !email.includes("@")) return json({ error: "Invalid email" }, 400, true);
      await env.KV_SIGNUPS.put(
        `signup:${email}`,
        JSON.stringify({
          email,
          signed_up_at: new Date().toISOString(),
          source: "noizy.ai",
          country: cf?.country ?? "unknown",
        }),
      );
      await gabriel(env.DB_MEMORY, "SIGNUP", null, null, { email });
      return json({ ok: true }, 200, true);
    }

    // ── Protected routes ─────────────────────────────────────────────────────
    if (!authenticated(request, env)) {
      return json({ error: "Unauthorized. Sovereignty requires credentials." }, 401);
    }

    // Rate limit per actor (X-Noizy-Key acts as actor token)
    const actorKey = request.headers.get("X-Noizy-Key") ?? "anon";
    const rl = await checkRateLimit(env.KV_SESSIONS, actorKey, cf);
    if (!rl.ok) {
      return json({ error: "Rate limit exceeded", retry_after: RL_WINDOW }, 429);
    }

    // Idempotency check (mutating methods only)
    const idemKey =
      method === "POST" || method === "PUT" ? request.headers.get("X-Idempotency-Key") : null;

    // ── NOIZYCLAW Router Implementation ──────────────────────────────────────
    const claw = new NoizyClaw(env.DB_MEMORY);
    
    // Map path to semantic domain
    const domainMap: Record<string, RouterSignal["domain"]> = {
      "/api/ai/": "creative",
      "/api/family/": "family",
      "/api/heal/": "healing",
      "/api/ops/": "ops",
    };
    const domain = Object.entries(domainMap).find(([p]) => path.startsWith(p))?.[1] || "ops";
    
    // Determine risk level (heuristic)
    let risk: RouterSignal["risk"] = "low";
    if (method === "DELETE" || path.includes("/admin/") || path.includes("/royalties/")) {
      risk = "high";
    } else if (method === "POST" || method === "PUT") {
      risk = "medium";
    }

    const decision = await claw.route(request, { domain, risk });

    // Enforce Never Clause & Consent (Blocking Decision)
    if (decision.decision.blockedByNeverClause) {
      return json({ 
        error: "Never Clause Violation", 
        reason: decision.decision.reason,
        request_id: decision.requestId 
      }, 403);
    }

    if (!decision.decision.consentVerified && risk !== "low") {
      return json({ 
        error: "Consent Violation", 
        reason: "Active consent for this domain is missing or revoked.",
        request_id: decision.requestId 
      }, 403);
    }

    try {

      // ══════════════════════════════════════════════════════════════════════
      // AI INFERENCE — Workers AI edge inference
      // ══════════════════════════════════════════════════════════════════════

      // ── POST /api/ai/transcribe — Whisper STT ───────────────────────────
      // Body: multipart/form-data with field "audio" (binary) + optional "language"
      if (path === "/api/ai/transcribe" && method === "POST") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "ai_inference"))) {
          return json({ error: "AI inference is currently disabled" }, 503);
        }

        const form = await request.formData();
        const audio = form.get("audio") as File | null;
        const lang = (form.get("language") as string | null) ?? "en";

        if (!audio) return json({ error: "audio field required (binary file)" }, 400);

        const audioBuffer = await audio.arrayBuffer();

        const result = (await env.AI.run("@cf/openai/whisper", {
          audio: [...new Uint8Array(audioBuffer)],
        })) as { text?: string; words?: Array<{ word: string; start: number; end: number }> };

        await gabriel(env.DB_MEMORY, "AI_TRANSCRIBE", actorKey, null, {
          language: lang,
          audio_bytes: audioBuffer.byteLength,
          word_count: result.words?.length ?? 0,
        });

        const resp = json({ ok: true, transcript: result.text ?? "", words: result.words ?? [] });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      // ── POST /api/ai/summarize — LLaMA summarization ─────────────────────
      if (path === "/api/ai/summarize" && method === "POST") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "ai_inference"))) {
          return json({ error: "AI inference is currently disabled" }, 503);
        }

        const body = (await request.json()) as {
          text: string;
          style?: "brief" | "detailed" | "bullet";
          max_tokens?: number;
        };

        if (!body.text?.trim()) return json({ error: "text required" }, 400);

        const styleMap = {
          brief: "Summarize the following in 2-3 sentences:",
          detailed: "Write a detailed summary of the following:",
          bullet: "Summarize the following as concise bullet points:",
        };
        const prefix = styleMap[body.style ?? "brief"] ?? styleMap.brief;
        const messages = [
          {
            role: "system" as const,
            content:
              "You are GABRIEL, the NOIZY.AI constitutional intelligence. Be concise, accurate, and sovereignty-aware.",
          },
          { role: "user" as const, content: `${prefix}\n\n${body.text.slice(0, 12000)}` },
        ];

        const result = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages,
          max_tokens: body.max_tokens ?? 512,
        })) as { response?: string };

        await gabriel(env.DB_MEMORY, "AI_SUMMARIZE", actorKey, null, {
          style: body.style ?? "brief",
          input_len: body.text.length,
          output_len: result.response?.length ?? 0,
        });

        const resp = json({ ok: true, summary: result.response ?? "" });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      // ── POST /api/ai/chat — GABRIEL conversational agent ─────────────────
      if (path === "/api/ai/chat" && method === "POST") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "ai_inference"))) {
          return json({ error: "AI inference is currently disabled" }, 503);
        }

        const body = (await request.json()) as {
          messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
          system?: string;
          max_tokens?: number;
          actor_id?: string;
        };

        if (!body.messages?.length) return json({ error: "messages required" }, 400);

        const systemPrompt =
          body.system ??
          `You are GABRIEL, the sovereign AI constitutional foundation of the NOIZY Empire. ` +
            `You uphold the Plowman Standard (HVS 75/25). ` +
            `Every interaction is logged and immutable. Consent is law. Be direct, insightful, and authentic.`;

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...body.messages.slice(-20), // safety: last 20 turns only
        ];

        const result = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages,
          max_tokens: body.max_tokens ?? 1024,
        })) as { response?: string };

        await gabriel(env.DB_MEMORY, "AI_CHAT", body.actor_id ?? actorKey, null, {
          turn_count: body.messages.length,
          system_used: !!body.system,
          output_len: result.response?.length ?? 0,
        });

        const resp = json({
          ok: true,
          response: result.response ?? "",
          model: "@cf/meta/llama-3.1-8b-instruct",
        });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      // ── POST /api/ai/image — SDXL edge image generation ──────────────────
      if (path === "/api/ai/image" && method === "POST") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "ai_inference"))) {
          return json({ error: "AI inference is currently disabled" }, 503);
        }

        const body = (await request.json()) as {
          prompt: string;
          negative_prompt?: string;
          num_steps?: number;
          guidance?: number;
          seed?: number;
        };

        if (!body.prompt?.trim()) return json({ error: "prompt required" }, 400);

        const result = (await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
          prompt: body.prompt.slice(0, 500),
          negative_prompt: body.negative_prompt ?? "",
          num_steps: body.num_steps ?? 20,
          guidance: body.guidance ?? 7.5,
          seed: body.seed,
        })) as ReadableStream | Uint8Array | { image?: string };

        await gabriel(env.DB_MEMORY, "AI_IMAGE", actorKey, null, {
          prompt_len: body.prompt.length,
          num_steps: body.num_steps ?? 20,
        });

        // SDXL returns raw bytes — stream back as PNG
        if (result instanceof ReadableStream || result instanceof Uint8Array) {
          return new Response(result as BodyInit, {
            headers: { "Content-Type": "image/png", ...CORS_HEADERS },
          });
        }

        // Fallback: JSON with base64
        return json({ ok: true, image: (result as { image?: string }).image ?? null });
      }

      // ══════════════════════════════════════════════════════════════════════
      // VOICE VAULT — R2 Object Storage
      // ══════════════════════════════════════════════════════════════════════

      // ── POST /api/vault/upload — Upload audio to R2 ──────────────────────
      // Body: multipart/form-data: "audio" (binary) + "member_id" + optional metadata
      if (path === "/api/vault/upload" && method === "POST") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "voice_vault"))) {
          return json({ error: "Voice Vault is currently disabled" }, 503);
        }

        const form = await request.formData();
        const audio = form.get("audio") as File | null;
        const memberId = form.get("member_id") as string | null;
        const label = (form.get("label") as string | null) ?? "unlabeled";
        const emotional = (form.get("emotional_tags") as string | null) ?? "[]";

        if (!audio || !memberId) {
          return json({ error: "audio and member_id required" }, 400);
        }

        const vaultId = crypto.randomUUID();
        const c2paStamp = `c2pa:vault:${vaultId}:${Date.now()}`;
        const key = `voices/${memberId}/${vaultId}.${audio.name?.split(".").pop() ?? "wav"}`;

        await env.VOICE_VAULT.put(key, audio.stream(), {
          httpMetadata: {
            contentType: audio.type || "audio/wav",
          },
          customMetadata: {
            member_id: memberId,
            vault_id: vaultId,
            label,
            emotional_tags: emotional,
            c2pa_stamp: c2paStamp,
            uploaded_at: new Date().toISOString(),
            hvs_split: "75/25",
          },
        });

        // Also write to D1 profile table
        await env.DB_MEMORY.prepare(
          `INSERT INTO voice_profiles
             (id, member_id, file_ref, sample_rate, bit_depth, emotional_tags, c2pa_stamp, model_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(vaultId, memberId, key, 48000, 32, emotional, c2paStamp, "vault_upload")
          .run();

        await gabriel(env.DB_MEMORY, "VAULT_UPLOAD", memberId, vaultId, {
          key,
          label,
          c2pa_stamp: c2paStamp,
          bytes: audio.size,
        });

        const resp = json({ ok: true, vault_id: vaultId, key, c2pa_stamp: c2paStamp });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      // ── GET /api/vault/:vaultId — Stream audio from R2 ──────────────────
      const vaultGetMatch = path.match(/^\/api\/vault\/([a-zA-Z0-9-]+)$/);
      if (vaultGetMatch && method === "GET") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "voice_vault"))) {
          return json({ error: "Voice Vault is currently disabled" }, 503);
        }

        const vaultId = vaultGetMatch[1];
        // Lookup key from D1
        const row = (await env.DB_MEMORY.prepare(
          `SELECT file_ref, member_id FROM voice_profiles WHERE id = ?`,
        )
          .bind(vaultId)
          .first()) as { file_ref?: string; member_id?: string } | null;

        if (!row?.file_ref) return json({ error: "Vault entry not found" }, 404);

        const obj = await env.VOICE_VAULT.get(row.file_ref);
        if (!obj) return json({ error: "Audio file not found in Vault" }, 404);

        await gabriel(env.DB_MEMORY, "VAULT_ACCESS", actorKey, vaultId, {
          file_ref: row.file_ref,
          member_id: row.member_id,
        });

        return new Response(obj.body, {
          headers: {
            "Content-Type": obj.httpMetadata?.contentType ?? "audio/wav",
            "Cache-Control": "private, max-age=3600",
            ...CORS_HEADERS,
          },
        });
      }

      // ── DELETE /api/vault/:vaultId — Sovereignty delete ─────────────────
      const vaultDelMatch = path.match(/^\/api\/vault\/([a-zA-Z0-9-]+)$/);
      if (vaultDelMatch && method === "DELETE") {
        const vaultId = vaultDelMatch[1];

        const row = (await env.DB_MEMORY.prepare(
          `SELECT file_ref, member_id FROM voice_profiles WHERE id = ?`,
        )
          .bind(vaultId)
          .first()) as { file_ref?: string; member_id?: string } | null;

        if (!row?.file_ref) return json({ error: "Vault entry not found" }, 404);

        await env.VOICE_VAULT.delete(row.file_ref);
        await env.DB_MEMORY.prepare(`UPDATE voice_profiles SET file_ref = '[DELETED]' WHERE id = ?`)
          .bind(vaultId)
          .run();

        await gabriel(env.DB_MEMORY, "VAULT_DELETE", actorKey, vaultId, {
          file_ref: row.file_ref,
          member_id: row.member_id,
        });

        return json({ ok: true, vault_id: vaultId, deleted: true });
      }

      // ══════════════════════════════════════════════════════════════════════
      // GAP SOLVER — GORUNFREE Absence Intelligence
      // ══════════════════════════════════════════════════════════════════════

      // ── POST /api/gap/log — Log an observed gap (absence event) ──────────
      if (path === "/api/gap/log" && method === "POST") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "gap_solver"))) {
          return json({ error: "Gap Solver is currently disabled" }, 503);
        }

        const body = (await request.json()) as {
          actor_id: string;
          gap_type: string; // 'release_miss' | 'session_gap' | 'revenue_gap' | 'catalog_gap'
          description: string;
          severity?: "critical" | "high" | "medium" | "low";
          metadata?: Record<string, unknown>;
          resolve_by?: string; // ISO date
        };

        if (!body.actor_id || !body.gap_type || !body.description) {
          return json({ error: "actor_id, gap_type, and description required" }, 400);
        }

        const gapId = crypto.randomUUID();
        const severity = body.severity ?? "medium";
        const gapData = {
          id: gapId,
          actor_id: body.actor_id,
          gap_type: body.gap_type,
          description: body.description,
          severity,
          metadata: body.metadata ?? {},
          resolve_by: body.resolve_by ?? null,
          logged_at: new Date().toISOString(),
          status: "open",
        };

        await env.GAP_SOLVER.put(
          `gap:${body.actor_id}:${gapId}`,
          JSON.stringify(gapData),
          { expirationTtl: 86400 * 90 }, // 90 days
        );

        // Smart: if severity critical/high → auto-create Linear ticket
        let linearTicket = null;
        if ((severity === "critical" || severity === "high") && env.LINEAR_API_KEY) {
          linearTicket = await createLinearTicket(
            env,
            `[GAP/${severity.toUpperCase()}] ${body.gap_type}: ${body.actor_id}`,
            `**Actor:** ${body.actor_id}\n**Type:** ${body.gap_type}\n**Severity:** ${severity}\n\n${body.description}`,
            severity === "critical" ? 1 : 2,
          );
        }

        await gabriel(env.DB_MEMORY, "GAP_LOGGED", body.actor_id, gapId, {
          gap_type: body.gap_type,
          severity,
          linear_ticket: linearTicket?.id,
        });

        const resp = json({ ok: true, gap_id: gapId, severity, linear_ticket: linearTicket });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      // ── GET /api/gap/:actorId — Retrieve actor's gap intelligence ────────
      const gapGetMatch = path.match(/^\/api\/gap\/([^/]+)$/);
      if (gapGetMatch && method === "GET") {
        if (!(await flagEnabled(env.FEATURE_FLAGS, "gap_solver"))) {
          return json({ error: "Gap Solver is currently disabled" }, 503);
        }

        const actorId = gapGetMatch[1];
        const severity = url.searchParams.get("severity");
        const status = url.searchParams.get("status") ?? "open";

        const list = await env.GAP_SOLVER.list<string>({ prefix: `gap:${actorId}:` });
        const gaps = await Promise.all(
          list.keys.map(async (k) => {
            const raw = await env.GAP_SOLVER.get(k.name);
            return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
          }),
        );

        const filtered = gaps
          .filter(Boolean)
          .filter((g) => !severity || g!.severity === severity)
          .filter((g) => !status || g!.status === status)
          .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return (
              (order[a!.severity as keyof typeof order] ?? 9) -
              (order[b!.severity as keyof typeof order] ?? 9)
            );
          });

        return json({ ok: true, actor_id: actorId, count: filtered.length, gaps: filtered });
      }

      // ── POST /api/gap/:gapId/resolve — Mark gap resolved ─────────────────
      const gapResolveMatch = path.match(/^\/api\/gap\/([^/]+)\/resolve$/);
      if (gapResolveMatch && method === "POST") {
        const actorBody = (await request.json()) as { actor_id: string; resolution?: string };
        const gapId = gapResolveMatch[1];

        const rawKey = `gap:${actorBody.actor_id}:${gapId}`;
        const raw = await env.GAP_SOLVER.get(rawKey);
        if (!raw) return json({ error: "Gap not found" }, 404);

        const gapData = JSON.parse(raw) as Record<string, unknown>;
        gapData.status = "resolved";
        gapData.resolved_at = new Date().toISOString();
        gapData.resolution = actorBody.resolution ?? "resolved";

        await env.GAP_SOLVER.put(rawKey, JSON.stringify(gapData), { expirationTtl: 86400 * 90 });
        await gabriel(env.DB_MEMORY, "GAP_RESOLVED", actorBody.actor_id, gapId, {
          resolution: actorBody.resolution,
        });

        return json({ ok: true, gap_id: gapId, status: "resolved" });
      }

      // ══════════════════════════════════════════════════════════════════════
      // FEATURE FLAGS ADMIN
      // ══════════════════════════════════════════════════════════════════════

      // ── GET /api/flags — Read current flags ───────────────────────────────
      if (path === "/api/flags" && method === "GET") {
        const currentFlags = await getFlags(env.FEATURE_FLAGS);
        return json({ ok: true, flags: currentFlags });
      }

      // ── POST /api/flags — Set a feature flag ─────────────────────────────
      if (path === "/api/flags" && method === "POST") {
        const body = (await request.json()) as { flag: string; value: boolean };
        if (!body.flag || typeof body.value !== "boolean") {
          return json({ error: "flag (string) and value (boolean) required" }, 400);
        }

        const currentFlags = await getFlags(env.FEATURE_FLAGS);
        currentFlags[body.flag] = body.value;
        await env.FEATURE_FLAGS.put("flags", JSON.stringify(currentFlags));

        await gabriel(env.DB_MEMORY, "FLAG_SET", actorKey, null, {
          flag: body.flag,
          value: body.value,
        });
        return json({ ok: true, flags: currentFlags });
      }

      // ══════════════════════════════════════════════════════════════════════
      // KILL SWITCH — Consent token revocation (NEXT_25 Move 8)
      // POST /api/kill-switch
      // Body: { token_id, actor_id, reason? }
      // Effect: is_active=0 in D1 → Gabriel audit → Slack #noizy-alerts
      // ══════════════════════════════════════════════════════════════════════

      if (path === "/api/kill-switch" && method === "POST") {
        const body = (await request.json()) as {
          token_id: string;
          actor_id: string;
          reason?: string;
        };

        if (!body.token_id || !body.actor_id) {
          return json({ error: "token_id and actor_id required" }, 400);
        }

        // Revoke in D1 — graceful: table may not exist yet until migrations run
        try {
          await env.DB_MEMORY.prepare(
            `UPDATE hvs_consent_tokens
             SET is_active = 0, revoked_at = datetime('now'), revocation_reason = ?
             WHERE id = ? AND actor_id = ?`,
          )
            .bind(body.reason ?? "kill-switch-activated", body.token_id, body.actor_id)
            .run();
        } catch (err) {
          // Table may not exist until 0001_init.sql migration runs — log and continue
          await gabriel(env.DB_MEMORY, "KILL_SWITCH_TABLE_MISSING", body.actor_id, body.token_id, {
            error: err instanceof Error ? err.message : "table not found",
          }).catch(() => {});
        }

        // Immutable audit entry
        const gabId = await gabriel(
          env.DB_MEMORY,
          "KILL_SWITCH_ACTIVATED",
          body.actor_id,
          body.token_id,
          { reason: body.reason ?? "kill-switch-activated", timestamp: new Date().toISOString() },
        );

        // Critical alert — parallel fire (Slack legacy + Discord migration target, 2026-04-27)
        const killSwitchMsg = `Kill Switch activated\n• Token: \`${body.token_id}\`\n• Actor: \`${body.actor_id}\`\n• Reason: ${body.reason ?? "not specified"}\n• Gabriel: \`${gabId}\``;
        await alertSlack(env, killSwitchMsg, "critical");
        await alertDiscord(env, killSwitchMsg, "critical");

        return json({
          ok: true,
          token_id: body.token_id,
          actor_id: body.actor_id,
          revoked_at: new Date().toISOString(),
          gabriel_id: gabId,
          slack_fired: !!env.SLACK_WEBHOOK_URL,
          discord_fired: !!env.DISCORD_WEBHOOK_URL,
        });
      }

      // ══════════════════════════════════════════════════════════════════════
      // OPENCLAW 36 — master-orchestrator dispatch
      // Constitutional: docs/openclaw/OPENCLAW_36.md (LOCKED 2026-04-29)
      // Migration:    ops/migrations/agent-memory/010_gabriel_intents_receipts.sql
      // Client:       noizybeast/integrations/openclaw.mjs (NoizyOpenClaw)
      // ══════════════════════════════════════════════════════════════════════

      // 36 named claws — must match the client-side CLAW_REGISTRY in
      // noizybeast/integrations/openclaw.mjs. If you add or rename a claw,
      // update BOTH files in the same commit, then bump OPENCLAW_36 to v2.
      const CLAW_REGISTRY: Record<string, readonly string[]> = {
        discord: [
          "intake.idea", "intake.task", "intake.feedback",
          "answer.docs", "announce.release",
          "summary.feedback", "summary.thread",
          "ping.member", "tag.mod",
          "react.proxy", "vote.collect", "vote.tally",
        ],
        slack: [
          "ops.deploy.request", "ops.deploy.execute",
          "ops.dns.request", "ops.dns.execute",
          "ops.repair.request", "ops.repair.approve",
          "ops.secret.request",
          "alert.fanout", "alert.ack",
          "approve.merge", "approve.rollback", "approve.amendment",
        ],
        cloudflare: [
          "edge.deploy.canary", "edge.deploy.promote", "edge.deploy.rollback",
          "edge.dns.update", "edge.r2.put", "edge.r2.list",
          "edge.kv.put", "edge.kv.get",
          "edge.d1.query", "edge.d1.write",
          "edge.worker.tail", "edge.worker.metrics",
        ],
      };

      // Per-Claw authority — fail-closed. Today only RSP_001 may dispatch any
      // claw; non-RSP actors get CONSENT_DENIED. As OPENCLAW_36 §Per-Surface
      // Authority Matrix is implemented per claw, this map gets richer.
      function authorizedFor(actorRole: string | undefined, _surface: string, _verb: string): boolean {
        return actorRole === "founder";
      }

      // GET /api/claw/receipts?verb=...&limit=N — recent receipts for a claw.
      if (path === "/api/claw/receipts" && method === "GET") {
        const verb = url.searchParams.get("verb");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 100);
        if (!verb) return json({ error: "verb query param required" }, 400);

        try {
          const intents = await env.DB_MEMORY
            .prepare(
              `SELECT i.id, i.actor_id, i.verb, i.target, i.status, i.created_at,
                      r.receipt_type, r.status AS receipt_status, r.summary
                 FROM gabriel_intents i
                 LEFT JOIN gabriel_receipts r ON r.intent_id = i.id
                WHERE i.verb = ?
                ORDER BY i.created_at DESC
                LIMIT ?`,
            )
            .bind(verb, limit)
            .all();
          return json({ verb, count: intents.results?.length ?? 0, results: intents.results ?? [] });
        } catch (e) {
          // Honest fail per fail-closed default — typically means migration 010 not yet applied.
          const detail = e instanceof Error ? e.message : "query failed";
          return json({ error: "receipts query failed", detail, hint: "ensure migration 010_gabriel_intents_receipts.sql is applied" }, 500);
        }
      }

      // POST /api/claw/dispatch — receive OpenClawCommand, validate, ledger, return receipt.
      // Implements steps 1, 2, 3, 4, 5, 6, 7 of the constitutional Claw loop.
      if (path === "/api/claw/dispatch" && method === "POST") {
        const cmd = (await request.json()) as {
          id?: string;
          source?: string;
          actor?: { id?: string; displayName?: string; role?: string };
          verb?: string;
          target?: string;
          payload?: Record<string, unknown>;
          created_at?: string;
        };

        // Step 2 — validate shape
        if (!cmd.id || !cmd.source || !cmd.actor?.id || !cmd.verb || !cmd.created_at) {
          return json(
            { status: "REJECTED", error: "OpenClawCommand missing required fields", required: ["id", "source", "actor.id", "verb", "created_at"] },
            400,
          );
        }
        const validSources = ["discord", "slack", "dashboard", "mcp", "worker"];
        if (!validSources.includes(cmd.source)) {
          return json({ status: "REJECTED", error: `source must be one of ${validSources.join(", ")}` }, 400);
        }

        // Surface inferred from header (sent by NoizyOpenClaw client) or by parsing
        // the verb prefix as a fallback.
        const surface = (request.headers.get("X-Claw-Surface") || "").toLowerCase()
          || (cmd.verb.startsWith("edge.") ? "cloudflare"
            : cmd.verb.startsWith("ops.") || cmd.verb.startsWith("alert.") || cmd.verb.startsWith("approve.") ? "slack"
            : cmd.verb.startsWith("intake.") || cmd.verb.startsWith("answer.") || cmd.verb.startsWith("summary.") ? "discord"
            : "");
        if (!CLAW_REGISTRY[surface]) {
          return json({ status: "REJECTED", error: `unknown claw surface "${surface}"` }, 400);
        }
        if (!CLAW_REGISTRY[surface].includes(cmd.verb)) {
          return json(
            { status: "REJECTED", error: `verb "${cmd.verb}" not in ${surface} registry`, valid_verbs: CLAW_REGISTRY[surface] },
            400,
          );
        }

        // Step 4 — write intent (status: 'received')
        const intentRowId = cmd.id;
        try {
          await env.DB_MEMORY
            .prepare(
              `INSERT INTO gabriel_intents (id, source, actor_id, actor_role, verb, target, payload, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'received', ?)`,
            )
            .bind(
              intentRowId,
              cmd.source,
              cmd.actor.id,
              cmd.actor.role ?? null,
              cmd.verb,
              cmd.target ?? null,
              JSON.stringify(cmd.payload ?? {}),
              cmd.created_at,
            )
            .run();
        } catch (e) {
          // Migration 010 not applied? Surface honestly per Article VII.
          const detail = e instanceof Error ? e.message : "intent insert failed";
          return json(
            { status: "REJECTED", error: "intent ledger write failed", detail, hint: "apply ops/migrations/agent-memory/010_gabriel_intents_receipts.sql" },
            500,
          );
        }

        // Step 3 — check role / authority
        if (!authorizedFor(cmd.actor.role, surface, cmd.verb)) {
          const receiptId = crypto.randomUUID();
          await env.DB_MEMORY
            .prepare(
              `INSERT INTO gabriel_receipts (id, intent_id, receipt_type, status, summary, created_at, created_by)
                 VALUES (?, ?, 'denial', 'blocked', ?, ?, 'heaven')`,
            )
            .bind(
              receiptId,
              intentRowId,
              `CONSENT_DENIED: actor role "${cmd.actor.role ?? "unknown"}" not authorized for ${surface}/${cmd.verb}`,
              new Date().toISOString(),
            )
            .run();
          await env.DB_MEMORY
            .prepare(`UPDATE gabriel_intents SET status='rejected' WHERE id=?`)
            .bind(intentRowId)
            .run();
          return json(
            {
              status: "CONSENT_DENIED",
              intent_id: intentRowId,
              receipt_id: receiptId,
              summary: `actor role "${cmd.actor.role ?? "unknown"}" not authorized for ${surface}/${cmd.verb}`,
              never_clause: null,
            },
            403,
          );
        }

        // Step 5 — execute. Today this is a stub: we accept the dispatch and
        // record it. Real per-claw executors land in apps/discord-claws/,
        // apps/slack-claws/, apps/cloudflare-claws/ per OPENCLAW_36 build order.
        // Until those land, the dispatcher is a constitutional intent recorder
        // (which is itself the Article-VII auditability the empire requires).
        const executedStatus = "ACCEPTED"; // becomes "EXECUTED" once executors land
        const executedSummary = `${surface}/${cmd.verb} accepted; executor not yet wired (see OPENCLAW_36 build order)`;

        // Step 6 — write receipt
        const receiptId = crypto.randomUUID();
        await env.DB_MEMORY
          .prepare(
            `INSERT INTO gabriel_receipts (id, intent_id, receipt_type, status, summary, created_at, created_by)
               VALUES (?, ?, 'approval', 'pending', ?, ?, 'heaven')`,
          )
          .bind(receiptId, intentRowId, executedSummary, new Date().toISOString())
          .run();
        await env.DB_MEMORY
          .prepare(`UPDATE gabriel_intents SET status='accepted' WHERE id=?`)
          .bind(intentRowId)
          .run();

        // Compose with existing constitutional ledger (gabriel_log) for cross-system audit.
        await gabriel(env.DB_MEMORY, "OPENCLAW_DISPATCH", cmd.actor.id, cmd.target ?? cmd.verb, {
          surface,
          verb: cmd.verb,
          source: cmd.source,
          intent_id: intentRowId,
          receipt_id: receiptId,
        });

        // Step 7 — return short status
        return json({
          status: executedStatus,
          intent_id: intentRowId,
          receipt_id: receiptId,
          summary: executedSummary,
          surface,
          verb: cmd.verb,
        });
      }

      // ══════════════════════════════════════════════════════════════════════
      // DISPATCH — forward to Mesh via CF Access
      // ══════════════════════════════════════════════════════════════════════

      if (path === "/api/dispatch" && method === "POST") {
        const body = (await request.json()) as {
          actor: string;
          device?: string;
          intent: string;
          target: string;
          context?: Record<string, unknown>;
        };

        if (!body.actor || !body.target || !body.intent) {
          return json({ error: "actor, target, and intent required" }, 400);
        }

        // MESH_ORIGIN must be set and must use https:// — no plaintext fallback.
        if (!env.MESH_ORIGIN || !env.MESH_ORIGIN.startsWith("https://")) {
          return json({ error: "MESH_ORIGIN is not configured or is not HTTPS — dispatch refused" }, 503);
        }
        const meshOrigin = env.MESH_ORIGIN;
        const meshHeaders: Record<string, string> = { "Content-Type": "application/json" };
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

          await gabriel(env.DB_MEMORY, "DISPATCH", body.actor, body.target, {
            intent: body.intent,
            device: body.device,
            mesh_status: meshRes.status,
          });

          const resp = json({
            ok: meshRes.ok,
            dispatch: meshData,
            timestamp: new Date().toISOString(),
          });
          await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
          return resp;
        } catch (err) {
          const detail = err instanceof Error ? err.message : "Mesh unreachable";
          await gabriel(env.DB_MEMORY, "DISPATCH_ERROR", body.actor, body.target, {
            intent: body.intent,
            error: detail,
          });
          return json({ error: "Mesh unreachable", detail }, 502);
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // myFAMILY.AI — Constitutional Foundation
      // ══════════════════════════════════════════════════════════════════════

      if (path === "/api/family/register" && method === "POST") {
        const { email, display_name } = (await request.json()) as {
          email: string;
          display_name: string;
        };
        if (!email || !display_name) return json({ error: "email and display_name required" }, 400);

        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
          `INSERT INTO family_members (id, email, display_name, hvs_acknowledged) VALUES (?, ?, ?, 1)`,
        )
          .bind(id, email, display_name)
          .run();

        await gabriel(env.DB_MEMORY, "FAMILY_MEMBER_REGISTERED", id, null, { email, display_name });
        const resp = json({ ok: true, member_id: id });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      if (path === "/api/family/consent" && method === "POST") {
        const body = (await request.json()) as {
          member_id: string;
          use_cases: string[];
          beneficiary_ids: string[];
          restrictions?: Record<string, unknown>;
          expires_at?: string;
        };
        if (!body.member_id || !body.use_cases?.length || !body.beneficiary_ids?.length) {
          return json({ error: "member_id, use_cases, and beneficiary_ids required" }, 400);
        }

        const id = crypto.randomUUID();
        const c2pa_stamp = `c2pa:noizy:consent:${id}:${Date.now()}`;

        await env.DB_MEMORY.prepare(
          `INSERT INTO consent_matrix
             (id, member_id, use_cases, restrictions, beneficiary_ids, c2pa_stamp, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            body.member_id,
            JSON.stringify(body.use_cases),
            JSON.stringify(body.restrictions ?? {}),
            JSON.stringify(body.beneficiary_ids),
            c2pa_stamp,
            body.expires_at ?? null,
          )
          .run();

        await gabriel(env.DB_MEMORY, "CONSENT_MATRIX_STORED", body.member_id, id, {
          use_cases: body.use_cases,
          beneficiary_count: body.beneficiary_ids.length,
          c2pa_stamp,
          perpetual: !body.expires_at,
        });

        const resp = json({ ok: true, consent_id: id, c2pa_stamp });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      if (path === "/api/family/beneficiary" && method === "POST") {
        const body = (await request.json()) as {
          member_id: string;
          beneficiary_member_id: string;
          access_rules?: Record<string, unknown>;
          granted_by: string;
        };
        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
          `INSERT INTO beneficiaries (id, member_id, beneficiary_member_id, access_rules, granted_by)
           VALUES (?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            body.member_id,
            body.beneficiary_member_id,
            JSON.stringify(body.access_rules ?? {}),
            body.granted_by,
          )
          .run();
        await gabriel(env.DB_MEMORY, "BENEFICIARY_GRANTED", body.granted_by, id, {
          voice_owner: body.member_id,
          beneficiary: body.beneficiary_member_id,
        });
        const resp = json({ ok: true, beneficiary_id: id });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      if (path === "/api/family/message" && method === "POST") {
        const body = (await request.json()) as {
          from_member_id: string;
          to_beneficiary_ids: string[];
          message_type: string;
          file_ref: string;
          duration_seconds?: number;
          trigger_conditions?: Record<string, unknown>;
        };

        // Enforce Consent Kernel
        const consent = await verifyConsent(env.DB_MEMORY, body.from_member_id, "message_delivery");
        if (!consent.ok) {
          await gabriel(env.DB_MEMORY, "CONSENT_VIOLATION", body.from_member_id, null, {
            attempt: "api/family/message",
            error: consent.error,
          });
          return json({ error: "Consent Violation", detail: consent.error }, 403);
        }

        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
          `INSERT INTO messages
             (id, from_member_id, to_beneficiary_ids, message_type, file_ref, duration_seconds, trigger_conditions)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            body.from_member_id,
            JSON.stringify(body.to_beneficiary_ids),
            body.message_type,
            body.file_ref,
            body.duration_seconds ?? null,
            JSON.stringify(body.trigger_conditions ?? {}),
          )
          .run();
        await gabriel(env.DB_MEMORY, "MESSAGE_REGISTERED", body.from_member_id, id, {
          message_type: body.message_type,
          beneficiary_count: body.to_beneficiary_ids.length,
        });
        const resp = json({ ok: true, message_id: id });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      if (path === "/api/heal/session" && method === "POST") {
        const body = (await request.json()) as {
          beneficiary_member_id: string;
          protocol_type: string;
          voice_message_id?: string;
          noizyfish_track_id?: string;
          frequency_hz?: number;
          duration_seconds?: number;
          biometric_before?: Record<string, unknown>;
          biometric_after?: Record<string, unknown>;
          outcome?: string;
          consent_verified?: boolean;
        };

        // Enforce Consent Kernel — healing sessions require 'healing_session' consent
        // from the voice owner if a voice_message_id is used, or from the beneficiary themselves.
        // For now, we check the beneficiary's consent for the session itself.
        const consent = await verifyConsent(env.DB_MEMORY, body.beneficiary_member_id, "healing_session");
        if (!consent.ok) {
          await gabriel(env.DB_MEMORY, "CONSENT_VIOLATION", body.beneficiary_member_id, null, {
            attempt: "api/heal/session",
            error: consent.error,
          });
          return json({ error: "Consent Violation", detail: consent.error }, 403);
        }

        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
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
        await gabriel(env.DB_MEMORY, "HEALING_SESSION_LOGGED", body.beneficiary_member_id, id, {
          protocol_type: body.protocol_type,
          frequency_hz: body.frequency_hz,
          outcome: body.outcome,
          consent_verified: body.consent_verified,
        });
        return json({ ok: true, session_id: id });
      }

      // ── Voice profile registration (metadata only) ────────────────────────
      if (path === "/api/voice/register" && method === "POST") {
        const body = (await request.json()) as {
          member_id: string;
          file_ref: string;
          sample_rate?: number;
          bit_depth?: number;
          duration_seconds?: number;
          emotional_tags?: string[];
          model_version?: string;
        };
        if (!body.member_id || !body.file_ref) {
          return json({ error: "member_id and file_ref required" }, 400);
        }
        const id = crypto.randomUUID();
        const c2pa_stamp = `c2pa:noizyvox:${id}:${Date.now()}`;
        await env.DB_MEMORY.prepare(
          `INSERT INTO voice_profiles
             (id, member_id, file_ref, sample_rate, bit_depth, duration_seconds, emotional_tags, c2pa_stamp, model_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            body.member_id,
            body.file_ref,
            body.sample_rate ?? 48000,
            body.bit_depth ?? 32,
            body.duration_seconds ?? null,
            JSON.stringify(body.emotional_tags ?? []),
            c2pa_stamp,
            body.model_version ?? "xtts_v2",
          )
          .run();
        await gabriel(env.DB_MEMORY, "VOICE_PROFILE_REGISTERED", body.member_id, id, {
          file_ref: body.file_ref,
          c2pa_stamp,
          model: body.model_version ?? "xtts_v2",
        });
        const resp = json({ ok: true, voice_id: id, c2pa_stamp });
        await saveIdempotency(env.KV_SESSIONS, idemKey, resp);
        return resp;
      }

      // ── Gabriel audit trail ────────────────────────────────────────────────
      if (path.startsWith("/api/gabriel/") && method === "GET") {
        const actor_id = path.replace("/api/gabriel/", "");
        if (!actor_id) return json({ error: "actor_id required" }, 400);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
        const result = await env.DB_MEMORY.prepare(
          `SELECT id, event_type, target_id, payload, logged_at
           FROM gabriel_log
           WHERE actor_id = ?
           ORDER BY logged_at DESC
           LIMIT ?`,
        )
          .bind(actor_id, limit)
          .all();
        return json({ ok: true, actor_id, events: result.results });
      }

      // ── Ledger · generic audit write (POST) + recent-events (GET) ─────────
      // External bosses (GABRIEL daemon, control-plane) write here via X-Noizy-Key.
      // Body (POST): { actor_id, event_kind, subject?, correlation_id?, payload?, source? }
      // Writes to gabriel_log via the gabriel() helper. Returns { ok, id }.
      if (path === "/api/v1/ledger" && method === "POST") {
        if (!authenticated(request, env)) {
          return json({ error: "Unauthorized — provide X-Noizy-Key header", status: 401 }, 401);
        }
        let body: {
          actor_id?: string;
          event_kind?: string;
          subject?: string;
          correlation_id?: string;
          payload?: unknown;
          source?: string;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: "invalid JSON body" }, 400);
        }
        if (!body.event_kind) {
          return json({ error: "event_kind required" }, 400);
        }
        const enriched = {
          ...(typeof body.payload === "object" && body.payload !== null
            ? body.payload
            : { raw: body.payload }),
          ...(body.correlation_id ? { correlation_id: body.correlation_id } : {}),
          ...(body.source ? { source: body.source } : {}),
        };
        const id = await gabriel(
          env.DB_MEMORY,
          body.event_kind,
          body.actor_id ?? null,
          body.subject ?? null,
          enriched,
        );
        return json({ ok: true, id });
      }

      if (path === "/api/v1/ledger" && method === "GET") {
        if (!authenticated(request, env)) {
          return json({ error: "Unauthorized — provide X-Noizy-Key header", status: 401 }, 401);
        }
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 500);
        const actorFilter = url.searchParams.get("actor_id");
        const kindFilter = url.searchParams.get("event_kind");
        let query = `SELECT id, event_type, actor_id, target_id, payload, logged_at
                     FROM gabriel_log`;
        const conds: string[] = [];
        const binds: unknown[] = [];
        if (actorFilter) {
          conds.push("actor_id = ?");
          binds.push(actorFilter);
        }
        if (kindFilter) {
          conds.push("event_type = ?");
          binds.push(kindFilter);
        }
        if (conds.length) query += " WHERE " + conds.join(" AND ");
        query += " ORDER BY logged_at DESC LIMIT ?";
        binds.push(limit);
        const result = await env.DB_MEMORY.prepare(query)
          .bind(...binds)
          .all();
        return json({ ok: true, events: result.results, count: result.results?.length ?? 0 });
      }

      // ── Royalties ─────────────────────────────────────────────────────────
      if (path === "/api/royalties" && method === "POST") {
        const body = (await request.json()) as {
          artist_id: string;
          track_id: string;
          amount_cents: number;
          source: string;
        };
        const key = `royalty:${body.artist_id}:${Date.now()}`;
        await env.KV_ROYALTIES.put(
          key,
          JSON.stringify({
            ...body,
            hvs_split: "75/25",
            recorded_at: new Date().toISOString(),
          }),
        );
        await gabriel(env.DB_MEMORY, "ROYALTY_LOGGED", body.artist_id, body.track_id, {
          amount_cents: body.amount_cents,
          source: body.source,
        });
        return json({ ok: true, key });
      }

      // ── NOIZYSTREAM v2 ─────────────────────────────────────────────────────
      if (path.startsWith("/stream/")) {
        const streamResponse = await handleStreamRoute(request, env, path);
        if (streamResponse) return streamResponse;
      }

      // ── Integration Hub — Webhook ingestion ───────────────────────────────
      if (path.startsWith("/api/hook/") && method === "POST") {
        const source = path.replace("/api/hook/", "").split("/")[0];
        if (source === "n8n" && !authenticatedN8N(request, env)) {
          return json({ error: "Invalid n8n signature" }, 401);
        }

        const body = (await request.json()) as {
          event: string;
          actor?: string;
          payload: Record<string, unknown>;
          route_to?: string;
          create_linear_ticket?: { title: string; description: string; priority?: number };
          log_to_notion?: { title: string; content: string; tags?: string[] };
        };
        if (!body.event) return json({ error: "event required" }, 400);

        const hookId = await gabriel(
          env.DB_MEMORY,
          `HOOK_RECEIVED:${source.toUpperCase()}`,
          body.actor ?? source,
          null,
          { event: body.event, route_to: body.route_to, payload: body.payload },
        );

        // Fire alerts on Never Clause violations — parallel Slack + Discord (migration 2026-04-27)
        if (body.event === "never_clause_violation") {
          const violationMsg = `Never Clause Violation detected\n• Source: \`${source}\`\n• Actor: \`${body.actor ?? "unknown"}\`\n• Payload: \`${JSON.stringify(body.payload).slice(0, 300)}\``;
          await alertSlack(env, violationMsg, "critical");
          await alertDiscord(env, violationMsg, "critical");
        }

        const results: Record<string, unknown> = { hook_id: hookId };

        if (body.route_to) {
          // MESH_ORIGIN must be set and must use https:// — no plaintext fallback.
          if (!env.MESH_ORIGIN || !env.MESH_ORIGIN.startsWith("https://")) {
            results.mesh = { ok: false, error: "MESH_ORIGIN not configured or not HTTPS" };
          } else {
          const meshOrigin = env.MESH_ORIGIN;
          const meshHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
            meshHeaders["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
            meshHeaders["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
          }
          try {
            const meshRes = await fetch(`${meshOrigin}/dispatch`, {
              method: "POST",
              headers: meshHeaders,
              body: JSON.stringify({
                actor: body.actor ?? source,
                target: body.route_to,
                intent: body.event,
                context: body.payload,
              }),
            });
            results.mesh = { ok: meshRes.ok, status: meshRes.status };
            await gabriel(env.DB_MEMORY, "HOOK_DISPATCHED", body.actor ?? source, body.route_to, {
              event: body.event,
              mesh_status: meshRes.status,
            });
          } catch (err) {
            results.mesh = { ok: false, error: err instanceof Error ? err.message : "unreachable" };
          }
          } // end else (MESH_ORIGIN valid)
        }

        if (body.create_linear_ticket) {
          const ticket = await createLinearTicket(
            env,
            body.create_linear_ticket.title,
            body.create_linear_ticket.description,
            body.create_linear_ticket.priority ?? 2,
          );
          results.linear = ticket ?? { error: "Linear not configured or call failed" };
          if (ticket) {
            await gabriel(env.DB_MEMORY, "LINEAR_TICKET_CREATED", body.actor ?? source, ticket.id, {
              title: body.create_linear_ticket.title,
              url: ticket.url,
            });
          }
        }

        if (body.log_to_notion) {
          const pageId = await appendToNotion(
            env,
            body.log_to_notion.title,
            body.log_to_notion.content,
            body.log_to_notion.tags ?? [body.event, source],
            source,
          );
          results.notion = pageId
            ? { page_id: pageId }
            : { error: "Notion not configured or call failed" };
          if (pageId) {
            await gabriel(env.DB_MEMORY, "NOTION_ENTRY_CREATED", body.actor ?? source, pageId, {
              title: body.log_to_notion.title,
            });
          }
        }

        return json({ ok: true, source, event: body.event, results });
      }

      // ── Linear callback ────────────────────────────────────────────────────
      if (path === "/api/hook/linear/status" && method === "POST") {
        const body = (await request.json()) as {
          action: string;
          data?: { id?: string; title?: string; state?: { name?: string }; url?: string };
        };
        const issueId = body.data?.id ?? "unknown";
        const state = body.data?.state?.name ?? "";
        await gabriel(env.DB_MEMORY, "LINEAR_CALLBACK", "linear", issueId, {
          action: body.action,
          state,
          title: body.data?.title,
        });
        if (state === "Done") {
          await pushToN8N(env, {
            event: "linear_ticket_done",
            issue_id: issueId,
            title: body.data?.title,
            url: body.data?.url,
            timestamp: new Date().toISOString(),
          });
        }
        return json({ ok: true, received: body.action, state });
      }

      // ── GET /api/health — version and status check ────────────────────────
      if (path === "/api/health" && method === "GET") {
        return json({
          ok: true,
          version: env.NOIZY_VERSION,
          env: env.NOIZY_ENV,
          status: "operational",
          decision: decision,
          timestamp: new Date().toISOString()
        });
      }

      // ── POST /api/identity — cross-platform resolution ────────────────────
      if (path === "/api/identity" && method === "POST") {
        const body = (await request.json()) as { platform: string; external_id: string };
        if (!body.platform || !body.external_id) return json({ error: "platform and external_id required" }, 400);

        // Placeholder for real resolution logic — currently just echoes back
        const resolution = {
          actor_id: `actor:${body.platform}:${body.external_id}`,
          sovereign_status: "verified",
          hvs_tier: "standard"
        };

        await gabriel(env.DB_MEMORY, "IDENTITY_RESOLVED", resolution.actor_id, null, {
          platform: body.platform,
          external_id: body.external_id
        });

        return json({ ok: true, identity: resolution });
      }

      // ── POST /api/slack/audio — Slack file downloader ────────────────────
      if (path === "/api/slack/audio" && method === "POST") {
        const body = (await request.json()) as { url_private: string };
        if (!body.url_private) return json({ error: "url_private required" }, 400);
        if (!env.SLACK_BOT_TOKEN) return json({ error: "SLACK_BOT_TOKEN not configured" }, 503);

        const slackRes = await fetch(body.url_private, {
          headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` }
        });

        if (!slackRes.ok) {
          return json({ error: `Slack download failed: ${slackRes.status}` }, 400);
        }

        const contentType = slackRes.headers.get("content-type") || "audio/mpeg";
        return new Response(slackRes.body, {
          headers: { ...CORS_HEADERS, "Content-Type": contentType }
        });
      }

      return json({ error: "Route not found" }, 404);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await gabriel(env.DB_MEMORY, "ERROR", null, null, { path, method, error: message }).catch(
        () => {},
      );
      return json({ error: "Internal error", detail: message }, 500);
    }
}
