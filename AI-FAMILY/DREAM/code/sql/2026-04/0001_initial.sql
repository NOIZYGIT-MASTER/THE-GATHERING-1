-- ============================================================
-- D1 migration 0001 — initial schema for Lucy Mesh
-- Architect: Robert Stephen Plowman
-- Date:      2026-04-15
-- Owner:     ENGR
-- Mirrors:   session-state/SCHEMA.md (Tier 2)
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- sessions
-- One row per conversation. Spans devices, spans channels.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  architect_id  TEXT NOT NULL DEFAULT 'rsp',
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  device_id     TEXT NOT NULL,
  channel       TEXT NOT NULL CHECK (channel IN ('voice','chat','mixed')),
  label         TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_device  ON sessions(device_id);

-- ------------------------------------------------------------
-- messages
-- One row per message in a session, either architect- or agent-originated.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('architect','agent')),
  agent       TEXT,
  created_at  TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('text','voice_transcript','tool_call','tool_result')),
  payload     TEXT NOT NULL,
  parent_id   TEXT REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ------------------------------------------------------------
-- device_status
-- Last-known state of every device that has ever joined the mesh.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_status (
  device_id     TEXT PRIMARY KEY,
  last_seen_at  TEXT NOT NULL,
  online        INTEGER NOT NULL DEFAULT 0 CHECK (online IN (0,1)),
  version       TEXT,
  notes         TEXT
);

-- ------------------------------------------------------------
-- events
-- Append-only audit log for every state-changing action in the mesh.
-- Per SCHEMA.md: no silent writes. Every mutation emits an events row.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  actor       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  session_id  TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  ref_id      TEXT,
  payload     TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_kind    ON events(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_actor   ON events(actor, created_at);

-- ------------------------------------------------------------
-- Guardrails (enforced at the application layer as well):
--   - events rows are INSERT-only. Updates and deletes are forbidden.
--   - messages rows are INSERT-only. Corrections are new messages
--     that reference the original via parent_id.
--   - sessions.ended_at transitions null -> non-null exactly once.
-- ------------------------------------------------------------

-- Triggers: block events mutations outright.
CREATE TRIGGER IF NOT EXISTS events_no_update
BEFORE UPDATE ON events
BEGIN
  SELECT RAISE(ABORT, 'events rows are append-only; updates forbidden');
END;

CREATE TRIGGER IF NOT EXISTS events_no_delete
BEFORE DELETE ON events
BEGIN
  SELECT RAISE(ABORT, 'events rows are append-only; deletes forbidden');
END;

-- Triggers: block messages mutations outright.
CREATE TRIGGER IF NOT EXISTS messages_no_update
BEFORE UPDATE ON messages
BEGIN
  SELECT RAISE(ABORT, 'messages are append-only; create a new row with parent_id');
END;

CREATE TRIGGER IF NOT EXISTS messages_no_delete
BEFORE DELETE ON messages
BEGIN
  SELECT RAISE(ABORT, 'messages are append-only; deletes forbidden');
END;

-- ------------------------------------------------------------
-- End of migration 0001.
-- ============================================================
