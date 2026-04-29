-- ═══════════════════════════════════════════════════════════════════════
-- HEAVEN v18 — HVS 2036 Constraint Schema Updates
-- Applied to: gabriel_db
--
-- 2036 Constraints enforced:
--   #6: Rate table versioning (effective_from / effective_until)
--   #7: Jurisdiction-aware from day one
--   #9: Public IDs for API-exposed tables
-- ═══════════════════════════════════════════════════════════════════════

-- Constraint #7: Jurisdiction rules table
CREATE TABLE IF NOT EXISTS jurisdiction_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jurisdiction_code TEXT NOT NULL UNIQUE,
  jurisdiction_name TEXT NOT NULL,
  data_handling TEXT NOT NULL DEFAULT 'standard',
  consent_granularity TEXT NOT NULL DEFAULT 'standard',
  retention_max_years INTEGER,
  requires_explicit_consent INTEGER NOT NULL DEFAULT 1,
  gdpr_applicable INTEGER NOT NULL DEFAULT 0,
  ai_act_applicable INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed Canada as first jurisdiction
INSERT OR IGNORE INTO jurisdiction_rules (jurisdiction_code, jurisdiction_name, data_handling, consent_granularity, retention_max_years, requires_explicit_consent, gdpr_applicable, ai_act_applicable, notes)
VALUES ('CA', 'Canada', 'standard', 'standard', 100, 1, 0, 0, 'AIDA (Artificial Intelligence and Data Act) pending. PIPEDA applies.');

-- Constraint #6: Add versioning columns to rate table
-- Check if columns exist first (D1 doesn't support IF NOT EXISTS for ALTER TABLE)
-- These will fail silently if columns already exist
ALTER TABLE hvs_rate_table ADD COLUMN effective_from TEXT DEFAULT '2026-04-06T00:00:00Z';
ALTER TABLE hvs_rate_table ADD COLUMN effective_until TEXT DEFAULT NULL;
ALTER TABLE hvs_rate_table ADD COLUMN version INTEGER DEFAULT 1;

-- Constraint #9: Add public_id columns to API-exposed tables
ALTER TABLE hvs_actors ADD COLUMN public_id TEXT;
ALTER TABLE hvs_consent_tokens ADD COLUMN public_id TEXT;
ALTER TABLE hvs_estates ADD COLUMN public_id TEXT;
ALTER TABLE hvs_licensees ADD COLUMN public_id TEXT;

-- Create indexes for public_id lookups
CREATE INDEX IF NOT EXISTS idx_actors_public_id ON hvs_actors(public_id);
CREATE INDEX IF NOT EXISTS idx_tokens_public_id ON hvs_consent_tokens(public_id);
CREATE INDEX IF NOT EXISTS idx_estates_public_id ON hvs_estates(public_id);

-- Consent token scope needs to support JSON
-- (D1 stores JSON as TEXT — this is fine, parse in application layer)
ALTER TABLE hvs_consent_tokens ADD COLUMN scope TEXT DEFAULT '{}';
ALTER TABLE hvs_consent_tokens ADD COLUMN granted_at TEXT;
ALTER TABLE hvs_consent_tokens ADD COLUMN expires_at TEXT;
ALTER TABLE hvs_consent_tokens ADD COLUMN revoked_at TEXT;
ALTER TABLE hvs_consent_tokens ADD COLUMN status TEXT DEFAULT 'active';
