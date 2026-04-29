-- =====================================================================
-- HEAVEN — Migration 003: artifacts table in catalogue_db
-- =====================================================================
-- Idempotent. Run on catalogue_db only.
--
-- Usage:
--   wrangler d1 execute catalogue_db --remote --file=migrations/003_artifacts_schema.sql
--
-- Records one row per authorized R2 write. The catalogue is the source
-- of truth for what audio exists under what consent. R2 holds bytes;
-- the catalogue holds meaning.
-- =====================================================================

CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id   TEXT PRIMARY KEY,          -- = object_key (a key is unique per bucket)
  actor_id      TEXT NOT NULL,
  verdict_id    TEXT NOT NULL,
  bucket        TEXT NOT NULL DEFAULT 'voice-artifacts',
  object_key    TEXT NOT NULL,
  size_bytes    INTEGER,
  content_type  TEXT,
  etag          TEXT,
  kid           TEXT,                      -- key id that signed the verdict
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','revoked','missing')),
  written_at    TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_artifacts_by_actor
  ON artifacts (actor_id, written_at DESC);

CREATE INDEX IF NOT EXISTS idx_artifacts_by_verdict
  ON artifacts (verdict_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_by_status
  ON artifacts (status, written_at DESC);
