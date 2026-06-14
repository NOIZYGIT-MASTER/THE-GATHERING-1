/**
 * HEAVEN — NOIZY Empire API Gateway
 * Constitutional Infrastructure for Human Creativity
 *
 * Routes: noizy.ai/*
 * Gabriel watches every transaction.
 * HVS: 75/25. Perpetual. Locked at protocol level.
 *
 * Author: Robert Stephen Plowman / MC96ECO
 */

// ── NOIZYSTREAM v2 Signaling (Durable Object) ────────────────────────────────
export { SignalingRoom } from './signaling';
import { handleStreamRoute } from './signaling';

interface Env {
  DB_MEMORY:     D1Database;   // agent-memory — constitutional ledger
  DB_REPAIRS:    D1Database;   // noizylab-repairs
  DB_AQUARIUM:   D1Database;   // aquarium-archive
  KV_SIGNUPS:    KVNamespace;
  KV_ROYALTIES:  KVNamespace;
  KV_GUILD:      KVNamespace;
  KV_SESSIONS:   KVNamespace;
  KV_SUBMISSIONS:KVNamespace;
  KV_MEMCELL:    KVNamespace;
  SIGNALING_ROOMS: DurableObjectNamespace;  // NOIZYSTREAM v2
  ANTHROPIC_API_KEY: string;
  NOIZY_SECRET:  string;
  NOIZY_KEY:     string;
  CF_ACCESS_CLIENT_ID:     string;  // Cloudflare Access Service Token
  CF_ACCESS_CLIENT_SECRET: string;  // Cloudflare Access Service Token
  MESH_ORIGIN:             string;  // e.g. https://mesh.noizy.ai or http://127.0.0.1:9696
  // ── Integration Secrets (set via: wrangler secret put KEY) ────────────────
  N8N_WEBHOOK_SECRET: string;   // shared secret n8n sends in X-N8N-Signature
  N8N_WEBHOOK_URL:    string;   // outbound: Heaven → n8n (for push events)
  LINEAR_API_KEY:     string;   // Linear personal API key
  LINEAR_TEAM_ID:     string;   // Linear team ID for ticket creation
  NOTION_API_KEY:     string;   // Notion integration token
  NOTION_DB_ID:       string;   // Notion database ID (wisdom archive)
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  'https://noizy.ai',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Noizy-Key',
  'Access-Control-Max-Age':       '86400',
};

function cors(): Response {
  return new Response(null, { headers: CORS });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// ── Gabriel: immutable constitutional audit trail ─────────────────────────────
async function gabriel(
  db: D1Database,
  event_type: string,
  actor_id: string | null,
  target_id: string | null,
  payload: unknown,
  sovereignty_check?: unknown
): Promise<string> {
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO gabriel_log (id, event_type, actor_id, target_id, payload, sovereignty_check, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id,
    event_type,
    actor_id ?? null,
    target_id ?? null,
    JSON.stringify(payload),
    sovereignty_check ? JSON.stringify(sovereignty_check) : null
  ).run();
  return id;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function authenticated(request: Request, env: Env): boolean {
  const key = request.headers.get('X-Noizy-Key');
  return !!key && key === env.NOIZY_KEY;
}

// Validates payloads coming IN from n8n (shared secret header)
function authenticatedN8N(request: Request, env: Env): boolean {
  const sig = request.headers.get('X-N8N-Signature');
  return !!sig && !!env.N8N_WEBHOOK_SECRET && sig === env.N8N_WEBHOOK_SECRET;
}

// ── Outbound: Create a Linear ticket ─────────────────────────────────────────
async function createLinearTicket(
  env:         Env,
  title:       string,
  description: string,
  priority:    number = 2,    // 0=none 1=urgent 2=high 3=medium 4=low
  labelIds?:   string[]
): Promise<{ id: string; url: string } | null> {
  if (!env.LINEAR_API_KEY || !env.LINEAR_TEAM_ID) return null;
  const mutation = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { id url } }
    }`;
  const vars = {
    input: {
      teamId:      env.LINEAR_TEAM_ID,
      title,
      description,
      priority,
      ...(labelIds?.length ? { labelIds } : {}),
    },
  };
  try {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': env.LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: mutation, variables: vars }),
    });
    const data = await res.json() as {
      data?: { issueCreate?: { success: boolean; issue?: { id: string; url: string } } };
    };
    return data.data?.issueCreate?.issue ?? null;
  } catch {
    return null;
  }
}

// ── Outbound: Append a row to Notion database ─────────────────────────────────
async function appendToNotion(
  env:        Env,
  title:      string,
  content:    string,
  tags:       string[] = [],
  sourceType: string   = 'system'
): Promise<string | null> {
  if (!env.NOTION_API_KEY || !env.NOTION_DB_ID) return null;
  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization':    `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version':   '2022-06-28',
        'Content-Type':     'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DB_ID },
        properties: {
          Name:       { title: [{ text: { content: title } }] },
          Tags:       { multi_select: tags.map(t => ({ name: t })) },
          SourceType: { select: { name: sourceType } },
          LoggedAt:   { date: { start: new Date().toISOString() } },
        },
        children: [{
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: content.slice(0, 2000) } }] },
        }],
      }),
    });
    const page = await res.json() as { id?: string };
    return page.id ?? null;
  } catch {
    return null;
  }
}

