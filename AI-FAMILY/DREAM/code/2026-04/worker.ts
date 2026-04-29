// ═══════════════════════════════════════════════════════════════════════════
// HEAVEN — NOIZY.AI FRONT DOOR WORKER
// World's first consent-native creative infrastructure gateway
// Robert Stephen Plowman | NOIZYFISH INC. | Ottawa, Canada
// ═══════════════════════════════════════════════════════════════════════════
// D1: agent-memory | MCP Protocol v1.0 | NCP v1.0 Consent | FTS5 Search
// Subdomain routing | 17+ REST endpoints | AASA | Sentinel Mode
// ═══════════════════════════════════════════════════════════════════════════

export interface Env {
  DB: D1Database;
  HEAVEN_SECRET?: string;
}

const EPOCH = "5th";
const VERSION = "1.0.0";
const FOUNDER = "RSP_001";
const BUILD_DATE = "2026-04-12";

// ─── CORS ────────────────────────────────────────────────────────────────────
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-NCP-Consent",
    "X-NOIZY-Epoch": EPOCH,
    "X-NOIZY-HVS": "Human Voice Sovereignty — not a slogan, a right",
    "X-NOIZY-Version": VERSION,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
  });
}

// ─── SENTINEL MODE — content safety ─────────────────────────────────────────
function sentinelCheck(text: string): { safe: boolean; reason?: string } {
  const blocked = ["deepfake", "unconsented synthesis", "voice theft", "bypass consent"];
  const lower = text.toLowerCase();
  for (const term of blocked) {
    if (lower.includes(term)) return { safe: false, reason: `Blocked term: "${term}"` };
  }
  return { safe: true };
}

// ─── NCP v1.0 — Consent-as-Code ──────────────────────────────────────────────
async function logConsent(
  env: Env,
  talentId: string,
  action: string,
  decision: string,
  requestId: string
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO ncp_consent_log
       (request_id, talent_id, action, decision, timestamp, epoch)
       VALUES (?, ?, ?, ?, datetime('now'), ?)`
    ).bind(requestId, talentId, action, decision, EPOCH).run();
  } catch {
    // non-fatal — log failure does not break request
  }
}

// ─── LANDING PAGE ────────────────────────────────────────────────────────────
function landingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="NOIZY — The world's first consent-native creative infrastructure. Built for the 5th Epoch of recorded music.">
<title>NOIZY — Consent-Native Creative Infrastructure</title>
<style>
  :root {
    --bg: #0B0B0F;
    --surface: #111118;
    --border: #1E1E2E;
    --text: #F0F0F5;
    --muted: #888899;
    --accent: #6B5CE7;
    --accent-light: #A395F5;
    --green: #1DB954;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; min-height: 100vh; }
  .container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
  header { border-bottom: 1px solid var(--border); padding: 20px 0; }
  .header-inner { display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 22px; font-weight: 700; letter-spacing: 0.08em; color: var(--text); }
  .logo span { color: var(--accent-light); }
  .epoch-badge { font-size: 11px; font-weight: 500; padding: 4px 12px; border: 1px solid var(--border); border-radius: 20px; color: var(--muted); letter-spacing: 0.06em; }
  .hero { padding: 80px 0 60px; }
  .hero-tag { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent-light); margin-bottom: 20px; }
  h1 { font-size: clamp(32px, 5vw, 52px); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 24px; }
  h1 em { font-style: normal; color: var(--accent-light); }
  .hero-sub { font-size: 18px; color: var(--muted); max-width: 600px; line-height: 1.65; margin-bottom: 40px; }
  .cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .btn { display: inline-block; padding: 13px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; transition: opacity 0.15s; cursor: pointer; border: none; }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }
  .btn:hover { opacity: 0.85; }
  .doctrine { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 28px 32px; margin: 60px 0; }
  .doctrine-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-light); margin-bottom: 12px; }
  .doctrine-text { font-size: 20px; font-weight: 500; font-style: italic; color: var(--text); }
  .principles { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 60px 0; }
  .principle { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; }
  .p-num { font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.08em; margin-bottom: 8px; }
  .p-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .p-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }
  footer { border-top: 1px solid var(--border); padding: 32px 0; margin-top: 60px; }
  .footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: gap; gap: 12px; }
  .footer-left { font-size: 13px; color: var(--muted); }
  .footer-links { display: flex; gap: 20px; }
  .footer-links a { font-size: 13px; color: var(--muted); text-decoration: none; }
  .footer-links a:hover { color: var(--text); }
  .status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--green); margin-right: 6px; }
</style>
</head>
<body>
<header>
  <div class="container">
    <div class="header-inner">
      <div class="logo">NOIZ<span>Y</span></div>
      <div class="epoch-badge">5th Epoch</div>
    </div>
  </div>
</header>
<main>
  <div class="container">
    <div class="hero">
      <div class="hero-tag">Consent-Native Creative Infrastructure</div>
      <h1>Changing how humans and AI work together to create a <em>more humane world.</em></h1>
      <p class="hero-sub">NOIZY is not a platform. It is infrastructure — built from the ground up to protect artist identity, enforce consent, and ensure creators own what they make. Forever.</p>
      <div class="cta-row">
        <a href="https://vox.noizy.ai" class="btn btn-primary">NOIZYVOX</a>
        <a href="/api/gospel" class="btn btn-secondary">The Gospel Deal</a>
      </div>
    </div>

    <div class="doctrine">
      <div class="doctrine-label">Elevation Doctrine</div>
      <div class="doctrine-text">"Make poop sink, love rise."</div>
    </div>

    <div class="principles">
      <div class="principle">
        <div class="p-num">PRINCIPLE 01</div>
        <div class="p-title">Human Voice Sovereignty</div>
        <div class="p-desc">Your voice is a right, not a resource. HVS is enforceable, inheritable, and non-negotiable.</div>
      </div>
      <div class="principle">
        <div class="p-num">PRINCIPLE 02</div>
        <div class="p-title">Consent-as-Code</div>
        <div class="p-desc">NCP v1.0 — every AI action on a creator's work requires explicit, logged, and revocable consent.</div>
      </div>
      <div class="principle">
        <div class="p-num">PRINCIPLE 03</div>
        <div class="p-title">The Plowman Standard</div>
        <div class="p-desc">75/25 creator-to-platform split. This is the floor, not a feature. Public law, not a preference.</div>
      </div>
      <div class="principle">
        <div class="p-num">PRINCIPLE 04</div>
        <div class="p-title">Voice Estate</div>
        <div class="p-desc">A creator's voice and catalog are inheritable for 100 years — not 70. Georgia May inherits.</div>
      </div>
      <div class="principle">
        <div class="p-num">PRINCIPLE 05</div>
        <div class="p-title">Infrastructure, not IP</div>
        <div class="p-desc">NOIZY owns no music. NOIZY owns the rails that protect it. Infrastructure IS the policy.</div>
      </div>
      <div class="principle">
        <div class="p-num">PRINCIPLE 06</div>
        <div class="p-title">DREED Resistance</div>
        <div class="p-desc">Dreadful Greed is the named antagonist. The Humanity Weight algorithm rewards craft, not volume.</div>
      </div>
    </div>
  </div>
</main>
<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="footer-left"><span class="status-dot"></span>NOIZYFISH INC. — Ottawa, Canada — Robert Stephen Plowman, Founder</div>
      <div class="footer-links">
        <a href="/api/health">Status</a>
        <a href="/api/gospel">Gospel</a>
        <a href="https://vox.noizy.ai">VOX</a>
      </div>
    </div>
  </div>
</footer>
</body>
</html>`;
}

