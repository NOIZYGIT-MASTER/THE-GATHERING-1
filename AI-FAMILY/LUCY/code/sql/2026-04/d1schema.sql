-- ============================================================
-- LUCY MESH — D1 SCHEMA v1.0
-- Architect: Robert Stephen Plowman
-- Charter ref: 00-LUCY-MESH-CHARTER.md
-- ============================================================
-- Run remotely:
--   wrangler d1 execute agent-memory-783205 --file=./d1schema.sql --remote
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- SESSIONS: one row per conversational container
-- device_id lets us tell iPad vs iPhone vs M2 Ultra apart.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    session_id  TEXT PRIMARY KEY,
    device_id   TEXT NOT NULL,
    start_time  DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    status      TEXT DEFAULT 'active'   -- 'active' | 'paused' | 'closed'
);

CREATE INDEX IF NOT EXISTS idx_sessions_device
    ON sessions (device_id, last_active DESC);

-- ------------------------------------------------------------
-- MESSAGES: full conversation log. Source of truth for memory.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_id   TEXT,                     -- which mesh node authored (nullable for user)
    role       TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content    TEXT NOT NULL,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Fast "last N messages in this session" lookups for Claude context window.
CREATE INDEX IF NOT EXISTS idx_messages_session_time
    ON messages (session_id, timestamp DESC);

-- ------------------------------------------------------------
-- DEVICE_STATUS: heartbeat table for the mesh panel.
-- last_ping is updated by every POST /api/ping from an agent.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_status (
    agent_id     TEXT PRIMARY KEY,
    surface      TEXT,                   -- 'iphone' | 'ipad' | 'm2ultra' | 'any'
    status       TEXT NOT NULL DEFAULT 'idle',  -- 'idle' | 'working' | 'offline'
    current_task TEXT,
    last_ping    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Seed the initial mesh. Surfaces reflect the charter.
-- ON CONFLICT DO NOTHING preserves live state across re-runs.
-- ------------------------------------------------------------
INSERT INTO device_status (agent_id, surface, status, current_task) VALUES
    ('Gabriel', 'iphone',  'idle', 'voice capture standby'),
    ('Shell',   'm2ultra', 'idle', 'build/deploy standby'),
    ('Keith',   'ipad',    'idle', 'codegen coordinator standby'),
    ('Dream',   'ipad',    'idle', 'creative partner standby'),
    ('Pops',    'any',     'idle', 'guardian standby')
ON CONFLICT(agent_id) DO NOTHING;

-- ------------------------------------------------------------
-- EVENTS (optional, Phase 2+): audit log of consequential actions.
-- Everything that touches money, identity, or external systems
-- should write a row here for after-the-fact review.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    event_id   TEXT PRIMARY KEY,
    session_id TEXT,
    agent_id   TEXT,
    kind       TEXT NOT NULL,            -- 'deploy' | 'secret_rotate' | 'purchase' | ...
    payload    TEXT,                     -- JSON blob
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_time
    ON events (timestamp DESC);

-- ============================================================
-- END SCHEMA
-- ============================================================
