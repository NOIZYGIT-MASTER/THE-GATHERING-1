-- Migration 002: GABRIEL KV Cache → D1
-- Moves GABRIEL agent state from KV to agent-memory D1
-- Target: agent-memory (7b813205)

-- GABRIEL runtime cache (replaces gabriel:* KV keys)
CREATE TABLE IF NOT EXISTS gabriel_cache (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'runtime',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT                 -- NULL = permanent
);

-- Index for category-based reads (common GABRIEL query pattern)
CREATE INDEX IF NOT EXISTS idx_gabriel_cache_category ON gabriel_cache(category);
CREATE INDEX IF NOT EXISTS idx_gabriel_cache_expires  ON gabriel_cache(expires_at);
