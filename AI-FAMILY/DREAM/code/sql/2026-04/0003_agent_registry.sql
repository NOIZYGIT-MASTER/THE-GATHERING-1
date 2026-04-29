-- ═══════════════════════════════════════════════════════════════════════
-- Migration 0003: Create agent_registry table in agent-memory D1
-- Applied: 2026-04-13
-- Target DB: agent-memory (bc2f9abc-f49d-4818-9bde-8fc647c359e3)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker',
  status TEXT NOT NULL DEFAULT 'active',
  device_target TEXT,
  capabilities TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed the 5 core NOIZY agents
INSERT INTO agent_registry (agent_id, agent_name, role, status, device_target, capabilities) VALUES
  ('GABRIEL', 'Gabriel', 'orchestrator', 'active', 'cloud', 'consent routing, ledger management, agent coordination'),
  ('HEAVEN', 'Heaven', 'gateway', 'active', 'cloudflare-worker', 'API gateway, consent kernel, CORS, routing'),
  ('GORDON', 'Gordon', 'voice-engine', 'active', 'god-local-m2ultra', 'voice synthesis, model inference, STT/TTS'),
  ('SENTINEL', 'Sentinel', 'monitor', 'active', 'cloud', 'health checks, alerting, anomaly detection'),
  ('ARCHIVIST', 'Archivist', 'storage', 'active', 'cloudflare-r2', 'voice print storage, model versioning, backup');
