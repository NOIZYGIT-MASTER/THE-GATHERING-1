-- =====================================================================
-- HEAVEN — Migration 002: stream_sessions in catalogue_db
-- =====================================================================
-- Idempotent. Run on catalogue_db only.
--
-- Usage:
--   wrangler d1 execute catalogue_db --remote --file=migrations/002_stream_schema.sql
--
-- Records one row per issued Stream live input so consent events and
-- live performances can be cross-referenced. Includes mode (webrtc,
-- srt, llhls, hls) and the CF Stream uid returned by the API.
-- =====================================================================

CREATE TABLE IF NOT EXISTS stream_sessions (
  session_id      TEXT PRIMARY KEY,         -- uid returned by CF Stream
  actor_id        TEXT NOT NULL,
  verdict_id      TEXT NOT NULL,
  scope           TEXT,
  mode            TEXT NOT NULL              -- webrtc | srt | llhls | hls
                    CHECK (mode IN ('webrtc','srt','llhls','hls')),
  label           TEXT,
  status          TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','live','ended','error')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at        TEXT,
  recording_uid   TEXT                       -- if mode=automatic recording
);

CREATE INDEX IF NOT EXISTS idx_stream_sessions_by_actor
  ON stream_sessions (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stream_sessions_by_verdict
  ON stream_sessions (verdict_id);
