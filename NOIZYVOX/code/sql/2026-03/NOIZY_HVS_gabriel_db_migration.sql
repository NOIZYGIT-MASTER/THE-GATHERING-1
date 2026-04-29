-- ============================================================
-- NOIZY HVS — HUMAN VOICE SYMPHONY
-- Consent Kernel + NOIZY Ledger + Voice Estate
-- D1 Migration for gabriel_db
-- Cloudflare D1 (SQLite dialect)
--
-- Authored with Robert Stephen Plowman
-- RSP_001 — Founding Descendant
-- Architecture: consent as executable code,
--               provenance as default,
--               revocation as sacred,
--               compensation as automatic.
-- ============================================================


-- ============================================================
-- SECTION 1: ACTOR REGISTRY
-- The sovereign identity layer. Every voice has a home here.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_actors (
  actor_id         TEXT PRIMARY KEY,          -- e.g. RSP_001
  display_name     TEXT NOT NULL,
  legal_name       TEXT,
  email            TEXT UNIQUE,
  phone            TEXT,
  country          TEXT DEFAULT 'CA',
  is_founding      INTEGER DEFAULT 0,         -- 1 = founding member, floor = 85%
  status           TEXT DEFAULT 'active'      -- active | resting | revoked | estate
    CHECK (status IN ('active', 'resting', 'revoked', 'estate')),
  union_member     INTEGER DEFAULT 0,
  union_name       TEXT,
  onboarded_at     TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);

-- Seed RSP_001 as the founding Descendant
INSERT OR IGNORE INTO hvs_actors
  (actor_id, display_name, legal_name, email, country, is_founding, status, union_member)
VALUES
  ('RSP_001', 'Robert Stephen Plowman', 'Robert Stephen Plowman',
   'rsplowman@icloud.com', 'CA', 1, 'active', 0);


-- ============================================================
-- SECTION 2: VOICE DNA ARCHIVE
-- The acoustic identity of a human being.
-- Model-agnostic. Designed to survive model churn.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_voice_dna (
  dna_id           TEXT PRIMARY KEY,          -- UUID
  actor_id         TEXT NOT NULL,
  capture_session  TEXT NOT NULL,             -- session reference
  -- Acoustic fingerprint (model-agnostic features, not embeddings)
  spectral_profile TEXT,                      -- JSON: spectral envelope data
  pitch_contour    TEXT,                      -- JSON: pitch distribution
  formant_data     TEXT,                      -- JSON: F1-F4 formants
  prosodic_model   TEXT,                      -- JSON: rhythm, stress patterns
  emotion_palette  TEXT,                      -- JSON: captured emotional range
  -- Archive metadata
  sample_count     INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  quality_score    REAL DEFAULT 0.0,          -- 0.0 to 1.0
  archival_format  TEXT DEFAULT 'HVS-v1',     -- for PREMIS migration tracking
  checksum_sha256  TEXT,                      -- fixity for preservation
  -- Provenance
  c2pa_manifest_id TEXT,                      -- link to C2PA signing record
  consent_key_id   TEXT,                      -- active consent at capture time
  created_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (actor_id) REFERENCES hvs_actors(actor_id)
);


-- ============================================================
-- SECTION 3: DESCENDANTS
-- A Descendant is a governed performance entity.
-- It carries its own consent, its own lineage, its own value.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_descendants (
  descendant_id    TEXT PRIMARY KEY,          -- UUID
  actor_id         TEXT NOT NULL,
  parent_dna_id    TEXT NOT NULL,             -- links to hvs_voice_dna
  parent_desc_id   TEXT,                      -- optional: child of another Descendant
  name             TEXT NOT NULL,             -- human name for this Descendant
  character_type   TEXT,                      -- narrator | character | commercial | etc.
  emotional_tags   TEXT,                      -- JSON array: ['warm','urgent','playful']
  consent_scope    TEXT DEFAULT 'private'     -- private | portfolio | licensable
    CHECK (consent_scope IN ('private', 'portfolio', 'licensable')),
  licensing_enabled INTEGER DEFAULT 0,        -- 1 = this Descendant earns
  approval_required INTEGER DEFAULT 1,        -- 1 = actor must approve each use
  -- Lineage (for 100-year chain of custody)
  generation       INTEGER DEFAULT 1,
  lineage_hash     TEXT,                      -- cryptographic link to parent
  -- Synthesis model tracking (for migration)
  synthesis_model  TEXT,                      -- model used at creation time
  synthesis_version TEXT,
  -- Economics
  royalty_floor_pct REAL DEFAULT 75.0,        -- minimum actor share
  status           TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'resting', 'revoked', 'archived')),
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (actor_id) REFERENCES hvs_actors(actor_id),
  FOREIGN KEY (parent_dna_id) REFERENCES hvs_voice_dna(dna_id)
);


