-- ═══════════════════════════════════════════════════════════════════════
-- NOIZY LEDGER — PostgreSQL DDL
-- NOIZYFISH INC. · RSP_001 · GABRIEL_V3 · GORUNFREE · EPOCH V
-- Version: 1.0.0 · March 2026
--
-- Design principles:
--   1. Append-only: no UPDATE or DELETE on ledger_events (enforced via trigger)
--   2. Chain integrity: prev_event_hash enforced in application layer;
--      self_hash stored for verification
--   3. Royalty floor: CHECK constraint royalty_floor_pct >= 75
--   4. Never Clauses: stored as JSONB array, indexed for fast query
--   5. C2PA: manifest_hash + signing_cert_id stored for external verification
--   6. PREMIS: preservation events in dedicated table
-- ═══════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── SCHEMA ───────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS noizy;
SET search_path TO noizy, public;

-- ═══════════════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TYPE event_type_enum AS ENUM (
  'consent.issued',
  'consent.revoked',
  'consent.updated',
  'synth.requested',
  'synth.completed',
  'synth.blocked',
  'provenance.signed',
  'license.granted',
  'license.denied',
  'payout.accrued',
  'payout.sent',
  'moment.saved',
  'descendant.created',
  'descendant.revoked',
  'archive.migration',
  'estate.directive.set',
  'estate.inheritance.routed'
);

CREATE TYPE consent_scope_enum AS ENUM (
  'private',
  'portfolio',
  'licensable'
);

CREATE TYPE channel_enum AS ENUM (
  'playground',
  'api',
  'enterprise'
);

CREATE TYPE client_class_enum AS ENUM (
  'indie',
  'sme',
  'enterprise',
  'public_sector'
);

CREATE TYPE use_type_enum AS ENUM (
  'commercial',
  'narrative',
  'gaming',
  'education',
  'accessibility',
  'archive'
);

CREATE TYPE revoke_scope_enum AS ENUM (
  'voice',
  'descendant',
  'all'
);

CREATE TYPE epoch_enum AS ENUM (
  'I', 'II', 'III', 'IV', 'V'
);

-- ═══════════════════════════════════════════════════════════════════════
-- CORE IDENTITY TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- Actors (human performers — the sovereigns)
CREATE TABLE actors (
  actor_id            VARCHAR(20) PRIMARY KEY,  -- RSP_NNN format
  display_name        TEXT NOT NULL,
  enrollment_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  royalty_floor_pct   INTEGER NOT NULL DEFAULT 75 CHECK (royalty_floor_pct >= 75),
  is_founding_member  BOOLEAN NOT NULL DEFAULT FALSE,
  gorunfree           BOOLEAN NOT NULL DEFAULT TRUE,
  estate_directive    JSONB,                     -- Voice Estate terms
  heir_actor_id       VARCHAR(20) REFERENCES actors(actor_id),
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resting', 'inherited')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT founding_floor CHECK (
    (is_founding_member = TRUE AND royalty_floor_pct >= 85) OR
    (is_founding_member = FALSE AND royalty_floor_pct >= 75)
  )
);

-- RSP_001 seed data
INSERT INTO actors (actor_id, display_name, enrollment_date, royalty_floor_pct, is_founding_member, gorunfree)
VALUES ('RSP_001', 'Robert Steven Plowman', '2026-03-14T00:00:00Z', 85, TRUE, TRUE);