// ── Outbound: Push event to n8n (Heaven → n8n) ───────────────────────────────
async function pushToN8N(
  env:     Env,
  payload: Record<string, unknown>
): Promise<void> {
  if (!env.N8N_WEBHOOK_URL) return;
  try {
    await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Noizy-Source':  'heaven',
        'X-N8N-Signature': env.N8N_WEBHOOK_SECRET ?? '',
      },
      body: JSON.stringify(payload),
    });
  } catch { /* fire and forget — gabriel already logged */ }
}

// ── Router ────────────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url    = new URL(request.url);
    const method = request.method;
    const path   = url.pathname;

    if (method === 'OPTIONS') return cors();

    // ── Public routes ────────────────────────────────────────────────────────

    if (path === '/' || path === '/api/health') {
      // ⚡ NO gabriel() call here — health is a pure read with zero writes
      return new Response(JSON.stringify({
        status:    'alive',
        service:   'HEAVEN',
        version:   '1.0.0',
        timestamp: new Date().toISOString(),
        gabriel:   'watching',
        hvs:       '75/25 perpetual',
        portals:   ['NOIZYVOX', 'NOIZYFISH', 'NOIZYKIDZ', 'NOIZYLAB', 'WISDOM', 'myFAMILY'],
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── Dispatch — forward to mesh via CF Access Service Token ─────────────
    if (path === '/api/dispatch' && method === 'POST') {
      const body = await request.json() as {
        actor:    string;
        device?:  string;
        intent:   string;
        target:   string;
        context?: Record<string, unknown>;
      };

      if (!body.actor || !body.target || !body.intent) {
        return json({ error: 'actor, target, and intent required' }, 400);
      }

      const meshOrigin = env.MESH_ORIGIN || 'http://127.0.0.1:9696';
      const meshHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Attach CF Access Service Token headers when routing through Cloudflare Access
      if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
        meshHeaders['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID;
        meshHeaders['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
      }

      try {
        const meshRes = await fetch(`${meshOrigin}/dispatch`, {
          method: 'POST',
          headers: meshHeaders,
          body: JSON.stringify(body),
        });
        const meshData = await meshRes.json();

        await gabriel(env.DB_MEMORY, 'DISPATCH', body.actor, body.target, {
          intent: body.intent,
          device: body.device,
          mesh_status: meshRes.status,
        });

        return json({
          ok: meshRes.ok,
          dispatch: meshData,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Mesh unreachable';
        await gabriel(env.DB_MEMORY, 'DISPATCH_ERROR', body.actor, body.target, {
          intent: body.intent,
          error: detail,
        });
        return json({ error: 'Mesh unreachable', detail }, 502);
      }
    }

    // Email signup — public, no auth required
    if (path === '/api/signup' && method === 'POST') {
      const { email } = await request.json() as { email?: string };
      if (!email || !email.includes('@')) return json({ error: 'Invalid email' }, 400);
      await env.KV_SIGNUPS.put(`signup:${email}`, JSON.stringify({
        email,
        signed_up_at: new Date().toISOString(),
        source: 'noizy.ai',
        country: request.headers.get('CF-IPCountry') ?? 'unknown',
      }));
      await gabriel(env.DB_MEMORY, 'SIGNUP', null, null, { email });
      return json({ ok: true });
    }

    // ── Protected routes ─────────────────────────────────────────────────────
    if (!authenticated(request, env)) {
      return json({ error: 'Unauthorized. Sovereignty requires credentials.' }, 401);
    }

    try {

      // ── myFamily.AI — Constitutional Foundation ──────────────────────────

      // Register a family member
      if (path === '/api/family/register' && method === 'POST') {
        const { email, display_name } = await request.json() as {
          email: string;
          display_name: string;
        };
        if (!email || !display_name) return json({ error: 'email and display_name required' }, 400);

        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
          `INSERT INTO family_members (id, email, display_name, hvs_acknowledged)
           VALUES (?, ?, ?, 1)`
        ).bind(id, email, display_name).run();

        await gabriel(env.DB_MEMORY, 'FAMILY_MEMBER_REGISTERED', id, null, { email, display_name });
        return json({ ok: true, member_id: id });
      }

      // Store consent matrix — the constitutional declaration
      if (path === '/api/family/consent' && method === 'POST') {
        const body = await request.json() as {
          member_id:       string;
          use_cases:       string[];
          beneficiary_ids: string[];
          restrictions?:   Record<string, unknown>;
          expires_at?:     string;
        };

        if (!body.member_id || !body.use_cases?.length || !body.beneficiary_ids?.length) {
          return json({ error: 'member_id, use_cases, and beneficiary_ids required' }, 400);
        }

        const id         = crypto.randomUUID();
        const c2pa_stamp = `c2pa:noizy:consent:${id}:${Date.now()}`;

        await env.DB_MEMORY.prepare(
          `INSERT INTO consent_matrix
             (id, member_id, use_cases, restrictions, beneficiary_ids, c2pa_stamp, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.member_id,
          JSON.stringify(body.use_cases),
          JSON.stringify(body.restrictions ?? {}),
          JSON.stringify(body.beneficiary_ids),
          c2pa_stamp,
          body.expires_at ?? null
        ).run();

        await gabriel(env.DB_MEMORY, 'CONSENT_MATRIX_STORED', body.member_id, id, {
          use_cases:        body.use_cases,
          beneficiary_count: body.beneficiary_ids.length,
          c2pa_stamp,
          perpetual:        !body.expires_at,
        });

        return json({ ok: true, consent_id: id, c2pa_stamp });
      }

      // Register beneficiary access
      if (path === '/api/family/beneficiary' && method === 'POST') {
        const body = await request.json() as {
          member_id:             string;
          beneficiary_member_id: string;
          access_rules?:         Record<string, unknown>;
          granted_by:            string;
        };

        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
          `INSERT INTO beneficiaries (id, member_id, beneficiary_member_id, access_rules, granted_by)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.member_id,
          body.beneficiary_member_id,
          JSON.stringify(body.access_rules ?? {}),
          body.granted_by
        ).run();

        await gabriel(env.DB_MEMORY, 'BENEFICIARY_GRANTED', body.granted_by, id, {
          voice_owner:   body.member_id,
          beneficiary:   body.beneficiary_member_id,
        });

        return json({ ok: true, beneficiary_id: id });
      }

      // ── Voice — metadata only, audio stays on M2 Ultra ──────────────────

      if (path === '/api/voice/register' && method === 'POST') {
        const body = await request.json() as {
          member_id:        string;
          file_ref:         string; // local path on M2 Ultra
          sample_rate?:     number;
          bit_depth?:       number;
          duration_seconds?: number;
          emotional_tags?:  string[];
          model_version?:   string;
        };

        if (!body.member_id || !body.file_ref) {
          return json({ error: 'member_id and file_ref required' }, 400);
        }

        const id         = crypto.randomUUID();
        const c2pa_stamp = `c2pa:noizyvox:${id}:${Date.now()}`;

        await env.DB_MEMORY.prepare(
          `INSERT INTO voice_profiles
             (id, member_id, file_ref, sample_rate, bit_depth, duration_seconds, emotional_tags, c2pa_stamp, model_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.member_id,
          body.file_ref,
          body.sample_rate     ?? 48000,
          body.bit_depth       ?? 32,
          body.duration_seconds ?? null,
          JSON.stringify(body.emotional_tags ?? []),
          c2pa_stamp,
          body.model_version   ?? 'xtts_v2'
        ).run();

        await gabriel(env.DB_MEMORY, 'VOICE_PROFILE_REGISTERED', body.member_id, id, {
          file_ref:      body.file_ref,
          c2pa_stamp,
          model:         body.model_version ?? 'xtts_v2',
          note:          'audio_local_only',
        });

        return json({ ok: true, voice_id: id, c2pa_stamp });
      }

      // ── Messages — pre-recorded comfort, grief, milestone ───────────────

      if (path === '/api/family/message' && method === 'POST') {
        const body = await request.json() as {
          from_member_id:      string;
          to_beneficiary_ids:  string[];
          message_type:        string;
          file_ref:            string;
          duration_seconds?:   number;
          trigger_conditions?: Record<string, unknown>;
        };

        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
          `INSERT INTO messages
             (id, from_member_id, to_beneficiary_ids, message_type, file_ref, duration_seconds, trigger_conditions)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.from_member_id,
          JSON.stringify(body.to_beneficiary_ids),
          body.message_type,
          body.file_ref,
          body.duration_seconds ?? null,
          JSON.stringify(body.trigger_conditions ?? {})
        ).run();

        await gabriel(env.DB_MEMORY, 'MESSAGE_REGISTERED', body.from_member_id, id, {
          message_type:      body.message_type,
          beneficiary_count: body.to_beneficiary_ids.length,
        });

        return json({ ok: true, message_id: id });
      }

      // ── Healing sessions — biometric-triggered therapeutic protocol ──────

      if (path === '/api/heal/session' && method === 'POST') {
        const body = await request.json() as {
          beneficiary_member_id: string;
          protocol_type:         string;
          voice_message_id?:     string;
          noizyfish_track_id?:   string;
          frequency_hz?:         number;
          duration_seconds?:     number;
          biometric_before?:     Record<string, unknown>;
          biometric_after?:      Record<string, unknown>;
          outcome?:              string;
          consent_verified?:     boolean;
        };

        const id = crypto.randomUUID();
        await env.DB_MEMORY.prepare(
          `INSERT INTO healing_sessions
             (id, beneficiary_member_id, protocol_type, voice_message_id, noizyfish_track_id,
              frequency_hz, duration_seconds, biometric_before, biometric_after, outcome, consent_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          body.beneficiary_member_id,
          body.protocol_type,
          body.voice_message_id   ?? null,
          body.noizyfish_track_id ?? null,
          body.frequency_hz       ?? null,
          body.duration_seconds   ?? null,
          JSON.stringify(body.biometric_before ?? {}),
          JSON.stringify(body.biometric_after  ?? {}),
          body.outcome            ?? 'pending',
          body.consent_verified   ? 1 : 0
        ).run();

        await gabriel(env.DB_MEMORY, 'HEALING_SESSION_LOGGED', body.beneficiary_member_id, id, {
          protocol_type:    body.protocol_type,
          frequency_hz:     body.frequency_hz,
          outcome:          body.outcome,
          consent_verified: body.consent_verified,
        });

        return json({ ok: true, session_id: id });
      }

      // ── Gabriel audit trail — read events for an actor ──────────────────

      if (path.startsWith('/api/gabriel/') && method === 'GET') {
        const actor_id = path.replace('/api/gabriel/', '');
        if (!actor_id) return json({ error: 'actor_id required' }, 400);

        const result = await env.DB_MEMORY.prepare(
          `SELECT id, event_type, target_id, payload, logged_at
           FROM gabriel_log
           WHERE actor_id = ?
           ORDER BY logged_at DESC
           LIMIT 100`
        ).bind(actor_id).all();

        return json({ ok: true, actor_id, events: result.results });
      }

      // ── Royalties — KV fast path ─────────────────────────────────────────

      if (path === '/api/royalties' && method === 'POST') {
        const body = await request.json() as {
          artist_id:    string;
          track_id:     string;
          amount_cents: number;
          source:       string;
        };

        const key = `royalty:${body.artist_id}:${Date.now()}`;
        await env.KV_ROYALTIES.put(key, JSON.stringify({
          ...body,
          hvs_split:  '75/25',
          recorded_at: new Date().toISOString(),
        }));

        await gabriel(env.DB_MEMORY, 'ROYALTY_LOGGED', body.artist_id, body.track_id, {
          amount_cents: body.amount_cents,
          source:       body.source,
        });

        return json({ ok: true, key });
      }

      // ── NOIZYSTREAM v2 — /stream/* routes ──────────────────────────────
      if (path.startsWith('/stream/')) {
        const streamResponse = await handleStreamRoute(request, env, path);
        if (streamResponse) return streamResponse;
      }

      // ── Integration Hub: Webhook Ingestion (n8n / Zapier → Heaven) ──────
      //
      // n8n or Zapier POSTs here. Heaven validates, logs via Gabriel,
      // dispatches to Mesh, and optionally fans out to Linear / Notion.
      //
      //  Source values: 'n8n' | 'zapier' | 'linear' | 'internal'
      //
      if (path.startsWith('/api/hook/') && method === 'POST') {
        const source = path.replace('/api/hook/', '').split('/')[0];

        // n8n uses its own shared secret, not NOIZY_KEY
        if (source === 'n8n' && !authenticatedN8N(request, env)) {
          return json({ error: 'Invalid n8n signature' }, 401);
        }

        const body = await request.json() as {
          event:    string;          // e.g. 'voice_memo' | 'email_received' | 'linear_done'
          actor?:   string;          // who triggered
          payload:  Record<string, unknown>;
          route_to?: string;         // optional agent: 'cheryl' | 'keith' | 'noizyvox'
          create_linear_ticket?: {
            title:       string;
            description: string;
            priority?:   number;
          };
          log_to_notion?: {
            title:   string;
            content: string;
            tags?:   string[];
          };
        };

        if (!body.event) return json({ error: 'event required' }, 400);

        const hookId = await gabriel(
          env.DB_MEMORY, `HOOK_RECEIVED:${source.toUpperCase()}`,
          body.actor ?? source, null,
          { event: body.event, route_to: body.route_to, payload: body.payload }
        );

        const results: Record<string, unknown> = { hook_id: hookId };

        // 1. Dispatch to Mesh if route_to is specified
        if (body.route_to) {
          const meshOrigin = env.MESH_ORIGIN || 'http://127.0.0.1:9696';
          const meshHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
          if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
            meshHeaders['CF-Access-Client-Id']     = env.CF_ACCESS_CLIENT_ID;
            meshHeaders['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
          }
          try {
            const meshRes = await fetch(`${meshOrigin}/dispatch`, {
              method: 'POST',
              headers: meshHeaders,
              body: JSON.stringify({
                actor:   body.actor ?? source,
                target:  body.route_to,
                intent:  body.event,
                context: body.payload,
              }),
            });
            results.mesh = { ok: meshRes.ok, status: meshRes.status };
            await gabriel(env.DB_MEMORY, 'HOOK_DISPATCHED', body.actor ?? source,
              body.route_to, { event: body.event, mesh_status: meshRes.status });
          } catch (err) {
            results.mesh = { ok: false, error: err instanceof Error ? err.message : 'unreachable' };
          }
        }

        // 2. Optionally create a Linear ticket
        if (body.create_linear_ticket) {
          const ticket = await createLinearTicket(
            env,
            body.create_linear_ticket.title,
            body.create_linear_ticket.description,
            body.create_linear_ticket.priority ?? 2
          );
          results.linear = ticket ?? { error: 'Linear not configured or call failed' };
          if (ticket) {
            await gabriel(env.DB_MEMORY, 'LINEAR_TICKET_CREATED', body.actor ?? source,
              ticket.id, { title: body.create_linear_ticket.title, url: ticket.url });
          }
        }

        // 3. Optionally log to Notion
        if (body.log_to_notion) {
          const pageId = await appendToNotion(
            env,
            body.log_to_notion.title,
            body.log_to_notion.content,
            body.log_to_notion.tags ?? [body.event, source],
            source
          );
          results.notion = pageId ? { page_id: pageId } : { error: 'Notion not configured or call failed' };
          if (pageId) {
            await gabriel(env.DB_MEMORY, 'NOTION_ENTRY_CREATED', body.actor ?? source,
              pageId, { title: body.log_to_notion.title });
          }
        }

        return json({ ok: true, source, event: body.event, results });
      }

      // ── Integration Hub: Linear → Heaven callback (ticket status change) ──
      //
      // Set Linear webhook URL to: POST https://noizy.ai/api/hook/linear
      // Linear sends X-Linear-Delivery + X-Linear-Signature headers.
      // On 'Issue.update' with state=Done → triggers sanity check via Mesh.
      //
      if (path === '/api/hook/linear/status' && method === 'POST') {
        const body = await request.json() as {
          action: string;
          data?: {
            id?:    string;
            title?: string;
            state?: { name?: string };
            url?:   string;
          };
        };

        const issueId = body.data?.id ?? 'unknown';
        const state   = body.data?.state?.name ?? '';

        await gabriel(env.DB_MEMORY, 'LINEAR_CALLBACK', 'linear', issueId, {
          action: body.action,
          state,
          title:  body.data?.title,
        });

        // When a ticket is marked Done → push sanity check event to n8n
        if (state === 'Done') {
          await pushToN8N(env, {
            event:    'linear_ticket_done',
            issue_id: issueId,
            title:    body.data?.title,
            url:      body.data?.url,
            timestamp: new Date().toISOString(),
          });
        }

        return json({ ok: true, received: body.action, state });
      }

      return json({ error: 'Route not found' }, 404);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await gabriel(env.DB_MEMORY, 'ERROR', null, null, {
        path, method, error: message,
      }).catch(() => {/* don't let logging failure mask the original error */});
      return json({ error: 'Internal error', detail: message }, 500);
    }
  },
};