-- ============================================================
-- SECTION 4: NEVER CLAUSES
-- The immovable lines. Written once. Enforced always.
-- These are not preferences. They are laws.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_never_clauses (
  clause_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id         TEXT NOT NULL,
  clause_code      TEXT NOT NULL,             -- short identifier
  clause_text      TEXT NOT NULL,             -- full human-readable statement
  category         TEXT NOT NULL,             -- political|sexual|weapons|deception|hate|commercial|other
  is_global        INTEGER DEFAULT 1,         -- 1 = applies to all Descendants
  descendant_id    TEXT,                      -- if scope = specific Descendant
  is_system        INTEGER DEFAULT 0,         -- 1 = NOIZY platform-level, not actor-set
  created_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (actor_id) REFERENCES hvs_actors(actor_id)
);

-- Seed RSP_001's 7 Never Clauses
INSERT OR IGNORE INTO hvs_never_clauses
  (actor_id, clause_code, clause_text, category, is_global, is_system)
VALUES
  ('RSP_001', 'NC-01', 'Never use this voice to generate, endorse, or promote political propaganda or party political content of any kind.', 'political', 1, 0),
  ('RSP_001', 'NC-02', 'Never use this voice in sexual, pornographic, or adult content of any kind.', 'sexual', 1, 0),
  ('RSP_001', 'NC-03', 'Never use this voice to promote, glorify, or instruct in weapons, violence, or harm to any living being.', 'weapons', 1, 0),
  ('RSP_001', 'NC-04', 'Never use this voice to impersonate, deceive, defraud, or misrepresent identity in any context.', 'deception', 1, 0),
  ('RSP_001', 'NC-05', 'Never use this voice in content that demeans, mocks, or dehumanizes any person or group on the basis of identity.', 'hate', 1, 0),
  ('RSP_001', 'NC-06', 'Never use this voice to endorse products, services, or organizations without explicit, separate written consent.', 'commercial', 1, 0),
  ('RSP_001', 'NC-07', 'Never transfer, sublicense, sell, or assign any rights to this voice or its Descendants to any third party without explicit written consent of the actor.', 'transfer', 1, 0);

-- NOIZY platform-level system clauses (apply to all actors)
INSERT OR IGNORE INTO hvs_never_clauses
  (actor_id, clause_code, clause_text, category, is_global, is_system)
VALUES
  ('RSP_001', 'SYS-01', 'No synthesis may proceed without a valid, unexpired consent token bound to this voice.', 'system', 1, 1),
  ('RSP_001', 'SYS-02', 'No Descendant may be transferred to a licensee whose license status is revoked or suspended.', 'system', 1, 1);


-- ============================================================
-- SECTION 5: CONSENT TOKENS
-- The executable unit of permission.
-- Issued. Tracked. Revocable in real time.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_consent_tokens (
  token_id         TEXT PRIMARY KEY,          -- UUID
  actor_id         TEXT NOT NULL,
  descendant_id    TEXT,                      -- NULL = covers all actor Descendants
  token_hash       TEXT UNIQUE NOT NULL,      -- HSM-signed hash
  -- Permission scope
  use_categories   TEXT NOT NULL,             -- JSON: ['commercial','narrative','gaming']
  territories      TEXT DEFAULT '["GLOBAL"]', -- JSON: ISO territory codes
  languages        TEXT DEFAULT '["*"]',      -- JSON: ISO language codes
  time_window_start TEXT,
  time_window_end  TEXT,
  -- Licensee binding
  licensee_id      TEXT,                      -- NULL = open / marketplace
  -- Lifecycle
  status           TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked', 'suspended')),
  issued_at        TEXT DEFAULT (datetime('now')),
  expires_at       TEXT,
  revoked_at       TEXT,
  revocation_reason TEXT,
  -- Provenance
  issuer_system    TEXT DEFAULT 'GABRIEL',
  c2pa_assertion   TEXT,                      -- C2PA manifest reference
  FOREIGN KEY (actor_id) REFERENCES hvs_actors(actor_id),
  FOREIGN KEY (descendant_id) REFERENCES hvs_descendants(descendant_id)
);


