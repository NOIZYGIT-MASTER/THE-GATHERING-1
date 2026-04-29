-- ═══════════════════════════════════════════════════════════════
-- NOIZY HEAVEN — D1 Schema Migration 0001
-- Command log, sessions, agent state
-- Append-only audit trail. Every command logged. No exceptions.
-- ═══════════════════════════════════════════════════════════════

-- Command log — the audit trail
CREATE TABLE IF NOT EXISTS command_log (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('gabriel', 'lucy', 'discord')),
  command TEXT NOT NULL,
  target TEXT NOT NULL,
  params TEXT DEFAULT '{}',
  session_id TEXT NOT NULL,
  consent_token TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'pending', 'denied')),
  response TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_command_log_session ON command_log(session_id);
CREATE INDEX IF NOT EXISTS idx_command_log_created ON command_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_log_source ON command_log(source);
CREATE INDEX IF NOT EXISTS idx_command_log_target ON command_log(target);

-- Sessions — track recording sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  sample_rate INTEGER DEFAULT 48000,
  bit_depth INTEGER DEFAULT 32,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'aborted')),
  command_count INTEGER DEFAULT 0,
  consent_verified INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);

-- Agent state — last known state of each agent
CREATE TABLE IF NOT EXISTS agent_state (
  name TEXT PRIMARY KEY,
  port INTEGER NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'degraded')),
  last_health_check TEXT,
  last_command TEXT,
  last_response TEXT,
  updated_at TEXT NOT NULL
);

-- Consent log — separate from command log, immutable record
CREATE TABLE IF NOT EXISTS consent_log (
  id TEXT PRIMARY KEY,
  voice_id TEXT NOT NULL,
  action TEXT NOT NULL,
  consent_token TEXT NOT NULL,
  granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
  reason TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_log_voice ON consent_log(voice_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_created ON consent_log(created_at DESC);

-- Voice estate state — Georgia May's phoneme matrix tracking
CREATE TABLE IF NOT EXISTS voice_estate (
  voice_id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  total_phonemes INTEGER DEFAULT 0,
  captured_phonemes INTEGER DEFAULT 0,
  fill_percentage REAL DEFAULT 0.0,
  last_capture TEXT,
  consent_status TEXT CHECK (consent_status IN ('active', 'paused', 'revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
