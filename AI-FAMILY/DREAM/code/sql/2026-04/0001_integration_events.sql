-- ═══════════════════════════════════════════════════════════════════════
-- Integration Plane — Event Audit Log
-- Append-only. Every webhook, dispatch, and action is recorded.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS integration_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    TEXT NOT NULL UNIQUE,
  source      TEXT NOT NULL,           -- zapier, n8n, linear, github, stripe, etc.
  event_type  TEXT NOT NULL,           -- linear.issue.create, github.push, etc.
  payload_json TEXT NOT NULL,          -- Full webhook payload
  received_at TEXT NOT NULL,           -- ISO 8601
  processed   INTEGER DEFAULT 0,      -- 0 = pending, 1 = processed
  processed_at TEXT,                   -- When processing completed
  dispatch_target TEXT,                -- Where it was routed to
  error_message TEXT                   -- If processing failed
);

CREATE INDEX idx_events_source ON integration_events(source);
CREATE INDEX idx_events_type ON integration_events(event_type);
CREATE INDEX idx_events_received ON integration_events(received_at);
CREATE INDEX idx_events_processed ON integration_events(processed);

-- Connector configurations (seeded via KV, but schema here for reference)
-- Stored in KV_CONFIG as:
--   connector:{name} → { name, enabled, webhook_secret, api_base_url, auth_type, scopes }
--   oauth:{provider}  → { client_id, client_secret, authorize_url, token_url, redirect_uri, scopes }
--   n8n:webhook_url   → "http://god.local:5678"