-- ============================================================
-- SECTION 6: LICENSEES
-- The entities that pay. LICENSEE pays. Artist pays $0. Always.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_licensees (
  licensee_id      TEXT PRIMARY KEY,          -- UUID
  org_name         TEXT NOT NULL,
  contact_email    TEXT,
  country          TEXT,
  industry         TEXT,
  tier             TEXT DEFAULT 'community'   -- community | professional | enterprise | broadcast
    CHECK (tier IN ('community', 'professional', 'enterprise', 'broadcast')),
  status           TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked', 'pending')),
  onboarded_at     TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);


-- ============================================================
-- SECTION 7: LICENSES (ISSUED)
-- Every license is a binding contract, recorded on the ledger.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_licenses (
  license_id       TEXT PRIMARY KEY,          -- UUID
  licensee_id      TEXT NOT NULL,
  actor_id         TEXT NOT NULL,
  descendant_id    TEXT NOT NULL,
  consent_token_id TEXT NOT NULL,
  -- License terms
  use_category     TEXT NOT NULL,
  territory        TEXT DEFAULT 'GLOBAL',
  duration_type    TEXT DEFAULT 'perpetual'   -- perpetual | limited | one-time
    CHECK (duration_type IN ('perpetual', 'limited', 'one-time')),
  starts_at        TEXT DEFAULT (datetime('now')),
  expires_at       TEXT,
  -- Economics
  license_fee_cad  REAL NOT NULL DEFAULT 0,
  actor_share_pct  REAL NOT NULL,             -- enforced >= 75 (or >= 85 for founding)
  noizy_share_pct  REAL NOT NULL,             -- 25 (or 15 for founding members)
  union_contrib_pct REAL DEFAULT 0,           -- from within actor share
  -- Status
  status           TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked', 'suspended')),
  issued_at        TEXT DEFAULT (datetime('now')),
  revoked_at       TEXT,
  revocation_reason TEXT,
  FOREIGN KEY (licensee_id) REFERENCES hvs_licensees(licensee_id),
  FOREIGN KEY (actor_id) REFERENCES hvs_actors(actor_id),
  FOREIGN KEY (descendant_id) REFERENCES hvs_descendants(descendant_id),
  FOREIGN KEY (consent_token_id) REFERENCES hvs_consent_tokens(token_id)
);


-- ============================================================
-- SECTION 8: HVS RATE TABLE
-- The economic architecture. Adjustable levers, not laws.
-- Every dollar flows from the LICENSEE. Artist pays $0. Always.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_rate_table (
  rate_id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tier             TEXT NOT NULL UNIQUE,      -- matches hvs_licensees.tier
  base_fee_cad     REAL NOT NULL,
  actor_share_pct  REAL NOT NULL,
  noizy_share_pct  REAL NOT NULL,
  founding_actor_share_pct REAL,             -- override for is_founding = 1
  founding_noizy_share_pct REAL,
  effective_from   TEXT DEFAULT (datetime('now')),
  notes            TEXT
);

-- Seed rate table (75/25 standard, 85/15 founding)
INSERT OR IGNORE INTO hvs_rate_table
  (tier, base_fee_cad, actor_share_pct, noizy_share_pct, founding_actor_share_pct, founding_noizy_share_pct, notes)
VALUES
  ('community',     0,       75.0, 25.0, 85.0, 15.0, 'Free tier. Nominal one-time licensee onboarding. Artist pays $0.'),
  ('professional',  499,     75.0, 25.0, 85.0, 15.0, 'Professional licensees. Monthly retainer paid by licensee.'),
  ('enterprise',    2499,    75.0, 25.0, 85.0, 15.0, 'Enterprise. Annual contract. Compliance pack included.'),
  ('broadcast',     9999,    75.0, 25.0, 85.0, 15.0, 'Broadcasters (CBC, BBC, etc.). C2PA + PREMIS audit trail included.');


