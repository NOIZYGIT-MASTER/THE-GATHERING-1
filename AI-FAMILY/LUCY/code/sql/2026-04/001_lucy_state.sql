-- Migration 001: Lucy PWA State → D1
-- Replaces KV-based Lucy state storage
-- Target: agent-memory (7b813205)
-- Run: make migrate-d1

-- Lucy PWA state (replaces lucy:* KV keys)
CREATE TABLE IF NOT EXISTS lucy_state (
  user_id      TEXT NOT NULL DEFAULT 'RSP_001',
  key          TEXT NOT NULL,           -- e.g. "active_tab", "view_mode", "filters"
  value        TEXT NOT NULL,           -- JSON string
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  ttl_seconds  INTEGER,                 -- NULL = permanent
  PRIMARY KEY (user_id, key)
);

-- KV shadow table (audit trail for migrated KV entries)
CREATE TABLE IF NOT EXISTS kv_shadow (
  namespace_id   TEXT NOT NULL,
  namespace_title TEXT NOT NULL,
  key            TEXT NOT NULL,
  value          TEXT,
  migrated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (namespace_id, key)
);

-- Batch write log (tracks consolidated writes, helps debug write count)
CREATE TABLE IF NOT EXISTS kv_write_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace    TEXT NOT NULL,
  key_count    INTEGER NOT NULL,
  written_at   TEXT NOT NULL DEFAULT (datetime('now')),
  source       TEXT            -- 'lucy', 'gabriel', 'heaven', etc.
);

-- Index for fast Lucy state reads
CREATE INDEX IF NOT EXISTS idx_lucy_state_user ON lucy_state(user_id);
CREATE INDEX IF NOT EXISTS idx_lucy_state_updated ON lucy_state(updated_at);
