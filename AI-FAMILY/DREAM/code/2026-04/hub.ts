// ═══════════════════════════════════════════════════════════════════════
// NOIZY INTEGRATION PLANE — Connector Hub
//
// Edge-first integration gateway on Cloudflare Workers.
// Receives webhooks from Linear, Zapier, n8n, GitHub, Notion, Stripe.
// Dispatches to HEAVEN, Notion, Linear, Slack, Gmail via MCP/API.
// Logs everything to D1 audit ledger.
//
// Runs on NOIZYFISH account alongside HEAVEN.
//
// Author: Robert Stephen Plowman
// ═══════════════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ── Types ─────────────────────────────────────────────────────────────

interface Env {
  // Databases
  DB_INTEGRATION: D1Database;  // Integration audit log

  // KV
  KV_TOKENS: KVNamespace;     // OAuth tokens (encrypted at rest)
  KV_CONFIG: KVNamespace;     // Connector configs, webhook secrets

  // Queues (for async dispatch)
  QUEUE_DISPATCH: Queue;

  // Vars
  ENVIRONMENT: string;
  HUB_VERSION: string;
  HEAVEN_URL: string;
  HEAVEN_API_KEY: string;
}

interface WebhookEvent {
  id: string;
  source: string;
  event_type: string;
  payload: Record<string, unknown>;
  received_at: string;
  processed: boolean;
  dispatch_target?: string;
}

interface ConnectorConfig {
  name: string;
  enabled: boolean;
  webhook_secret?: string;
  api_base_url?: string;
  auth_type: 'oauth2' | 'api_key' | 'bearer' | 'none';
  scopes?: string[];
}

// ── App ───────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: [
    'https://noizy.ai',
    'https://heaven.rsp-5f3.workers.dev',
    'https://noizy-ai-landing.pages.dev',
    'http://localhost:3000',
    'http://localhost:5678', // n8n
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret', 'X-Hub-Signature-256'],
}));

app.use('*', async (c, next) => {
  await next();
  c.header('X-Powered-By', 'NOIZY Integration Plane');
  c.header('X-Hub-Version', c.env.HUB_VERSION);
});

// ── Root ──────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({
    name: 'NOIZY Integration Plane',
    version: c.env.HUB_VERSION,
    connectors: [
      'zapier', 'n8n', 'notion', 'linear', 'slack',
      'gmail', 'google', 'microsoft', 'apple', 'github',
      'postman', 'stripe', 'anthropic',
    ],
    health: '/health',
    webhooks: '/webhooks/:source',
  });
});

// ── Health ─────────────────────────────────────────────────────────────