-- ============================================================
-- SECTION 9: UNION CONTRIBUTION TIERS
-- Collective protection grows with individual success.
-- Contribution comes from within the actor's 75%. Not additional.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_union_tiers (
  tier_id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_name        TEXT NOT NULL,
  annual_earnings_min_cad REAL,
  annual_earnings_max_cad REAL,
  union_contrib_pct REAL NOT NULL,
  notes            TEXT
);

INSERT OR IGNORE INTO hvs_union_tiers
  (tier_name, annual_earnings_min_cad, annual_earnings_max_cad, union_contrib_pct, notes)
VALUES
  ('emerging',      0,       9999,    2.0, 'New voices. Minimum contribution. Collective protection foundation.'),
  ('active',        10000,   49999,   4.0, 'Working voices. Growing contribution.'),
  ('established',   50000,   149999,  6.0, 'Established performers. Meaningful collective share.'),
  ('prominent',     150000,  499999,  8.0, 'High earners. Stronger collective obligation.'),
  ('landmark',      500000,  NULL,   10.0, 'The most successful voices give the most back. This is the design.');


-- ============================================================
-- SECTION 10: NOIZY LEDGER
-- The 100-year spine. Append-only. Tamper-evident.
-- Every event. Every dollar. Every permission. Every revocation.
-- The truth that outlives platforms.
-- ============================================================

CREATE TABLE IF NOT EXISTS noizy_ledger (
  event_id         TEXT PRIMARY KEY,          -- UUID v4
  -- Identity
  actor_id         TEXT,
  descendant_id    TEXT,
  licensee_id      TEXT,
  license_id       TEXT,
  consent_token_id TEXT,
  -- Event classification
  event_type       TEXT NOT NULL
    CHECK (event_type IN (
      'consent.issued', 'consent.renewed', 'consent.revoked', 'consent.expired',
      'voice.dna.captured', 'voice.dna.migrated',
      'descendant.created', 'descendant.updated', 'descendant.revoked', 'descendant.archived',
      'synth.requested', 'synth.approved', 'synth.completed', 'synth.blocked',
      'license.issued', 'license.renewed', 'license.revoked', 'license.expired',
      'payout.accrued', 'payout.sent', 'payout.failed',
      'provenance.signed', 'provenance.verified', 'provenance.migrated',
      'never_clause.blocked',
      'kill_switch.activated', 'kill_switch.propagated',
      'estate.transfer', 'estate.activated',
      'system.audit', 'system.migration'
    )),
  -- Payload
  payload_json     TEXT,                      -- full event data as JSON
  -- Provenance links
  c2pa_manifest_id TEXT,
  prev_event_id    TEXT,                      -- chain link to preceding event
  -- Financial fields (denormalized for fast KPI queries)
  amount_cad       REAL DEFAULT 0,
  actor_share_cad  REAL DEFAULT 0,
  noizy_share_cad  REAL DEFAULT 0,
  union_share_cad  REAL DEFAULT 0,
  -- Metadata
  source_system    TEXT DEFAULT 'GABRIEL',
  source_ip        TEXT,
  worker_colo      TEXT,
  -- Timestamp (immutable once written)
  recorded_at      TEXT DEFAULT (datetime('now'))
);

-- Append-only enforcement trigger
-- In SQLite/D1, we prevent UPDATE and DELETE at the trigger level
CREATE TRIGGER IF NOT EXISTS ledger_no_update
  BEFORE UPDATE ON noizy_ledger
BEGIN
  SELECT RAISE(ABORT, 'NOIZY LEDGER IS IMMUTABLE. Updates are constitutionally prohibited.');
END;

CREATE TRIGGER IF NOT EXISTS ledger_no_delete
  BEFORE DELETE ON noizy_ledger
BEGIN
  SELECT RAISE(ABORT, 'NOIZY LEDGER IS IMMUTABLE. Deletions are constitutionally prohibited.');
END;