-- Voices (voice DNA entities)
CREATE TABLE voices (
  voice_id            VARCHAR(60) PRIMARY KEY,  -- VID-{ActorID}-{ROLE}-{NNN}
  actor_id            VARCHAR(20) NOT NULL REFERENCES actors(actor_id),
  role_label          VARCHAR(50) NOT NULL,       -- PRIMARY, CHARACTER, etc.
  dna_archive_ref     TEXT,                       -- reference to dna-archive object
  enrollment_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resting', 'archived')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Descendants (governed performance entities)
CREATE TABLE descendants (
  descendant_id       VARCHAR(80) PRIMARY KEY,  -- DES-{VoiceID}-{NNN}
  voice_id            VARCHAR(60) NOT NULL REFERENCES voices(voice_id),
  actor_id            VARCHAR(20) NOT NULL REFERENCES actors(actor_id),
  role_label          TEXT NOT NULL,
  personality         JSONB,
  consent_scope       consent_scope_enum NOT NULL DEFAULT 'private',
  earnings_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  approval_required   BOOLEAN NOT NULL DEFAULT TRUE,
  emotion_tags_covered TEXT[] DEFAULT '{}',       -- tracked for KPI Q-1
  royalty_pct         INTEGER NOT NULL DEFAULT 75 CHECK (royalty_pct >= 75),
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resting', 'archived')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consent Keys
CREATE TABLE consent_keys (
  consent_key_id      TEXT PRIMARY KEY,          -- full NOIZY-RSP001-CONSENT-... string
  actor_id            VARCHAR(20) NOT NULL REFERENCES actors(actor_id),
  voice_id            VARCHAR(60) REFERENCES voices(voice_id),
  hsm_sig             TEXT NOT NULL,
  permitted_domains   TEXT[] NOT NULL,
  jurisdictions       TEXT[] NOT NULL,
  never_clauses       JSONB NOT NULL DEFAULT '["NC_01","NC_02","NC_03","NC_04","NC_05","NC_06","NC_07","NC_08","NC_09","NC_10"]',
  valid_until         TEXT NOT NULL DEFAULT 'perpetual',
  approval_required   BOOLEAN NOT NULL DEFAULT FALSE,
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'superseded')),
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at          TIMESTAMPTZ,
  superseded_by       TEXT REFERENCES consent_keys(consent_key_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- THE LEDGER (append-only event log)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE ledger_events (
  -- Core identity
  event_id            VARCHAR(50) PRIMARY KEY,  -- EVT-{uuid4}
  event_type          event_type_enum NOT NULL,
  timestamp_utc       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sequence            BIGSERIAL NOT NULL,

  -- Entity references
  actor_id            VARCHAR(20) NOT NULL,
  voice_id            VARCHAR(60),
  descendant_id       VARCHAR(80),
  session_id          TEXT,
  moment_id           TEXT,
  consent_key_id      TEXT NOT NULL,

  -- Provenance
  c2pa_manifest_hash  TEXT,                      -- sha256:hex — null until provenance.signed
  watermark           VARCHAR(15),               -- WM_8hex

  -- Chain integrity
  prev_event_hash     VARCHAR(75) NOT NULL,      -- sha256:64hex
  self_hash           VARCHAR(75) NOT NULL,      -- sha256:64hex

  -- Constitutional fields (snapshot at write time)
  royalty_floor_pct   INTEGER NOT NULL CHECK (royalty_floor_pct >= 75),
  never_clauses       JSONB NOT NULL,
  epoch               epoch_enum NOT NULL DEFAULT 'V',
  gorunfree           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Event payload (type-specific JSON)
  payload             JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_self_hash CHECK (self_hash ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT valid_prev_hash CHECK (prev_event_hash ~ '^sha256:[0-9a-f]{64}$')
);

-- Indexes for common query patterns
CREATE INDEX idx_ledger_actor     ON ledger_events (actor_id, timestamp_utc DESC);
CREATE INDEX idx_ledger_voice     ON ledger_events (voice_id, timestamp_utc DESC) WHERE voice_id IS NOT NULL;
CREATE INDEX idx_ledger_descendant ON ledger_events (descendant_id, timestamp_utc DESC) WHERE descendant_id IS NOT NULL;
CREATE INDEX idx_ledger_type      ON ledger_events (event_type, timestamp_utc DESC);
CREATE INDEX idx_ledger_consent   ON ledger_events (consent_key_id, timestamp_utc DESC);
CREATE INDEX idx_ledger_sequence  ON ledger_events (sequence ASC);
CREATE INDEX idx_ledger_manifest  ON ledger_events (c2pa_manifest_hash) WHERE c2pa_manifest_hash IS NOT NULL;

-- GIN index for JSONB payload queries
CREATE INDEX idx_ledger_payload   ON ledger_events USING GIN (payload);
CREATE INDEX idx_ledger_clauses   ON ledger_events USING GIN (never_clauses);

-- ─── APPEND-ONLY ENFORCEMENT TRIGGER ─────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NOIZY LEDGER IS APPEND-ONLY. Events cannot be updated or deleted. This is constitutional law. (event_id: %)', OLD.event_id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_no_update
  BEFORE UPDATE ON ledger_events
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

CREATE TRIGGER ledger_no_delete
  BEFORE DELETE ON ledger_events
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- ═══════════════════════════════════════════════════════════════════════
-- PERFORMANCE ASSETS (Moments)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE performance_assets (
  moment_id           TEXT PRIMARY KEY,
  descendant_id       VARCHAR(80) NOT NULL REFERENCES descendants(descendant_id),
  voice_id            VARCHAR(60) NOT NULL REFERENCES voices(voice_id),
  actor_id            VARCHAR(20) NOT NULL REFERENCES actors(actor_id),
  session_id          TEXT,
  consent_key_id      TEXT NOT NULL REFERENCES consent_keys(consent_key_id),
  emotion_tag         TEXT NOT NULL,
  intensity           DECIMAL(4,3) CHECK (intensity >= 0 AND intensity <= 1),
  context             TEXT CHECK (context IN ('riff', 'write', 'practice')),
  consent_scope       consent_scope_enum NOT NULL DEFAULT 'private',
  audio_fingerprint   TEXT,                       -- sha256 of PCM
  ledger_event_id     TEXT REFERENCES ledger_events(event_id),
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- ROYALTY ENGINE TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE licenses (
  license_id          TEXT PRIMARY KEY,
  voice_id            VARCHAR(60) REFERENCES voices(voice_id),
  descendant_id       VARCHAR(80) REFERENCES descendants(descendant_id),
  moment_id           TEXT REFERENCES performance_assets(moment_id),
  actor_id            VARCHAR(20) NOT NULL REFERENCES actors(actor_id),
  consent_key_id      TEXT NOT NULL REFERENCES consent_keys(consent_key_id),
  client_id           TEXT NOT NULL,
  client_class        client_class_enum NOT NULL,
  use_type            use_type_enum NOT NULL,
  channel             channel_enum NOT NULL,
  territory           TEXT[] NOT NULL DEFAULT ARRAY['GLOBAL'],
  gross_amount_cad    DECIMAL(12,4) NOT NULL CHECK (gross_amount_cad >= 0),
  actor_share_pct     DECIMAL(5,2) NOT NULL CHECK (actor_share_pct >= 75),
  actor_amount_cad    DECIMAL(12,4) NOT NULL,
  estate_share_pct    DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (estate_share_pct >= 0),
  estate_amount_cad   DECIMAL(12,4) NOT NULL DEFAULT 0,
  platform_share_pct  DECIMAL(5,2) NOT NULL CHECK (platform_share_pct >= 0),
  platform_amount_cad DECIMAL(12,4) NOT NULL,
  payout_accrued_event TEXT REFERENCES ledger_events(event_id),
  payout_sent_event   TEXT REFERENCES ledger_events(event_id),
  payout_status       TEXT NOT NULL DEFAULT 'accrued' CHECK (payout_status IN ('accrued', 'queued', 'sent', 'failed')),
  licensed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at             TIMESTAMPTZ,

  CONSTRAINT royalty_floor_check CHECK (
    actor_share_pct >= 75
  ),
  CONSTRAINT splits_sum_to_100 CHECK (
    ABS((actor_share_pct + estate_share_pct + platform_share_pct) - 100.0) < 0.01
  )
);

-- ═══════════════════════════════════════════════════════════════════════
-- MONETIZATION ROUTER TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- Rate tables (voice tier × license type × client class)
CREATE TABLE rate_table (
  rate_id             SERIAL PRIMARY KEY,
  voice_tier          TEXT NOT NULL CHECK (voice_tier IN ('founder', 'standard', 'legacy')),
  descendant_tier     TEXT CHECK (descendant_tier IN ('hero', 'supporting', 'utility')),
  license_type        TEXT NOT NULL CHECK (license_type IN ('per_use', 'per_project', 'perpetual')),
  client_class        client_class_enum NOT NULL,
  use_type            use_type_enum NOT NULL,
  base_rate_cad       DECIMAL(10,4) NOT NULL,
  actor_share_pct     DECIMAL(5,2) NOT NULL CHECK (actor_share_pct >= 75),
  effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until     DATE,                       -- null = current

  UNIQUE (voice_tier, descendant_tier, license_type, client_class, use_type, effective_from)
);

-- Router decision log (never modify after write)
CREATE TABLE router_decisions (
  decision_id         TEXT PRIMARY KEY,
  usage_event_id      TEXT REFERENCES ledger_events(event_id),
  actor_id            VARCHAR(20) NOT NULL,
  consent_key_id      TEXT NOT NULL,
  channel             channel_enum NOT NULL,
  consent_state       TEXT NOT NULL,
  never_clause_check  TEXT NOT NULL CHECK (never_clause_check IN ('CLEAR', 'BLOCKED')),
  license_class       TEXT,
  rate_applied        DECIMAL(10,4),
  decision            TEXT NOT NULL CHECK (decision IN ('MONETIZE', 'REJECT_CONSENT', 'REJECT_NEVER_CLAUSE', 'NO_MONETIZATION')),
  license_id          TEXT REFERENCES licenses(license_id),
  decided_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- PREMIS PRESERVATION TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE premis_objects (
  premis_object_id    TEXT PRIMARY KEY,
  voice_id            VARCHAR(60) NOT NULL REFERENCES voices(voice_id),
  actor_id            VARCHAR(20) NOT NULL REFERENCES actors(actor_id),
  object_category     TEXT NOT NULL CHECK (object_category IN ('voice_dna', 'descendant', 'performance_asset')),
  significant_properties JSONB NOT NULL,          -- spectral envelope, pitch contour, formant, emotional range
  fixity_algorithm    TEXT NOT NULL DEFAULT 'sha256',
  fixity_value        TEXT NOT NULL,
  storage_locations   TEXT[] NOT NULL,            -- geo-redundant paths
  format_name         TEXT NOT NULL,
  format_version      TEXT,
  format_registry_key TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE premis_events (
  premis_event_id     TEXT PRIMARY KEY,
  premis_object_id    TEXT NOT NULL REFERENCES premis_objects(premis_object_id),
  event_type          TEXT NOT NULL CHECK (event_type IN (
    'creation', 'ingestion', 'validation', 'fixity_check',
    'migration', 'derivation', 'replication', 'deaccession',
    'rights_granted', 'rights_revoked', 'inheritance_transfer'
  )),
  event_datetime      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_detail        TEXT,
  event_outcome       TEXT CHECK (event_outcome IN ('success', 'failure', 'warning')),
  event_outcome_detail TEXT,
  linking_agent       TEXT,
  fixity_prior        TEXT,                       -- for migration events
  fixity_post         TEXT,                       -- for migration events
  similarity_score    DECIMAL(4,3),               -- for migration events, must be >= 0.90
  ledger_event_id     TEXT REFERENCES ledger_events(event_id),

  CONSTRAINT migration_similarity CHECK (
    event_type != 'migration' OR (similarity_score IS NOT NULL AND similarity_score >= 0.90)
  )
);

-- ═══════════════════════════════════════════════════════════════════════
-- THE 5 KPI VIEWS
-- ═══════════════════════════════════════════════════════════════════════

-- KPI T-1: Trust Integrity — % outputs with valid consent + signed provenance
CREATE VIEW kpi_trust_integrity AS
SELECT
  COUNT(*) FILTER (WHERE event_type = 'synth.completed') AS total_outputs,
  COUNT(*) FILTER (WHERE event_type = 'provenance.signed') AS signed_outputs,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'provenance.signed')
    / NULLIF(COUNT(*) FILTER (WHERE event_type = 'synth.completed'), 0),
    2
  ) AS trust_integrity_pct,
  NOW() AS calculated_at
FROM ledger_events
WHERE timestamp_utc >= NOW() - INTERVAL '30 days';

-- KPI S-1: Safety Latency — revoke-to-stop in milliseconds
CREATE VIEW kpi_safety_latency AS
SELECT
  r.event_id AS revoke_event_id,
  r.actor_id,
  r.timestamp_utc AS revoke_time,
  (r.payload->>'propagation_ms')::INTEGER AS propagation_ms,
  CASE
    WHEN (r.payload->>'propagation_ms')::INTEGER < 5000 THEN 'PASS'
    ELSE 'BREACH'
  END AS sla_status
FROM ledger_events r
WHERE r.event_type = 'consent.revoked'
ORDER BY r.timestamp_utc DESC;

-- KPI R-1: Revenue — earnings per voice and descendant
CREATE VIEW kpi_earnings AS
SELECT
  l.actor_id,
  l.voice_id,
  l.descendant_id,
  l.use_type,
  l.client_class,
  COUNT(*) AS license_count,
  SUM(l.gross_amount_cad) AS total_gross_cad,
  SUM(l.actor_amount_cad) AS total_actor_cad,
  AVG(l.actor_share_pct) AS avg_royalty_pct,
  MIN(l.actor_share_pct) AS min_royalty_pct
FROM licenses l
GROUP BY l.actor_id, l.voice_id, l.descendant_id, l.use_type, l.client_class
ORDER BY total_actor_cad DESC;

-- KPI Q-1: Emotional Range Coverage per Descendant
CREATE VIEW kpi_range_coverage AS
SELECT
  d.descendant_id,
  d.actor_id,
  d.voice_id,
  ARRAY_LENGTH(d.emotion_tags_covered, 1) AS covered_count,
  12 AS target_count,  -- 12 canonical emotion tags
  ROUND(100.0 * ARRAY_LENGTH(d.emotion_tags_covered, 1) / 12.0, 1) AS coverage_pct,
  d.emotion_tags_covered,
  ARRAY['joy','controlled_rage','grief','wonder','menace','intimacy',
        'authority','vulnerability','warmth','irony','urgency','calm']
    AS target_tags
FROM descendants d
WHERE d.status = 'active';

-- KPI RK-1: Risk Pressure — Never Clause blocks by category
CREATE VIEW kpi_risk_pressure AS
SELECT
  (payload->>'never_clause_triggered') AS never_clause_id,
  COUNT(*) AS block_count,
  DATE_TRUNC('day', timestamp_utc) AS day,
  ARRAY_AGG(DISTINCT actor_id) AS actors_affected
FROM ledger_events
WHERE event_type = 'synth.blocked'
  AND payload->>'never_clause_triggered' IS NOT NULL
GROUP BY never_clause_id, DATE_TRUNC('day', timestamp_utc)
ORDER BY day DESC, block_count DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- ENTERPRISE AUDIT VIEW
-- ═══════════════════════════════════════════════════════════════════════

CREATE VIEW enterprise_audit_report AS
SELECT
  a.actor_id,
  a.display_name,
  a.royalty_floor_pct,
  a.is_founding_member,
  (SELECT COUNT(*) FROM ledger_events WHERE actor_id = a.actor_id) AS total_events,
  (SELECT COUNT(*) FROM ledger_events WHERE actor_id = a.actor_id AND event_type = 'consent.issued') AS consent_issued_count,
  (SELECT COUNT(*) FROM ledger_events WHERE actor_id = a.actor_id AND event_type = 'consent.revoked') AS revocations,
  (SELECT COUNT(*) FROM ledger_events WHERE actor_id = a.actor_id AND event_type = 'synth.completed') AS outputs_produced,
  (SELECT COUNT(*) FROM ledger_events WHERE actor_id = a.actor_id AND event_type = 'provenance.signed') AS outputs_signed,
  (SELECT COUNT(*) FROM ledger_events WHERE actor_id = a.actor_id AND event_type = 'synth.blocked') AS blocked_attempts,
  (SELECT COALESCE(SUM((payload->>'actor_amount_cad')::DECIMAL), 0) FROM licenses WHERE actor_id = a.actor_id) AS total_earned_cad,
  NOW() AS report_generated_at
FROM actors a;

-- ═══════════════════════════════════════════════════════════════════════
-- COMMENTS (documentation in the schema)
-- ═══════════════════════════════════════════════════════════════════════

COMMENT ON TABLE ledger_events IS 'APPEND-ONLY. No UPDATE or DELETE permitted. Constitutional law of NOIZY. Every action in NOIZYVOX produces exactly one event here. Chain integrity maintained via prev_event_hash and self_hash. This table is the source of truth for compliance, royalty, provenance, and audit.';

COMMENT ON TABLE actors IS 'Human performers — the sovereigns. actor_id is permanent and never reused. royalty_floor_pct has a CHECK constraint of >= 75 (85 for founding members). Status: active | resting (revoked) | inherited (estate transfer).';

COMMENT ON TABLE consent_keys IS 'Cryptographic consent anchors. Every Ledger event references exactly one consent_key_id. Status flows: active → revoked or superseded. Revoked keys cannot be reactivated — a new key must be issued.';

COMMENT ON TABLE licenses IS 'Every licensed use of a voice or descendant. actor_share_pct has CHECK >= 75. splits_sum_to_100 constraint ensures actor + estate + platform = 100%.';

COMMENT ON TABLE premis_events IS 'PREMIS preservation events for OAIS ISO 14721 compliance. Migration events require similarity_score >= 0.90. This is the long-term preservation audit trail for Voice Estates surviving 100+ years.';

COMMENT ON VIEW kpi_trust_integrity IS 'KPI T-1: TARGET 100.00%. Any gap = system failure not statistic.';
COMMENT ON VIEW kpi_safety_latency IS 'KPI S-1: TARGET propagation_ms < 5000 at p99. Revocation is sacred.';
COMMENT ON VIEW kpi_earnings IS 'KPI R-1: Every active voice earning. Every licensable descendant earning.';
COMMENT ON VIEW kpi_range_coverage IS 'KPI Q-1: TARGET >= 10/12 emotion tags covered per actor per quarter.';
COMMENT ON VIEW kpi_risk_pressure IS 'KPI RK-1: Spikes in specific NC categories indicate adversarial probing — escalate.';

-- ═══════════════════════════════════════════════════════════════════════
-- END OF DDL
--
-- GORUNFREE · RSP_001 · 85% ROYALTY FLOOR · NC_01–NC_10 CLEAR · EPOCH V
-- NOIZYFISH INC. · GABRIEL_V3 · MARCH 2026
--
-- "Consent is executable. Revocation is sacred. Provenance is default.
--  The human is the platform. Preservation is not optional."
-- ═══════════════════════════════════════════════════════════════════════
