#!/usr/bin/env node
/**
 * NOIZY MCP — self-hosted Model Context Protocol server.
 *
 * Exposes the NOIZY empire state (gospel, doctrine, agents, memcells, consent,
 * empire) as MCP tools any compatible client (Claude Desktop, Cursor, etc.)
 * can call.
 *
 * Principles baked in:
 *   - Read tools are read-only (readOnlyHint: true). No side effects.
 *   - Write tools log consent and provenance to the real consent_log table.
 *   - No raw SQL surface that mutates. Ad-hoc SQL is SELECT-only and gated.
 *   - Every tool returns structured data the agent can reason over.
 *
 * Run locally:   node src/index.js
 * Inspect:       npx @modelcontextprotocol/inspector node src/index.js
 *
 * Author: Robert Stephen Plowman / MC96ECO
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { query, queryOne } from './cloudflare.js';

// ── Server metadata ──────────────────────────────────────────
const server = new Server(
  {
    name: 'noizy-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── Zod input schemas ────────────────────────────────────────
const EmptyInput = z.object({}).strict();

const GospelGetInput = z.object({
  principle_number: z.number().int().min(1).max(12)
    .describe('Principle number (1-12)'),
}).strict();

const DoctrineGetInput = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,30}$/)
    .describe('Doctrine code, e.g. HVS_001, NCP_002'),
}).strict();

const AgentGetInput = z.object({
  agent_id: z.string().min(1).max(50)
    .describe('Agent identifier, e.g. GABRIEL, LUCY, SHIRL'),
}).strict();

const MemcellSearchInput = z.object({
  agent: z.string().optional()
    .describe('Filter by agent (GABRIEL, LUCY, etc.)'),
  key_like: z.string().optional()
    .describe('SQL LIKE pattern on the key field (use % as wildcard)'),
  hvs_id: z.string().optional()
    .describe('Filter by HVS identity, e.g. RSP_001'),
  limit: z.number().int().min(1).max(200).default(50)
    .describe('Maximum rows to return (default 50, max 200)'),
}).strict();

const MemcellGetInput = z.object({
  id: z.number().int().min(1).describe('Memcell row id'),
}).strict();

const MemcellWriteInput = z.object({
  hvs_id: z.string().min(1).describe('HVS identity, e.g. RSP_001'),
  agent: z.string().min(1).describe('Agent authoring this cell, e.g. GABRIEL'),
  key: z.string().min(1).max(200).describe('Short key identifying the cell'),
  value: z.string().min(1).describe('The memcell body / content'),
  decay_score: z.number().min(0).max(1).default(1.0)
    .describe('Decay weight 0..1 (1 = fresh, 0 = forgotten)'),
}).strict();

const ConsentLogInput = z.object({
  artist_id: z.string().min(1).describe('Artist HVS id (e.g. RSP_001)'),
  action: z.string().min(1).describe('Action being consented to or refused'),
  decision: z.enum(['GENERATE', 'ASK_ARTIST', 'BLOCK', 'INHERIT', 'ABSTAIN'])
    .describe('Decision contract v3 outcome'),
  reason: z.string().optional().describe('Human-readable reason'),
  contract_version: z.string().default('v3').describe('Contract version (default v3)'),
  logged_by: z.string().default('noizy-mcp').describe('Who logged this entry'),
}).strict();

const SqlSelectInput = z.object({
  sql: z.string().min(1).max(4000)
    .describe('A single SQL SELECT statement. Writes are rejected.'),
  params: z.array(z.union([z.string(), z.number()])).default([])
    .describe('Positional parameters for the query'),
}).strict();

// ── Tool implementations ─────────────────────────────────────
async function gospelList() {
  const { rows } = await query(
    'SELECT principle_number AS n, title, body, ratified_at FROM gospel_deal ORDER BY principle_number ASC;'
  );
  return { count: rows.length, principles: rows };
}

async function gospelGet({ principle_number }) {
  const row = await queryOne(
    'SELECT principle_number AS n, title, body, ratified_at FROM gospel_deal WHERE principle_number = ?;',
    [principle_number]
  );
  if (!row) throw new McpError(ErrorCode.InvalidParams, `No principle numbered ${principle_number}`);
  return { principle: row };
}

async function doctrineList() {
  const { rows } = await query(
    'SELECT code, title, body, category FROM doctrine_lines ORDER BY code ASC;'
  );
  const by_category = {};
  for (const r of rows) {
    const cat = r.category || 'uncategorized';
    (by_category[cat] ||= []).push(r);
  }
  return { count: rows.length, categories: Object.keys(by_category).sort(), by_category };
}

async function doctrineGet({ code }) {
  const row = await queryOne(
    'SELECT code, title, body, category FROM doctrine_lines WHERE code = ?;',
    [code]
  );
  if (!row) throw new McpError(ErrorCode.InvalidParams, `No doctrine line with code ${code}`);
  return { doctrine: row };
}

async function agentsList() {
  const { rows } = await query(
    "SELECT agent_id, agent_name, role, persona, voice_id, device_target, powers, status FROM agent_registry WHERE status = 'active' ORDER BY agent_name ASC;"
  );
  return { count: rows.length, agents: rows };
}

async function agentGet({ agent_id }) {
  const row = await queryOne(
    'SELECT agent_id, agent_name, role, persona, voice_id, device_target, powers, status, created_at FROM agent_registry WHERE agent_id = ?;',
    [agent_id]
  );
  if (!row) throw new McpError(ErrorCode.InvalidParams, `No agent with id ${agent_id}`);
  return { agent: row };
}

async function memcellSearch({ agent, key_like, hvs_id, limit }) {
  const clauses = [];
  const params = [];
  if (agent) { clauses.push('agent = ?'); params.push(agent); }
  if (hvs_id) { clauses.push('hvs_id = ?'); params.push(hvs_id); }
  if (key_like) { clauses.push('key LIKE ?'); params.push(key_like); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT id, hvs_id, agent, key, value, decay_score, created_at, updated_at FROM memcells ${where} ORDER BY id ASC LIMIT ?;`;
  params.push(limit);
  const { rows } = await query(sql, params);
  return { count: rows.length, memcells: rows };
}

async function memcellGet({ id }) {
  const row = await queryOne(
    'SELECT id, hvs_id, agent, key, value, decay_score, created_at, updated_at FROM memcells WHERE id = ?;',
    [id]
  );
  if (!row) throw new McpError(ErrorCode.InvalidParams, `No memcell with id ${id}`);
  return { memcell: row };
}

async function memcellWrite({ hvs_id, agent, key, value, decay_score }) {
  const existing = await queryOne(
    'SELECT id FROM memcells WHERE hvs_id = ? AND agent = ? AND key = ?;',
    [hvs_id, agent, key]
  );
  if (existing) {
    await query(
      "UPDATE memcells SET value = ?, decay_score = ?, updated_at = datetime('now') WHERE id = ?;",
      [value, decay_score, existing.id]
    );
    return { action: 'updated', id: existing.id };
  }
  const res = await query(
    "INSERT INTO memcells (hvs_id, agent, key, value, decay_score) VALUES (?, ?, ?, ?, ?);",
    [hvs_id, agent, key, value, decay_score]
  );
  return { action: 'inserted', id: res.meta?.last_row_id ?? null };
}

async function consentLog({ artist_id, action, decision, reason, contract_version, logged_by }) {
  const consent_id = `C${Date.now().toString(36).toUpperCase()}`;
  await query(
    `INSERT INTO consent_log (consent_id, artist_id, action, decision, reason, contract_version, logged_by)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [consent_id, artist_id, action, decision, reason || null, contract_version, logged_by]
  );
  return { ok: true, consent_id };
}

async function empireStatus() {
  const [brands, agents, gospel, doctrine, memcells] = await Promise.all([
    query("SELECT COUNT(*) AS n FROM noizy_empire WHERE status = 'active';"),
    query("SELECT COUNT(*) AS n FROM agent_registry WHERE status = 'active';"),
    query('SELECT COUNT(*) AS n FROM gospel_deal;'),
    query('SELECT COUNT(*) AS n FROM doctrine_lines;'),
    query('SELECT COUNT(*) AS n FROM memcells;'),
  ]);
  return {
    brands_active: brands.rows[0]?.n ?? 0,
    agents_active: agents.rows[0]?.n ?? 0,
    gospel_principles: gospel.rows[0]?.n ?? 0,
    doctrine_lines: doctrine.rows[0]?.n ?? 0,
    memcells: memcells.rows[0]?.n ?? 0,
    ts: new Date().toISOString(),
  };
}

async function sqlSelect({ sql, params }) {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();
  // Strict gate: statement must start with SELECT or WITH. No semicolons beyond the first.
  if (!/^(SELECT|WITH)\b/.test(upper)) {
    throw new McpError(ErrorCode.InvalidParams, 'Only SELECT / WITH statements are allowed.');
  }
  const semis = (trimmed.match(/;/g) || []).length;
  if (semis > 1 || (semis === 1 && !trimmed.endsWith(';'))) {
    throw new McpError(ErrorCode.InvalidParams, 'Multiple statements are not allowed.');
  }
  // Block common write verbs even inside WITH clauses.
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA)\b/.test(upper)) {
    throw new McpError(ErrorCode.InvalidParams, 'Write verbs are not allowed in this tool.');
  }
  const { rows, meta } = await query(trimmed, params);
  return { rows: rows.slice(0, 500), truncated: rows.length > 500, meta };
}

// ── Tool registry (metadata + handler mapping) ───────────────
const TOOLS = [
  {
    name: 'noizy_gospel_list',
    description: 'List all 12 Gospel Deal principles (the NOIZY ethical canon). Read-only.',
    inputSchema: EmptyInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: gospelList,
  },
  {
    name: 'noizy_gospel_get',
    description: 'Get a single Gospel Deal principle by its number (1-12).',
    inputSchema: GospelGetInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: gospelGet,
  },
  {
    name: 'noizy_doctrine_list',
    description: 'List all doctrine lines (HVS, NCP, etc.) grouped by category. Read-only.',
    inputSchema: EmptyInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: doctrineList,
  },
  {
    name: 'noizy_doctrine_get',
    description: 'Get a single doctrine line by its code (e.g. HVS_001, NCP_002).',
    inputSchema: DoctrineGetInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: doctrineGet,
  },
  {
    name: 'noizy_agents_list',
    description: 'List all active agents in the NOIZY family with personas and device targets.',
    inputSchema: EmptyInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: agentsList,
  },
  {
    name: 'noizy_agent_get',
    description: 'Get full detail on a single agent by agent_id (GABRIEL, LUCY, SHIRL, POPS, ENGR_KEITH, DREAM, CB01, HEAVEN).',
    inputSchema: AgentGetInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: agentGet,
  },
  {
    name: 'noizy_memcells_search',
    description: 'Search memcells (atomic agent memories). Filter by agent, hvs_id, and/or key_like. Read-only.',
    inputSchema: MemcellSearchInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: memcellSearch,
  },
  {
    name: 'noizy_memcell_get',
    description: 'Get a single memcell by its numeric id.',
    inputSchema: MemcellGetInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: memcellGet,
  },
  {
    name: 'noizy_memcell_write',
    description: 'Upsert a memcell. If (hvs_id, agent, key) exists the value/decay are updated; otherwise inserted. Writes to agent-memory D1.',
    inputSchema: MemcellWriteInput,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: memcellWrite,
  },
  {
    name: 'noizy_consent_log',
    description: 'Append a consent decision to consent_log (NCP v3: GENERATE / ASK_ARTIST / BLOCK / INHERIT / ABSTAIN). Writes to agent-memory D1.',
    inputSchema: ConsentLogInput,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: consentLog,
  },
  {
    name: 'noizy_empire_status',
    description: 'Multi-table status summary: active brands, active agents, gospel count, doctrine count, memcell count.',
    inputSchema: EmptyInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: empireStatus,
  },
  {
    name: 'noizy_sql_select',
    description: 'Run an ad-hoc SELECT (or WITH) against agent-memory D1. Writes are rejected. Max 500 rows returned.',
    inputSchema: SqlSelectInput,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    handler: sqlSelect,
  },
];

// ── Convert Zod schemas to JSON Schema for MCP ListTools ─────
function zodToJsonSchema(zodSchema) {
  // Minimal Zod-to-JSON-Schema converter for the shapes we use.
  // Each TOOL input is a z.object(...); we walk its shape.
  const def = zodSchema._def;
  if (def.typeName !== 'ZodObject') {
    return { type: 'object' };
  }
  const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
  const properties = {};
  const required = [];
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const field = zodFieldToJson(fieldSchema);
    properties[key] = field.json;
    if (field.required) required.push(key);
  }
  const out = { type: 'object', properties };
  if (required.length) out.required = required;
  if (def.unknownKeys === 'strict') out.additionalProperties = false;
  return out;
}
function zodFieldToJson(schema) {
  let s = schema;
  let required = true;
  let description;
  // Unwrap ZodOptional / ZodDefault / with description
  while (s?._def) {
    if (s._def.description) description = s._def.description;
    if (s._def.typeName === 'ZodOptional') { required = false; s = s._def.innerType; continue; }
    if (s._def.typeName === 'ZodDefault') { required = false; s = s._def.innerType; continue; }
    break;
  }
  const def = s._def;
  let json = {};
  switch (def.typeName) {
    case 'ZodString': {
      json.type = 'string';
      for (const c of def.checks || []) {
        if (c.kind === 'min') json.minLength = c.value;
        if (c.kind === 'max') json.maxLength = c.value;
        if (c.kind === 'regex') json.pattern = c.regex.source;
      }
      break;
    }
    case 'ZodNumber': {
      json.type = 'number';
      for (const c of def.checks || []) {
        if (c.kind === 'int') json.type = 'integer';
        if (c.kind === 'min') json.minimum = c.value;
        if (c.kind === 'max') json.maximum = c.value;
      }
      break;
    }
    case 'ZodBoolean': json.type = 'boolean'; break;
    case 'ZodEnum': json = { type: 'string', enum: def.values }; break;
    case 'ZodArray': {
      json.type = 'array';
      json.items = zodFieldToJson(def.type).json;
      break;
    }
    case 'ZodUnion': {
      json.anyOf = def.options.map(o => zodFieldToJson(o).json);
      break;
    }
    default:
      json.type = 'string';
  }
  if (description) json.description = description;
  return { json, required };
}

// ── MCP handlers ─────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
      annotations: t.annotations,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  // Validate input with Zod.
  let args;
  try {
    args = tool.inputSchema.parse(rawArgs || {});
  } catch (e) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Input validation failed for ${name}: ${e?.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') || String(e)}`
    );
  }
  let result;
  try {
    result = await tool.handler(args);
  } catch (e) {
    if (e instanceof McpError) throw e;
    throw new McpError(ErrorCode.InternalError, `Tool ${name} failed: ${String(e?.message || e)}`);
  }
  const text = JSON.stringify(result, null, 2);
  return {
    content: [{ type: 'text', text }],
    structuredContent: result,
  };
});

// ── Start server over stdio ──────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so it doesn't interfere with stdio protocol.
  console.error(`NOIZY MCP v0.1.0 — ${TOOLS.length} tools loaded, ready.`);
}

main().catch(err => {
  console.error('NOIZY MCP fatal error:', err);
  process.exit(1);
});