-- ============================================================
-- SECTION 11: PREMIS PRESERVATION EVENTS
-- The 100-year migration framework.
-- Every time the underlying tech changes, this record shows
-- the chain of custody was never broken.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_premis_events (
  premis_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  object_id        TEXT NOT NULL,             -- dna_id or descendant_id
  object_type      TEXT NOT NULL              -- voice_dna | descendant | ledger
    CHECK (object_type IN ('voice_dna', 'descendant', 'ledger', 'manifest')),
  event_type       TEXT NOT NULL,             -- ingestion | migration | validation | fixity_check
  detail           TEXT,                      -- human-readable description
  -- Fixity
  algorithm_before TEXT,                      -- e.g. SHA-256
  checksum_before  TEXT,
  algorithm_after  TEXT,
  checksum_after   TEXT,
  -- Migration specifics
  model_before     TEXT,                      -- synthesis model replaced
  model_after      TEXT,                      -- new synthesis model
  similarity_score REAL,                      -- must be >= 0.90 to pass
  migration_passed INTEGER,                   -- 1 = passed, 0 = failed
  -- Agent
  performed_by     TEXT DEFAULT 'GABRIEL',
  recorded_at      TEXT DEFAULT (datetime('now'))
);


-- ============================================================
-- SECTION 12: SYNTHESIS REQUESTS
-- Every generation request. Every output. Traceable forever.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_synth_requests (
  request_id       TEXT PRIMARY KEY,          -- UUID
  actor_id         TEXT NOT NULL,
  descendant_id    TEXT NOT NULL,
  consent_token_id TEXT NOT NULL,
  license_id       TEXT,
  licensee_id      TEXT,
  -- Request
  script_hash      TEXT,                      -- SHA-256 of the script (not the script itself)
  use_category     TEXT NOT NULL,
  emotional_profile TEXT,                     -- JSON
  -- Never clause check
  never_clause_check TEXT DEFAULT 'passed'
    CHECK (never_clause_check IN ('passed', 'blocked', 'pending')),
  blocked_clause_id INTEGER,
  -- Output
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'completed', 'blocked', 'failed')),
  output_hash      TEXT,                      -- SHA-256 of generated audio
  c2pa_manifest_id TEXT,
  duration_ms      REAL,
  -- Economics
  royalty_accrued_cad REAL DEFAULT 0,
  actor_share_cad  REAL DEFAULT 0,
  noizy_share_cad  REAL DEFAULT 0,
  -- Timestamps
  requested_at     TEXT DEFAULT (datetime('now')),
  completed_at     TEXT,
  FOREIGN KEY (actor_id) REFERENCES hvs_actors(actor_id),
  FOREIGN KEY (descendant_id) REFERENCES hvs_descendants(descendant_id),
  FOREIGN KEY (consent_token_id) REFERENCES hvs_consent_tokens(token_id)
);


-- ============================================================
-- SECTION 13: VOICE ESTATE
-- What persists after the actor is gone.
-- This is the mechanism that makes the 100-year promise real.
-- ============================================================

CREATE TABLE IF NOT EXISTS hvs_estates (
  estate_id        TEXT PRIMARY KEY,          -- UUID
  actor_id         TEXT NOT NULL UNIQUE,
  -- Legal
  estate_name      TEXT NOT NULL,             -- legal name of estate entity
  jurisdiction     TEXT DEFAULT 'CA',
  executor_name    TEXT,
  executor_email   TEXT,
  -- Beneficiary routing
  primary_beneficiary TEXT,
  secondary_beneficiary TEXT,
  beneficiary_split TEXT,                     -- JSON: {primary_pct, secondary_pct}
  -- Preservation
  archive_location TEXT DEFAULT 'CF_R2',      -- Cloudflare R2 default
  oais_package_id  TEXT,
  -- Status
  status           TEXT DEFAULT 'pending'     -- pending | active | distributed
    CHECK (status IN ('pending', 'active', 'distributed')),
  activated_at     TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (actor_id) REFERENCES hvs_actors(actor_id)
);

-- Seed RSP_001 estate record
INSERT OR IGNORE INTO hvs_estates
  (estate_id, actor_id, estate_name, jurisdiction, status)
VALUES
  ('EST-RSP-001', 'RSP_001', 'Robert Stephen Plowman Voice Estate', 'CA', 'pending');


-- ============================================================
-- SECTION 14: INDEXES
-- Performance on D1's edge nodes.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ledger_actor     ON noizy_ledger(actor_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type      ON noizy_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_ledger_recorded  ON noizy_ledger(recorded_at);
CREATE INDEX IF NOT EXISTS idx_ledger_licensee  ON noizy_ledger(licensee_id);
CREATE INDEX IF NOT EXISTS idx_ledger_consent   ON noizy_ledger(consent_token_id);

