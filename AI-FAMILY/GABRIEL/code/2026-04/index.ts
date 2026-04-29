/**
 * GABRIEL Worker — the outer dispatcher.
 *
 * Responsibilities:
 *   1. Verify the Cloudflare Access JWT (Layer A).
 *   2. Resolve the user email; defense-in-depth check against allow-list.
 *   3. Parse the command, generate a ULID request id.
 *   4. If DESTRUCTIVE/RESERVED: verify the warrant signature via WebCrypto ed25519.
 *   5. Route to the GabrielBrain Durable Object.
 *   6. Return the result as JSON.
 *
 * Never-overwrite guarantee:
 *   The Brain's commands table is INSERT-ONLY. Replaying the same ULID is refused.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { CommandRequest, CommandResult, CommandTier, Env } from "./brain";

export { GabrielBrain } from "./brain";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALLOW_LIST: ReadonlyArray<string> = [
  "rsp@noizy.ai",
  "rsplowman@icloud.com", // retained during GWS transition; remove when noizy.ai GWS is fully cut over
];

// Tier classification for every known command. Unknown commands are refused.
const TIER: Record<string, CommandTier> = {
  "workers.list": "READ",
  "dns.zones.list": "READ",
  "d1.list": "READ",
  "audit.list": "READ",
  "version": "READ",
  // WRITE / DESTRUCTIVE commands added in Phase 2
};

// ---------------------------------------------------------------------------
// Worker entry
// ---------------------------------------------------------------------------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return json({ status: "ok", phase: 1 });
    }

    // --- 1. Verify Access JWT ---
    const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return json({ error: "no access token" }, 401);

    const JWKS = createRemoteJWKSet(
      new URL(`https://${env.TEAM_DOMAIN}/cdn-cgi/access/certs`)
    );

    let claims: { email?: string };
    try {
      const { payload } = await jwtVerify(jwt, JWKS, {
        issuer: `https://${env.TEAM_DOMAIN}`,
        audience: env.APP_AUD,
      });
      claims = payload as { email?: string };
    } catch {
      return json({ error: "invalid access token" }, 401);
    }

    const email = (claims.email ?? "").toLowerCase();
    if (!ALLOW_LIST.map((e) => e.toLowerCase()).includes(email)) {
      return json({ error: "not authorized" }, 403);
    }

    // --- 2. Parse body ---
    if (req.method !== "POST") return json({ error: "use POST" }, 405);
    let body: { command?: string; args?: Record<string, unknown>; warrant?: Warrant };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }

    const name = body.command;
    if (!name) return json({ error: "command required" }, 400);
    const tier = TIER[name];
    if (!tier) return json({ error: `unknown command: ${name}` }, 400);

    // --- 3. Warrant verification for destructive tiers ---
    let warrant_id: string | undefined;
    if (tier === "DESTRUCTIVE" || tier === "RESERVED") {
      if (!body.warrant) return json({ error: "warrant required for destructive command" }, 400);
      const w = body.warrant;
      const warrantOk = await verifyWarrant(w, env, name, email);
      if (!warrantOk.ok) return json({ error: `warrant invalid: ${warrantOk.reason}` }, 403);
      warrant_id = w.warrant_id;
    }

    // --- 4. Dispatch to Brain ---
    const request: CommandRequest = {
      id: ulid(),
      name,
      tier,
      args: body.args ?? {},
      requester: email,
      received_at: new Date().toISOString(),
      warrant_id,
    };

    // One Brain instance per account. For a multi-account future, key by account id.
    const id = env.BRAIN.idFromName(`gabriel-brain:${env.CF_ACCOUNT_ID}`);
    const stub = env.BRAIN.get(id);

    const result: CommandResult = await stub.acceptCommand(request);
    return json(result);
  },
} satisfies ExportedHandler<Env & { BRAIN: DurableObjectNamespace }>;

// ---------------------------------------------------------------------------
// Warrant verification (ed25519)
// ---------------------------------------------------------------------------

interface Warrant {
  warrant_id: string;
  issued_at: string;
  expires_at: string;
  operation: string;
  target: string;
  reason: string;
  issuer: string;
  signature: string; // base64(ed25519 signature of the canonical JSON, signature field excluded)
}

async function verifyWarrant(
  w: Warrant,
  env: Env,
  commandName: string,
  requesterEmail: string
): Promise<{ ok: boolean; reason: string }> {
  // Clock check (±5 min skew allowed)
  const now = Date.now();
  const exp = Date.parse(w.expires_at);
  if (Number.isNaN(exp)) return { ok: false, reason: "bad expires_at" };
  if (now > exp) return { ok: false, reason: "expired" };
  if (exp - now > 1000 * 60 * 30) return { ok: false, reason: "expires too far in future" };

  // Operation must match
  if (w.operation !== commandName) {
    return { ok: false, reason: "operation mismatch" };
  }
  // Issuer must match requester
  if (w.issuer.toLowerCase() !== requesterEmail) {
    return { ok: false, reason: "issuer mismatch" };
  }

  // Canonicalize (signature field excluded)
  const { signature, ...payload } = w;
  const canonical = new TextEncoder().encode(canonicalJSON(payload));
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  const rawKey = Uint8Array.from(atob(env.WARRANT_PUBLIC_KEY), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "Ed25519" },
    false,
    ["verify"]
  );
  const verified = await crypto.subtle.verify("Ed25519", key, sigBytes, canonical);
  return verified ? { ok: true, reason: "" } : { ok: false, reason: "signature invalid" };
}

// Stable canonical JSON (keys sorted) — what the YubiKey signed locally.
function canonicalJSON(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(Object.fromEntries(keys.map((k) => [k, obj[k]])));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Crockford-base32 ULID. Good enough for a first pass; swap for a vetted library
// before Phase 2.
function ulid(): string {
  const time = Date.now();
  const timeChars: string[] = [];
  let t = time;
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  for (let i = 0; i < 10; i++) {
    timeChars.unshift(alphabet[t % 32]);
    t = Math.floor(t / 32);
  }
  const rand = crypto.getRandomValues(new Uint8Array(10));
  let randStr = "";
  for (const b of rand) randStr += alphabet[b % 32];
  return timeChars.join("") + randStr;
}