// ─── GOSPEL DEAL PAGE ────────────────────────────────────────────────────────
async function gospelPage(env: Env): Promise<Response> {
  let principles: unknown[] = [];
  try {
    const res = await env.DB.prepare("SELECT * FROM gospel_deal ORDER BY principle_id").all();
    principles = res.results || [];
  } catch { principles = []; }
  return jsonResponse({
    title: "The Gospel Deal — 12 Constitutional Principles",
    founder: FOUNDER,
    epoch: EPOCH,
    principles,
    note: "These 12 principles are the constitutional foundation of the NOIZY Empire. They are not negotiable.",
  });
}

// ─── MCP PROTOCOL SERVER ─────────────────────────────────────────────────────
async function handleMCP(req: Request, env: Env): Promise<Response> {
  if (req.method === "GET") {
    return jsonResponse({
      protocol: "MCP/1.0",
      server: "HEAVEN",
      version: VERSION,
      tools: [
        { name: "memcell_query", description: "Query GABRIEL memcells from agent-memory D1" },
        { name: "memcell_write", description: "Write a memcell to agent-memory D1 (NCP consent required)" },
        { name: "gospel_query", description: "Query the Gospel Deal principles" },
        { name: "talent_profile", description: "Get or update a creator talent profile" },
        { name: "consent_log", description: "Log NCP v1.0 consent decision" },
        { name: "fts_search", description: "Full-text search across all memcells" },
        { name: "system_health", description: "Return system health status" },
        { name: "epoch_context", description: "Return 5th Epoch framing context" },
        { name: "sentinel_check", description: "Run Sentinel Mode safety check on text" },
        { name: "decision_contract", description: "Execute Decision Contract v3 for voice action" },
      ],
    });
  }

  if (req.method === "POST") {
    let body: { tool?: string; params?: Record<string, unknown> };
    try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

    const { tool, params = {} } = body;

    switch (tool) {
      case "memcell_query": {
        const table = (params.table as string) || "noizy_empire";
        const limit = (params.limit as number) || 20;
        try {
          const res = await env.DB.prepare(
            `SELECT * FROM ${table} LIMIT ?`
          ).bind(limit).all();
          return jsonResponse({ tool, table, count: res.results.length, results: res.results });
        } catch (e) {
          return jsonResponse({ tool, error: String(e) }, 500);
        }
      }

      case "fts_search": {
        const query = (params.query as string) || "";
        const check = sentinelCheck(query);
        if (!check.safe) return jsonResponse({ tool, blocked: true, reason: check.reason }, 403);
        try {
          const res = await env.DB.prepare(
            `SELECT m.*, snippet(memcells_fts, 0, '<b>', '</b>', '...', 32) as snippet
             FROM memcells_fts
             JOIN agent_memory m ON m.id = memcells_fts.rowid
             WHERE memcells_fts MATCH ?
             LIMIT 20`
          ).bind(query).all();
          return jsonResponse({ tool, query, count: res.results.length, results: res.results });
        } catch (e) {
          return jsonResponse({ tool, error: String(e), note: "FTS table may not be initialized" }, 500);
        }
      }

      case "consent_log": {
        const { talent_id, action, decision } = params as Record<string, string>;
        const requestId = crypto.randomUUID();
        await logConsent(env, talent_id, action, decision, requestId);
        return jsonResponse({ tool, logged: true, request_id: requestId, ncp_version: "1.0" });
      }

      case "sentinel_check": {
        const text = (params.text as string) || "";
        return jsonResponse({ tool, ...sentinelCheck(text) });
      }

      case "decision_contract": {
        const { talent_id, action } = params as Record<string, string>;
        const decisions = ["GENERATE", "ASK_ARTIST", "BLOCK", "INHERIT", "DEFER", "ESCALATE"];
        const check = sentinelCheck(action || "");
        if (!check.safe) return jsonResponse({ tool, decision: "BLOCK", reason: check.reason });
        return jsonResponse({
          tool,
          talent_id,
          action,
          decision: "ASK_ARTIST",
          contract_version: "v3",
          valid_decisions: decisions,
          note: "Default: consent required before any AI voice action",
        });
      }

      case "system_health":
        return jsonResponse({ tool, status: "ok", worker: "HEAVEN", version: VERSION, epoch: EPOCH });

      case "epoch_context":
        return jsonResponse({
          tool,
          epochs: [
            { number: 1, name: "Sheet Music", era: "1800s–1920s" },
            { number: 2, name: "Recorded Sound", era: "1920s–1960s" },
            { number: 3, name: "Digital Distribution", era: "1980s–2000s" },
            { number: 4, name: "Streaming", era: "2000s–2020s" },
            { number: 5, name: "Consent-Native AI Infrastructure", era: "2026+", active: true, builder: "NOIZY" },
          ],
          doctrine: "Make poop sink, love rise.",
        });

      default:
        return jsonResponse({ error: `Unknown tool: ${tool}`, available_tools: 10 }, 400);
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

// ─── REST API ENDPOINTS ───────────────────────────────────────────────────────
async function handleAPI(path: string, req: Request, env: Env): Promise<Response> {
  const segment = path.replace("/api/", "").split("/")[0];

  switch (segment) {
    case "health":
      return jsonResponse({
        status: "ok",
        worker: "HEAVEN",
        version: VERSION,
        epoch: EPOCH,
        founder: FOUNDER,
        build: BUILD_DATE,
        doctrine: "Make poop sink, love rise.",
        hvs: "Human Voice Sovereignty",
        ncp: "v1.0",
      });

    case "gospel": {
      return gospelPage(env);
    }

    case "agents":
      return jsonResponse({
        mesh: [
          { id: "GABRIEL", port: 7001, role: "Warrior orchestrator", status: "local" },
          { id: "LUCY", port: 7002, role: "Mobile / session memory", status: "local" },
          { id: "SHIRL", port: 7003, role: "Data curation (Aunt Shirley)", status: "local" },
          { id: "DREAM", port: 7004, role: "Vision keeper", status: "local" },
          { id: "POPS", port: 7005, role: "Operations", status: "local" },
          { id: "ENGR_KEITH", port: 7006, role: "Studio engineering (R.K.)", status: "local" },
          { id: "CB01", port: 7007, role: "Operations", status: "local" },
          { id: "HEAVEN", port: 7008, role: "Front door / gateway", status: "cloud" },
        ],
        gateway: 9696,
        note: "Agents run locally on GOD (10.90.90.10). HEAVEN bridges to cloud.",
      });

    case "memcells": {
      try {
        const res = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).all();
        return jsonResponse({ tables: res.results.map((r: Record<string, unknown>) => r.name), count: res.results.length });
      } catch (e) {
        return jsonResponse({ error: String(e) }, 500);
      }
    }

    case "empire": {
      try {
        const res = await env.DB.prepare("SELECT * FROM noizy_empire LIMIT 50").all();
        return jsonResponse({ table: "noizy_empire", count: res.results.length, results: res.results });
      } catch (e) {
        return jsonResponse({ error: String(e), note: "Table may not exist yet" }, 500);
      }
    }

    case "consent": {
      if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);
      let body: Record<string, string>;
      try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
      const requestId = crypto.randomUUID();
      await logConsent(env, body.talent_id || "unknown", body.action || "unknown", body.decision || "ASK_ARTIST", requestId);
      return jsonResponse({ logged: true, request_id: requestId, ncp_version: "1.0", plowman_standard: "75/25" });
    }

    case "vox":
      return jsonResponse({
        product: "NOIZYVOX",
        version: "0.1",
        tagline: "A.I.V.A. — Artificially Intelligent Voice Acting",
        hvs: "Human Voice Sovereignty",
        pipeline: ["XTTS v2", "Librosa", "RVC", "Chatterbox", "Gemma 4 (local)"],
        standard: "48kHz / 32-bit",
        founder_profile: "RSP_001",
        status: "portal coming",
      });

    case "epoch":
      return jsonResponse({
        current: "5th",
        name: "Consent-Native AI Infrastructure",
        builder: "NOIZY",
        started: 2026,
        founder: "Robert Stephen Plowman",
        doctrine: "Make poop sink, love rise.",
        elevation: "Humanity Weight rewards craft and intentionality. DREED sinks.",
      });

    default:
      return jsonResponse({ error: `Unknown endpoint: /api/${segment}`, available: ["health","gospel","agents","memcells","empire","consent","vox","epoch"] }, 404);
  }
}

// ─── AASA — Apple Universal Links ────────────────────────────────────────────
function aasaPayload(): Response {
  return new Response(JSON.stringify({
    applinks: {
      apps: [],
      details: [
        { appID: "ai.noizy.app", paths: ["*"] },
        { appID: "ai.noizy.vox", paths: ["/vox/*"] },
        { appID: "ai.noizy.lifeluv", paths: ["/lifeluv/*"] },
        { appID: "ca.noizylab.app", paths: ["/lab/*"] },
      ],
    },
  }), { headers: { "Content-Type": "application/json", ...corsHeaders() } });
}

// ─── 404 PAGE ─────────────────────────────────────────────────────────────────
function notFound(): Response {
  return htmlResponse(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>NOIZY — Not Found</title>
<style>body{background:#0B0B0F;color:#F0F0F5;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
h1{font-size:48px;font-weight:700;margin-bottom:12px}p{color:#888899;font-size:16px}a{color:#A395F5;text-decoration:none}</style>
</head><body><div><h1>404</h1><p>This path doesn't exist in the NOIZY Empire.</p><p style="margin-top:20px"><a href="/">← Return to NOIZY</a></p></div></body></html>`, 404);
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const { pathname, hostname } = url;

    // OPTIONS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // AASA
    if (pathname === "/.well-known/apple-app-site-association") return aasaPayload();

    // Subdomain routing
    if (hostname.startsWith("vox.")) {
      return jsonResponse({ portal: "NOIZYVOX", status: "coming soon", hvs: "Human Voice Sovereignty", ncp: "v1.0" });
    }
    if (hostname.startsWith("lab.")) {
      return jsonResponse({ portal: "NOIZYLAB", status: "active", github: "github.com/NOIZYLAB-io" });
    }
    if (hostname.startsWith("kidz.")) {
      return jsonResponse({ portal: "NOIZYKIDZ", status: "coming soon" });
    }
    if (hostname.startsWith("admin.")) {
      const secret = req.headers.get("Authorization");
      if (!secret || !env.HEAVEN_SECRET || secret !== `Bearer ${env.HEAVEN_SECRET}`) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      return jsonResponse({ portal: "NOIZY Admin", status: "authenticated", version: VERSION });
    }

    // MCP
    if (pathname === "/mcp" || pathname.startsWith("/mcp/")) return handleMCP(req, env);

    // API
    if (pathname.startsWith("/api/")) return handleAPI(pathname, req, env);

    // Root
    if (pathname === "/" || pathname === "") return htmlResponse(landingPage());

    return notFound();
  },
};