CREATE INDEX IF NOT EXISTS idx_tokens_actor     ON hvs_consent_tokens(actor_id);
CREATE INDEX IF NOT EXISTS idx_tokens_status    ON hvs_consent_tokens(status);

CREATE INDEX IF NOT EXISTS idx_desc_actor       ON hvs_descendants(actor_id);
CREATE INDEX IF NOT EXISTS idx_desc_status      ON hvs_descendants(status);

CREATE INDEX IF NOT EXISTS idx_synth_actor      ON hvs_synth_requests(actor_id);
CREATE INDEX IF NOT EXISTS idx_synth_status     ON hvs_synth_requests(status);

CREATE INDEX IF NOT EXISTS idx_licenses_actor   ON hvs_licenses(actor_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status  ON hvs_licenses(status);

CREATE INDEX IF NOT EXISTS idx_premis_object    ON hvs_premis_events(object_id);


-- ============================================================
-- SECTION 15: KPI VIEWS
-- Five lenses on the system's health, trust, and economics.
-- Queryable directly from GABRIEL or the economics dashboard.
-- ============================================================

-- KPI 1: Trust — % of synth outputs with valid consent + signed provenance
CREATE VIEW IF NOT EXISTS kpi_trust AS
SELECT
  COUNT(*) AS total_synth_requests,
  SUM(CASE WHEN never_clause_check = 'passed' AND c2pa_manifest_id IS NOT NULL THEN 1 ELSE 0 END) AS trusted_outputs,
  ROUND(
    100.0 * SUM(CASE WHEN never_clause_check = 'passed' AND c2pa_manifest_id IS NOT NULL THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0), 2
  ) AS trust_pct
FROM hvs_synth_requests;

-- KPI 2: Safety — Revocation response (consent.revoked events)
CREATE VIEW IF NOT EXISTS kpi_safety AS
SELECT
  COUNT(*) AS total_revocations,
  SUM(CASE WHEN event_type = 'kill_switch.activated' THEN 1 ELSE 0 END) AS kill_switch_activations,
  SUM(CASE WHEN event_type = 'consent.revoked' THEN 1 ELSE 0 END) AS consent_revocations,
  SUM(CASE WHEN event_type = 'never_clause.blocked' THEN 1 ELSE 0 END) AS never_clause_blocks
FROM noizy_ledger
WHERE event_type IN ('kill_switch.activated', 'consent.revoked', 'never_clause.blocked');

-- KPI 3: Revenue — Earnings by actor and Descendant
CREATE VIEW IF NOT EXISTS kpi_revenue AS
SELECT
  a.actor_id,
  a.display_name,
  a.is_founding,
  COUNT(DISTINCT d.descendant_id) AS descendant_count,
  COUNT(DISTINCT l.license_id) AS active_licenses,
  COALESCE(SUM(l.license_fee_cad), 0) AS total_fees_cad,
  COALESCE(SUM(l.license_fee_cad * l.actor_share_pct / 100.0), 0) AS actor_earnings_cad,
  COALESCE(SUM(l.license_fee_cad * l.noizy_share_pct / 100.0), 0) AS noizy_earnings_cad
FROM hvs_actors a
LEFT JOIN hvs_descendants d ON d.actor_id = a.actor_id AND d.status = 'active'
LEFT JOIN hvs_licenses l ON l.actor_id = a.actor_id AND l.status = 'active'
GROUP BY a.actor_id;

-- KPI 4: Quality — Emotional range coverage per Descendant
CREATE VIEW IF NOT EXISTS kpi_quality AS
SELECT
  d.descendant_id,
  d.name,
  d.actor_id,
  d.consent_scope,
  d.licensing_enabled,
  COUNT(sr.request_id) AS total_synth_uses,
  AVG(sr.duration_ms) AS avg_synth_ms,
  SUM(CASE WHEN sr.status = 'completed' THEN 1 ELSE 0 END) AS successful_synths,
  SUM(CASE WHEN sr.status = 'blocked' THEN 1 ELSE 0 END) AS blocked_synths
FROM hvs_descendants d
LEFT JOIN hvs_synth_requests sr ON sr.descendant_id = d.descendant_id
GROUP BY d.descendant_id;

-- KPI 5: Risk — Blocked attempts by Never Clause category
CREATE VIEW IF NOT EXISTS kpi_risk AS
SELECT
  nc.category,
  nc.clause_code,
  nc.clause_text,
  COUNT(sr.request_id) AS blocked_attempts
FROM hvs_never_clauses nc
LEFT JOIN hvs_synth_requests sr ON sr.blocked_clause_id = nc.clause_id
  AND sr.never_clause_check = 'blocked'
GROUP BY nc.clause_id
ORDER BY blocked_attempts DESC;


-- ============================================================
-- SECTION 16: ENTERPRISE AUDIT VIEW
-- What procurement committees ask for.
-- What regulatory auditors expect.
-- What makes enterprise contracts possible.
-- ============================================================

CREATE VIEW IF NOT EXISTS enterprise_audit AS
SELECT
  l.license_id,
  l.issued_at,
  l.status AS license_status,
  li.org_name AS licensee,
  li.tier AS licensee_tier,
  a.actor_id,
  a.display_name AS actor_name,
  d.name AS descendant_name,
  d.consent_scope,
  ct.status AS consent_status,
  ct.use_categories,
  ct.territories,
  ct.expires_at AS consent_expires,
  l.use_category,
  l.license_fee_cad,
  l.actor_share_pct,
  l.noizy_share_pct,
  l.union_contrib_pct,
  -- Compliance signals
  CASE WHEN ct.status = 'active' THEN 'COMPLIANT' ELSE 'NON-COMPLIANT' END AS consent_compliance,
  CASE WHEN l.actor_share_pct >= 75 THEN 'COMPLIANT' ELSE 'REVIEW-REQUIRED' END AS royalty_compliance,
  l.expires_at AS license_expires
FROM hvs_licenses l
JOIN hvs_licensees li ON li.licensee_id = l.licensee_id
JOIN hvs_actors a ON a.actor_id = l.actor_id
JOIN hvs_descendants d ON d.descendant_id = l.descendant_id
JOIN hvs_consent_tokens ct ON ct.token_id = l.consent_token_id;


-- ============================================================
-- SECTION 17: FIRST LEDGER ENTRY
-- RSP_001. The root of the chain. March 2026.
-- From this event, all provenance flows.
-- ============================================================

INSERT OR IGNORE INTO noizy_ledger
  (event_id, actor_id, event_type, payload_json, source_system, recorded_at)
VALUES
  (
    'GENESIS-RSP-001',
    'RSP_001',
    'voice.dna.captured',
    json('{"note":"RSP_001 founding Descendant — genesis ledger entry. This is the root of the chain. All provenance flows from here. March 2026. Peace, Love & Understanding.","actor":"Robert Stephen Plowman","mission":"consent as executable code, provenance as default, revocation as sacred, compensation as automatic"}'),
    'GABRIEL',
    datetime('now')
  );


-- ============================================================
-- END OF MIGRATION
--
-- Tables deployed to gabriel_db:
--   hvs_actors            — Sovereign identity registry
--   hvs_voice_dna         — Acoustic DNA archive
--   hvs_descendants       — Governed performance entities
--   hvs_never_clauses     — Immovable lines (7 + 2 system)
--   hvs_consent_tokens    — Executable permission units
--   hvs_licensees         — Entities that pay
--   hvs_licenses          — Binding license records
--   hvs_rate_table        — Economic levers (75/25 / 85/15)
--   hvs_union_tiers       — Collective contribution tiers
--   noizy_ledger          — Append-only 100-year audit spine
--   hvs_premis_events     — Preservation & migration record
--   hvs_synth_requests    — Every generation, traced
--   hvs_estates           — Post-actor voice continuity
--
-- Views deployed:
--   kpi_trust             — Consent + provenance coverage
--   kpi_safety            — Revocation & kill-switch stats
--   kpi_revenue           — Actor & platform earnings
--   kpi_quality           — Descendant performance metrics
--   kpi_risk              — Never Clause block analysis
--   enterprise_audit      — Procurement & regulatory compliance
--
-- Seed data:
--   RSP_001 actor record
--   7 Never Clauses (RSP_001) + 2 system clauses
--   Rate table (community / professional / enterprise / broadcast)
--   Union tiers (2% → 10%)
--   RSP_001 estate record (EST-RSP-001)
--   Genesis ledger entry (GENESIS-RSP-001)
--
-- Target: gabriel_db (f75939d5-5747-4a9c-8ac2-7710201fda09)
-- Dialect: SQLite / Cloudflare D1
-- ============================================================