app.get('/health', async (c) => {
  const dbOk = await checkDb(c.env.DB_INTEGRATION);
  const kvOk = await checkKv(c.env.KV_CONFIG);

  // Check HEAVEN connectivity
  let heavenOk = false;
  try {
    const res = await fetch(`${c.env.HEAVEN_URL}/v1/health`);
    heavenOk = res.ok;
  } catch { heavenOk = false; }

  return c.json({
    status: dbOk && kvOk && heavenOk ? 'ok' : 'degraded',
    version: c.env.HUB_VERSION,
    heaven: heavenOk ? 'connected' : 'unreachable',
    database: dbOk,
    kv: kvOk,
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK RECEIVERS — One endpoint per source
// ═══════════════════════════════════════════════════════════════════════

// ── Generic webhook receiver ──────────────────────────────────────────

app.post('/webhooks/:source', async (c) => {
  const source = c.req.param('source');
  const body = await c.req.json();

  // Validate source is registered
  const configRaw = await c.env.KV_CONFIG.get(`connector:${source}`);
  if (!configRaw) {
    return c.json({ error: `Unknown connector: ${source}` }, 404);
  }
  const config: ConnectorConfig = JSON.parse(configRaw);
  if (!config.enabled) {
    return c.json({ error: `Connector ${source} is disabled` }, 403);
  }

  // Verify webhook secret if configured
  if (config.webhook_secret) {
    const providedSecret = c.req.header('X-Webhook-Secret');
    if (providedSecret !== config.webhook_secret) {
      return c.json({ error: 'Invalid webhook secret' }, 401);
    }
  }

  // Create event record
  const eventId = `EVT-${crypto.randomUUID()}`;
  const event: WebhookEvent = {
    id: eventId,
    source,
    event_type: detectEventType(source, body),
    payload: body,
    received_at: new Date().toISOString(),
    processed: false,
  };

  // Log to D1 audit ledger
  await c.env.DB_INTEGRATION.prepare(
    `INSERT INTO integration_events (event_id, source, event_type, payload_json, received_at, processed)
     VALUES (?, ?, ?, ?, ?, 0)`
  ).bind(event.id, event.source, event.event_type, JSON.stringify(event.payload), event.received_at).run();

  // Dispatch to queue for async processing
  await c.env.QUEUE_DISPATCH.send({
    eventId: event.id,
    source: event.source,
    eventType: event.event_type,
    payload: event.payload,
  });

  return c.json({
    event_id: eventId,
    status: 'accepted',
    source,
    event_type: event.event_type,
  }, 202);
});

// ═══════════════════════════════════════════════════════════════════════
// SOURCE-SPECIFIC WEBHOOK HANDLERS
// ═══════════════════════════════════════════════════════════════════════

// ── Linear webhooks ───────────────────────────────────────────────────

app.post('/webhooks/linear/issues', async (c) => {
  const body = await c.req.json();
  const eventId = `EVT-${crypto.randomUUID()}`;

  // Linear sends: action (create/update/remove), type, data
  const action = body.action || 'unknown';
  const issueTitle = body.data?.title || 'Untitled';
  const issueState = body.data?.state?.name || 'Unknown';

  await logEvent(c.env, eventId, 'linear', `issue.${action}`, body);

  // If issue moves to "Done", log completion to HEAVEN ledger
  if (issueState === 'Done' && action === 'update') {
    await notifyHeaven(c.env, {
      event_type: 'integration.linear.issue_completed',
      payload: { issue_id: body.data?.id, title: issueTitle },
    });
  }

  return c.json({ event_id: eventId, status: 'accepted' }, 202);
});

// ── GitHub webhooks ───────────────────────────────────────────────────

app.post('/webhooks/github', async (c) => {
  const body = await c.req.json();
  const eventId = `EVT-${crypto.randomUUID()}`;
  const githubEvent = c.req.header('X-GitHub-Event') || 'unknown';

  await logEvent(c.env, eventId, 'github', `github.${githubEvent}`, body);

  // On push to main, trigger n8n deployment workflow
  if (githubEvent === 'push' && body.ref === 'refs/heads/main') {
    await triggerN8n(c.env, 'deploy-heaven', {
      commit: body.after,
      message: body.head_commit?.message,
      pusher: body.pusher?.name,
    });
  }

  return c.json({ event_id: eventId, status: 'accepted' }, 202);
});

// ── Zapier webhooks ───────────────────────────────────────────────────

app.post('/webhooks/zapier', async (c) => {
  const body = await c.req.json();
  const eventId = `EVT-${crypto.randomUUID()}`;
  const zapAction = body.zap_action || 'generic';

  await logEvent(c.env, eventId, 'zapier', `zapier.${zapAction}`, body);

  return c.json({ event_id: eventId, status: 'accepted' }, 202);
});

// ── n8n webhooks ──────────────────────────────────────────────────────

app.post('/webhooks/n8n', async (c) => {
  const body = await c.req.json();
  const eventId = `EVT-${crypto.randomUUID()}`;
  const workflow = body.workflow_name || 'unknown';

  await logEvent(c.env, eventId, 'n8n', `n8n.${workflow}`, body);

  return c.json({ event_id: eventId, status: 'accepted' }, 202);
});

// ── Stripe webhooks (future: royalty payments) ────────────────────────

app.post('/webhooks/stripe', async (c) => {
  const body = await c.req.json();
  const eventId = `EVT-${crypto.randomUUID()}`;
  const stripeEvent = body.type || 'unknown';

  await logEvent(c.env, eventId, 'stripe', stripeEvent, body);

  // On successful payment, log royalty distribution to HEAVEN
  if (stripeEvent === 'payment_intent.succeeded') {
    const amount = body.data?.object?.amount || 0;
    await notifyHeaven(c.env, {
      event_type: 'integration.stripe.payment_received',
      payload: { amount_cents: amount, currency: body.data?.object?.currency },
    });
  }

  return c.json({ event_id: eventId, status: 'accepted' }, 202);
});

// ═══════════════════════════════════════════════════════════════════════
// OAUTH HANDLERS
// ═══════════════════════════════════════════════════════════════════════

app.get('/oauth/:provider/authorize', async (c) => {
  const provider = c.req.param('provider');
  const configRaw = await c.env.KV_CONFIG.get(`oauth:${provider}`);
  if (!configRaw) {
    return c.json({ error: `OAuth not configured for ${provider}` }, 404);
  }
  const config = JSON.parse(configRaw);

  // Build authorization URL
  const state = crypto.randomUUID();
  await c.env.KV_TOKENS.put(`oauth_state:${state}`, provider, { expirationTtl: 600 });

  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: config.redirect_uri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  return c.redirect(`${config.authorize_url}?${params.toString()}`);
});

app.get('/oauth/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400);
  }

  // Verify state
  const provider = await c.env.KV_TOKENS.get(`oauth_state:${state}`);
  if (!provider) {
    return c.json({ error: 'Invalid or expired state' }, 401);
  }
  await c.env.KV_TOKENS.delete(`oauth_state:${state}`);

  // Exchange code for tokens
  const configRaw = await c.env.KV_CONFIG.get(`oauth:${provider}`);
  if (!configRaw) {
    return c.json({ error: `OAuth config missing for ${provider}` }, 500);
  }
  const config = JSON.parse(configRaw);

  const tokenResponse = await fetch(config.token_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirect_uri,
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });

  const tokens = await tokenResponse.json() as Record<string, unknown>;

  // Store tokens in KV (encrypted at rest by Cloudflare)
  await c.env.KV_TOKENS.put(`tokens:${provider}`, JSON.stringify(tokens), {
    expirationTtl: (tokens.expires_in as number) || 3600,
  });

  return c.json({ status: 'connected', provider });
});

// ═══════════════════════════════════════════════════════════════════════
// CONNECTOR STATUS & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

app.get('/connectors', async (c) => {
  const connectors = [
    'zapier', 'n8n', 'notion', 'linear', 'slack',
    'gmail', 'google', 'microsoft', 'apple', 'github',
    'postman', 'stripe', 'anthropic',
  ];

  const status = await Promise.all(
    connectors.map(async (name) => {
      const configRaw = await c.env.KV_CONFIG.get(`connector:${name}`);
      const tokenRaw = await c.env.KV_TOKENS.get(`tokens:${name}`);
      return {
        name,
        configured: !!configRaw,
        authenticated: !!tokenRaw,
        enabled: configRaw ? JSON.parse(configRaw).enabled : false,
      };
    })
  );

  return c.json({ connectors: status });
});

app.get('/events', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50'), 100);
  const source = c.req.query('source');

  let query = 'SELECT * FROM integration_events';
  const binds: unknown[] = [];

  if (source) {
    query += ' WHERE source = ?';
    binds.push(source);
  }
  query += ' ORDER BY received_at DESC LIMIT ?';
  binds.push(limit);

  const result = await c.env.DB_INTEGRATION.prepare(query).bind(...binds).all();
  return c.json({ count: result.results.length, events: result.results });
});

