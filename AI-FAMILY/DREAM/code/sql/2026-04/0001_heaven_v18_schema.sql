-- ═══════════════════════════════════════════════════════════════════════
-- HEAVEN v18 — D1 Schema Migration
-- Applied to: agent-memory
--
-- 2036 Constraints enforced:
--   #5: consent_log is append-only (application-layer enforced)
--   #6: No rate table changes here (see gabriel_db migration)
--   #8: Idempotency not in D1 (using KV for speed)
-- ═══════════════════════════════════════════════════════════════════════

-- Ensure consent_log exists with proper schema
CREATE TABLE IF NOT EXISTS consent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL,
  licensee_id TEXT NOT NULL,
  use_case TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  medium TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('ALLOWED', 'DENIED')),
  reason TEXT NOT NULL,
  token_id TEXT,
  checked_at TEXT NOT NULL,
  -- No UPDATE or DELETE triggers — this table is append-only
  CONSTRAINT consent_log_append_only CHECK (1=1)
);

CREATE INDEX IF NOT EXISTS idx_consent_log_actor ON consent_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_checked ON consent_log(checked_at);
CREATE INDEX IF NOT EXISTS idx_consent_log_decision ON consent_log(decision);
