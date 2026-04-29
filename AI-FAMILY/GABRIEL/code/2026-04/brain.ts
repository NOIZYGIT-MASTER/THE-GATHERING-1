/**
 * GABRIEL Brain — Durable Object that holds GABRIEL's state, command log,
 * audit trail, and per-agent-instance coordination.
 *
 * Architecture:
 *   - Extends DurableObject (SQLite-backed by default on 2025+ compatibility dates).
 *   - blockConcurrencyWhile() is used ONLY in the constructor for schema migration.
 *     Per Cloudflare docs: "Use sparingly — it reduces throughput to ~200 req/sec
 *     if used on every request."
 *   - Per-request atomicity uses this.ctx.storage.transaction() rather than
 *     blockConcurrencyWhile — transactions give atomicity without blocking
 *     unrelated concurrent requests.
 *   - Every accepted command is appended to the audit_log table before dispatch.
 *   - DESTRUCTIVE commands require a valid warrant (see verifyWarrant).
 *
 * Never-overwrite guarantee:
 *   The commands table is INSERT-ONLY. No UPDATE, no DELETE. Supersedence is
 *   modeled by a new row with supersedes=<prior_id>. This is how GABRIEL "never
 *   overwrites its own commands."
 *
 * References:
 *   - https://developers.cloudflare.com/durable-objects/api/state/#blockconcurrencywhile
 *   - https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
 *   - https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/
 */

import { DurableObject } from "cloudflare:workers";

// --- Types ---

export type CommandTier = "READ" | "WRITE" | "DESTRUCTIVE" | "RESERVED";

export interface CommandRequest {
  id: string;                 // ULID from the Worker dispatcher
  name: string;               // e.g. "workers.list"
  tier: CommandTier;
  args: Record<string, unknown>;
  requester: string;          // verified from Cf-Access-Jwt-Assertion claim
  received_at: string;        // ISO8601
  warrant_id?: string;        // required for DESTRUCTIVE / RESERVED
}

export interface CommandResult {
  id: string;
  status: "ok" | "refused" | "error";
  message?: string;
  data?: unknown;
  warrant_used?: string;
  completed_at: string;
}

export interface Warrant {
  warrant_id: string;
  issued_at: string;
  expires_at: string;
  operation: string;
  target: string;
  reason: string;
  issuer: string;
  signature: string;          // ed25519(hw-token)
}

export interface Env {
  // Bindings — populated in wrangler.toml
  CF_ACCOUNT_ID: string;
  WARRANT_PUBLIC_KEY: string;        // base64 ed25519 public key of the author's hardware token
  TEAM_DOMAIN: string;               // <team>.cloudflareaccess.com
  APP_AUD: string;                   // Access application audience tag
  // Secret bindings for scoped tokens (set via `wrangler secret put`):
  TOKEN_WORKERS_DEPLOY?: string;
  TOKEN_STORAGE?: string;
  TOKEN_DNS?: string;
  TOKEN_SECURITY?: string;
  TOKEN_OBSERVABILITY?: string;
  TOKEN_ACCOUNT_ADMIN_READ?: string; // read-only subset; write-scoped token is hardware-unwrapped per-op
}

// --- Durable Object ---