// ═══════════════════════════════════════════════════════════════════════
// DISPATCH API — Send actions TO connectors
// ═══════════════════════════════════════════════════════════════════════

// Send a message via any configured connector
app.post('/dispatch/:connector/:action', async (c) => {
  const connector = c.req.param('connector');
  const action = c.req.param('action');
  const body = await c.req.json();

  const configRaw = await c.env.KV_CONFIG.get(`connector:${connector}`);
  if (!configRaw) {
    return c.json({ error: `Connector ${connector} not configured` }, 404);
  }

  const dispatchId = `DSP-${crypto.randomUUID()}`;

  // Log dispatch request
  await logEvent(c.env, dispatchId, 'hub', `dispatch.${connector}.${action}`, body);

  // Route to handler
  const result = await routeDispatch(c.env, connector, action, body);

  return c.json({
    dispatch_id: dispatchId,
    connector,
    action,
    result,
  });
});

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

async function checkDb(db: D1Database): Promise<boolean> {
  try { await db.prepare('SELECT 1').first(); return true; }
  catch { return false; }
}

async function checkKv(kv: KVNamespace): Promise<boolean> {
  try { await kv.get('__health__'); return true; }
  catch { return false; }
}

function detectEventType(source: string, payload: Record<string, unknown>): string {
  // Source-specific event type detection
  switch (source) {
    case 'linear': return `linear.${payload.action || 'event'}`;
    case 'github': return `github.${payload.action || 'event'}`;
    case 'notion': return `notion.${payload.type || 'event'}`;
    case 'zapier': return `zapier.${payload.zap_action || 'event'}`;
    case 'n8n': return `n8n.${payload.workflow_name || 'event'}`;
    case 'stripe': return `stripe.${payload.type || 'event'}`;
    default: return `${source}.event`;
  }
}

