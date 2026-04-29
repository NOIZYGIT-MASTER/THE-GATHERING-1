-- =====================================================================
-- HEAVEN — Migration 001: consent_db + manifest_db + catalogue_db schema
-- =====================================================================
-- Idempotent. Run against each D1 database with the matching name.
-- Run order matters only within a database — not across databases.
--
-- Usage:
--   wrangler d1 execute consent_db   --remote --file=migrations/001_consent_schema.sql
--   wrangler d1 execute manifest_db  --remote --file=migrations/001_consent_schema.sql
--   wrangler d1 execute catalogue_db --remote --file=migrations/001_consent_schema.sql
--
-- The CREATE TABLE IF NOT EXISTS blocks are filtered by database —
-- each database only owns its relevant tables; the others no-op.
-- =====================================================================

-- ── consent_db ───────────────────────────────────────────────────────
-- Run on:   wrangler d1 execute consent_db --file=migrations/001_consent_schema.sql

CREATE TABLE IF NOT EXISTS subjects (
  subject_id      TEXT PRIMARY KEY,
  actor_id        TEXT NOT NULL UNIQUE,         -- e.g. RSP_001
  legal_name      TEXT,
  stage_name      TEXT,
  jurisdiction    TEXT,
  status          TEXT NOT NULL DEFAULT 'active' -- active | paused | revoked | deceased
                    CHECK (status IN ('active','paused','revoked','deceased')),
  enrolled_at     TEXT NOT NULL DEFAULT (datetime('now')),
  notes           TEXT
);

CREATE TABLE IF NOT EXISTS consent_records (
  record_id         TEXT PRIMARY KEY,
  actor_id          TEXT NOT NULL,
  action            TEXT NOT NULL,              -- synth | export | train | license
  scope             TEXT,                       -- '*' or 'demo' or 'demo/001'
  status            TEXT NOT NULL DEFAULT 'granted'
                      CHECK (status IN ('granted','revoked','expired','pending')),
  contract_version  TEXT NOT NULL DEFAULT 'v3',
  granted_at        TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at        TEXT,
  revoked_at        TEXT,
  signed_by         TEXT,                       -- wet-sig reference or crypto key id
  evidence_url      TEXT,                       -- pdf / audio of acknowledgement
  FOREIGN KEY (actor_id) REFERENCES subjects(actor_id)
);

CREATE INDEX IF NOT EXISTS idx_consent_records_lookup
  ON consent_records (actor_id, action, status, granted_at DESC);

CREATE TABLE IF NOT EXISTS consent_events (
  event_id      TEXT PRIMARY KEY,
  actor_id      TEXT,
  action        TEXT,
  scope         TEXT,
  requester_id  TEXT,
  allowed       INTEGER NOT NULL,                -- 0 | 1
  clause        TEXT,                            -- which Never-Clause or gate fired
  reason        TEXT,
  verdict_id    TEXT,
  logged_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consent_events_by_actor
  ON consent_events (actor_id, logged_at DESC);

-- ── manifest_db ──────────────────────────────────────────────────────
-- Run on:   wrangler d1 execute manifest_db --file=migrations/001_consent_schema.sql

CREATE TABLE IF NOT EXISTS deploys (
  deploy_id              TEXT PRIMARY KEY,
  service                TEXT NOT NULL,          -- heaven | gabriel | lucy | ...
  version                TEXT NOT NULL,
  never_clauses_version  TEXT NOT NULL,
  contract_version       TEXT NOT NULL,
  git_sha                TEXT,
  deployed_at            TEXT NOT NULL DEFAULT (datetime('now')),
  deployed_by            TEXT
);

CREATE INDEX IF NOT EXISTS idx_deploys_by_service
  ON deploys (service, deployed_at DESC);

-- ── catalogue_db ─────────────────────────────────────────────────────
-- Run on:   wrangler d1 execute catalogue_db --file=migrations/001_consent_schema.sql

CREATE TABLE IF NOT EXISTS voices (
  voice_id        TEXT PRIMARY KEY,
  actor_id        TEXT NOT NULL,                 -- FK back to consent_db.subjects (cross-DB, soft)
  character_name  TEXT,
  voice_range     TEXT CHECK (voice_range IN ('low','mid','high','full')),
  languages       TEXT,                          -- JSON array
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','paused','revoked','archived')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  model_ref       TEXT,                          -- pointer to NOIZYVOX artifact
  never_clauses_applied TEXT NOT NULL DEFAULT 'v3'
);

CREATE INDEX IF NOT EXISTS idx_voices_by_actor
  ON voices (actor_id, status);

-- =====================================================================
-- Seed (consent_db only): RSP_001 enrolled, with demo-scope synth grant.
-- Idempotent via INSERT OR IGNORE on unique keys.
-- =====================================================================

INSERT OR IGNORE INTO subjects (subject_id, actor_id, legal_name, jurisdiction, status)
VALUES ('subj_rsp001', 'RSP_001', 'Robert Stephen Plowman', 'CA-ON', 'active');

INSERT OR IGNORE INTO consent_records
  (record_id, actor_id, action, scope, status, contract_version, signed_by)
VALUES
  ('rec_rsp001_synth_demo',    'RSP_001', 'synth',   'demo',    'granted', 'v3', 'self:RSP_001'),
  ('rec_rsp001_synth_studio',  'RSP_001', 'synth',   'studio',  'granted', 'v3', 'self:RSP_001'),
  ('rec_rsp001_export_demo',   'RSP_001', 'export',  'demo',    'granted', 'v3', 'self:RSP_001');

-- =====================================================================
-- v0.3.0 addendum — legacy dual-write target
-- Run on:  wrangler d1 execute agent-memory --file=migrations/001_consent_schema.sql
--
-- HEAVEN dual-writes every consent_event into agent-memory.consent_log
-- during the migration window. If the legacy table didn't exist on this
-- account, this CREATE TABLE IF NOT EXISTS installs the canonical shape
-- so the bridge never has to error. Existing installations are no-op.
-- =====================================================================

CREATE TABLE IF NOT EXISTS consent_log (
  consent_id  TEXT PRIMARY KEY,
  artist_id   TEXT,
  action      TEXT,
  decision    TEXT,           -- 'allow' | 'deny'
  reason      TEXT,
  contract    TEXT,
  logged_by   TEXT,           -- expected 'heaven'
  logged_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consent_log_by_artist
  ON consent_log (artist_id, logged_at DESC);

-- =====================================================================
-- v0.3.0 — verdict_keys audit (in consent_db)
-- Run on:  wrangler d1 execute consent_db --file=migrations/001_consent_schema.sql
-- (re-running is idempotent)
-- =====================================================================

CREATE TABLE IF NOT EXISTS verdict_key_rotations (
  kid              TEXT PRIMARY KEY,
  rotated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  retired_kid      TEXT,
  rotated_by       TEXT                          -- e.g. 'self:RSP_001' or 'ops:GABRIEL'
);