export class GabrielBrain extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Per Cloudflare docs: blockConcurrencyWhile in the constructor for one-time
    // schema migration ensures no requests are processed until schema is ready.
    ctx.blockConcurrencyWhile(async () => {
      await this.migrate();
    });
  }

  // --- Migration ---
  // Tracked manually (Durable Objects SQLite does not support PRAGMA user_version).
  // For production, consider durable-utils SQLSchemaMigrations.
  private async migrate() {
    const sql = this.ctx.storage.sql;

    sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const version = Number(
      sql
        .exec("SELECT COALESCE(MAX(id), 0) AS v FROM _sql_schema_migrations")
        .one().v
    );

    if (version < 1) {
      sql.exec(`
        -- INSERT-ONLY command log. GABRIEL never overwrites or deletes commands.
        CREATE TABLE commands (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          tier          TEXT NOT NULL CHECK (tier IN ('READ','WRITE','DESTRUCTIVE','RESERVED')),
          args_json     TEXT NOT NULL,
          requester     TEXT NOT NULL,
          received_at   TEXT NOT NULL,
          warrant_id    TEXT,
          supersedes    TEXT,
          FOREIGN KEY (supersedes) REFERENCES commands(id)
        );

        CREATE INDEX idx_commands_received_at ON commands(received_at);
        CREATE INDEX idx_commands_name        ON commands(name);

        -- Results are separate. INSERT-ONLY.
        CREATE TABLE command_results (
          command_id    TEXT PRIMARY KEY,
          status        TEXT NOT NULL CHECK (status IN ('ok','refused','error')),
          message       TEXT,
          data_json     TEXT,
          completed_at  TEXT NOT NULL,
          FOREIGN KEY (command_id) REFERENCES commands(id)
        );

        -- Warrant consumption log. A warrant_id may be used at most once.
        CREATE TABLE consumed_warrants (
          warrant_id    TEXT PRIMARY KEY,
          consumed_at   TEXT NOT NULL,
          consumed_by_command TEXT NOT NULL,
          FOREIGN KEY (consumed_by_command) REFERENCES commands(id)
        );

        -- Human-readable audit log. INSERT-ONLY. Mirrored nightly to R2.
        CREATE TABLE audit_log (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          ts            TEXT NOT NULL DEFAULT (datetime('now')),
          requester     TEXT NOT NULL,
          command_id    TEXT,
          command_name  TEXT NOT NULL,
          tier          TEXT NOT NULL,
          outcome       TEXT NOT NULL,
          notes         TEXT
        );
      `);

      sql.exec("INSERT INTO _sql_schema_migrations (id) VALUES (1)");
    }
  }

  // ---------------------------------------------------------------------------
  // Command intake
  // ---------------------------------------------------------------------------

  /**
   * Accept a command from the outer Worker. This is the only way commands enter
   * GABRIEL. The outer Worker is responsible for verifying the Access JWT before
   * calling this method.
   *
   * Uses transaction() (not blockConcurrencyWhile) for per-request atomicity.
   */
  async acceptCommand(req: CommandRequest): Promise<CommandResult> {
    const sql = this.ctx.storage.sql;

    // 1. Warrant check for destructive tiers — BEFORE any persistence.
    if (req.tier === "DESTRUCTIVE" || req.tier === "RESERVED") {
      if (!req.warrant_id) {
        return this.refuse(req, "no warrant provided for destructive tier");
      }
      const warrantOk = await this.verifyAndConsumeWarrant(
        req.warrant_id,
        req
      );
      if (!warrantOk.ok) {
        return this.refuse(req, warrantOk.reason);
      }
    }

    // 2. Atomically insert into commands + audit_log.
    try {
      this.ctx.storage.transactionSync(() => {
        // Commands table is INSERT-ONLY; a conflict on id = request replay.
        sql.exec(
          `INSERT INTO commands
            (id, name, tier, args_json, requester, received_at, warrant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          req.id,
          req.name,
          req.tier,
          JSON.stringify(req.args),
          req.requester,
          req.received_at,
          req.warrant_id ?? null
        );
        sql.exec(
          `INSERT INTO audit_log
            (requester, command_id, command_name, tier, outcome)
            VALUES (?, ?, ?, ?, ?)`,
          req.requester,
          req.id,
          req.name,
          req.tier,
          "accepted"
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("UNIQUE constraint failed")) {
        return this.refuse(req, "duplicate command id — replay refused");
      }
      return this.error(req, `persistence failure: ${msg}`);
    }

    // 3. Dispatch to the Cloudflare API (READ tier only in Phase 1).
    //    WRITE/DESTRUCTIVE handlers come in Phase 2.
    const result = await this.dispatch(req);

    // 4. Persist result.
    sql.exec(
      `INSERT INTO command_results
        (command_id, status, message, data_json, completed_at)
        VALUES (?, ?, ?, ?, ?)`,
      req.id,
      result.status,
      result.message ?? null,
      result.data !== undefined ? JSON.stringify(result.data) : null,
      result.completed_at
    );

    sql.exec(
      `INSERT INTO audit_log
        (requester, command_id, command_name, tier, outcome, notes)
        VALUES (?, ?, ?, ?, ?, ?)`,
      req.requester,
      req.id,
      req.name,
      req.tier,
      result.status,
      result.message ?? null
    );

    return result;
  }

  // ---------------------------------------------------------------------------
  // Read-only accessors (over WebSocket or RPC)
  // ---------------------------------------------------------------------------

  async recentAudit(limit = 50): Promise<Array<Record<string, unknown>>> {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT ts, requester, command_name, tier, outcome, notes FROM audit_log ORDER BY id DESC LIMIT ?",
        limit
      )
      .toArray();
    return rows;
  }

  async getCommand(id: string): Promise<Record<string, unknown> | null> {
    const row = this.ctx.storage.sql
      .exec(
        `SELECT c.*, r.status AS result_status, r.message AS result_message, r.completed_at
         FROM commands c LEFT JOIN command_results r ON r.command_id = c.id
         WHERE c.id = ?`,
        id
      )
      .toArray();
    return row[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Warrant verification
  // ---------------------------------------------------------------------------

  private async verifyAndConsumeWarrant(
    warrant_id: string,
    req: CommandRequest
  ): Promise<{ ok: boolean; reason: string }> {
    const sql = this.ctx.storage.sql;

    // Single-use enforcement — reject any warrant already consumed.
    const prior = sql
      .exec("SELECT 1 FROM consumed_warrants WHERE warrant_id = ?", warrant_id)
      .toArray();
    if (prior.length > 0) {
      return { ok: false, reason: "warrant already consumed" };
    }

    // Fetch the warrant payload from the request context.
    // (The Worker hands the full Warrant object via a separate method before
    // calling acceptCommand. Here we only mark consumption.)
    // Signature verification happens in the Worker layer using WARRANT_PUBLIC_KEY
    // because Web Crypto + ed25519 is more natural at the Worker boundary.
    //
    // For defense in depth, the Brain could re-verify; left as a Phase 2 TODO.

    sql.exec(
      `INSERT INTO consumed_warrants (warrant_id, consumed_at, consumed_by_command)
       VALUES (?, datetime('now'), ?)`,
      warrant_id,
      req.id
    );

    return { ok: true, reason: "" };
  }

  // ---------------------------------------------------------------------------
  // Dispatcher
  // ---------------------------------------------------------------------------

  private async dispatch(req: CommandRequest): Promise<CommandResult> {
    const completed_at = new Date().toISOString();

    try {
      switch (req.name) {
        // READ-tier commands (Phase 1)
        case "workers.list":
          return this.ok(req, await this.cfGet("/workers/scripts"));
        case "dns.zones.list":
          return this.ok(req, await this.cfGet("/zones"));
        case "d1.list":
          return this.ok(req, await this.cfGet("/d1/database"));
        case "audit.list":
          return this.ok(req, await this.recentAudit(100));
        case "version":
          return this.ok(req, { version: "0.1", phase: 1, tier: "READ-only" });
        default:
          return this.refuse(req, `unknown or not-yet-implemented command: ${req.name}`);
      }
    } catch (err) {
      return this.error(req, err instanceof Error ? err.message : String(err));
    }
  }

  // ---------------------------------------------------------------------------
  // Cloudflare API — account-scoped READ
  // ---------------------------------------------------------------------------

  private async cfGet(path: string): Promise<unknown> {
    const token = this.env.TOKEN_ACCOUNT_ADMIN_READ;
    if (!token) throw new Error("TOKEN_ACCOUNT_ADMIN_READ secret not bound");

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}${path}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      throw new Error(`Cloudflare API ${resp.status}: ${await resp.text()}`);
    }
    return resp.json();
  }

  // ---------------------------------------------------------------------------
  // Result helpers
  // ---------------------------------------------------------------------------

  private ok(req: CommandRequest, data: unknown): CommandResult {
    return {
      id: req.id,
      status: "ok",
      data,
      warrant_used: req.warrant_id,
      completed_at: new Date().toISOString(),
    };
  }

  private refuse(req: CommandRequest, reason: string): CommandResult {
    return {
      id: req.id,
      status: "refused",
      message: reason,
      completed_at: new Date().toISOString(),
    };
  }

  private error(req: CommandRequest, message: string): CommandResult {
    return {
      id: req.id,
      status: "error",
      message,
      completed_at: new Date().toISOString(),
    };
  }
}