async function logEvent(env: Env, eventId: string, source: string, eventType: string, payload: unknown): Promise<void> {
  await env.DB_INTEGRATION.prepare(
    `INSERT INTO integration_events (event_id, source, event_type, payload_json, received_at, processed)
     VALUES (?, ?, ?, ?, ?, 0)`
  ).bind(eventId, source, eventType, JSON.stringify(payload), new Date().toISOString()).run();
}

async function notifyHeaven(env: Env, event: { event_type: string; payload: unknown }): Promise<void> {
  try {
    await fetch(`${env.HEAVEN_URL}/v1/ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.HEAVEN_API_KEY}` },
      body: JSON.stringify(event),
    });
  } catch (e) {
    console.error('Failed to notify HEAVEN:', e);
  }
}

async function triggerN8n(env: Env, workflow: string, data: unknown): Promise<void> {
  const n8nUrl = await env.KV_CONFIG.get('n8n:webhook_url');
  if (!n8nUrl) return;

  try {
    await fetch(`${n8nUrl}/webhook/${workflow}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error('Failed to trigger n8n:', e);
  }
}

async function routeDispatch(env: Env, connector: string, action: string, body: Record<string, unknown>): Promise<unknown> {
  // Get auth tokens
  const tokenRaw = await env.KV_TOKENS.get(`tokens:${connector}`);

  switch (connector) {
    case 'slack':
      return { status: 'dispatched', note: 'Use Slack MCP in Cowork for direct send' };
    case 'notion':
      return { status: 'dispatched', note: 'Use Notion MCP in Cowork for direct CRUD' };
    case 'linear':
      return { status: 'dispatched', note: 'Use Linear MCP in Cowork for direct CRUD' };
    case 'gmail':
      return { status: 'dispatched', note: 'Use Gmail MCP in Cowork for direct send' };
    default:
      return { status: 'queued', note: `${connector}.${action} queued for processing` };
  }
}

// ── 404 ───────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ error: 'Route not found', hub_version: c.env.HUB_VERSION }, 404);
});

app.onError((err, c) => {
  console.error('Hub error:', err.message, err.stack);
  return c.json({ error: 'Internal server error', hub_version: c.env.HUB_VERSION }, 500);
});

export default app;
