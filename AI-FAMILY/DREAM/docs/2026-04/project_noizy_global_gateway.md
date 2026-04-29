---
name: NOIZY Global Gateway architecture
description: Full system architecture — 3 surfaces (iPhone Gabriel, iPad Lucy, GOD M2 Ultra), 10 Docker agents on ports 7001-7010, Heaven Cloudflare Worker, Discord parity, CF Tunnel routing
type: project
---

NOIZY Global Gateway architecture locked in 2026-04-12. Three surfaces, ten agents, two deployment layers.

**Surfaces:**
- iPhone → Gabriel (voice command agent, Whisper transcription, sends JSON to Heaven)
- iPad → Lucy (remote control OmniSurface, WebSocket state sync every 500ms, dashboards)
- M2 Ultra GOD → Docker Compose mesh, 9 agent containers + cloudflared tunnel

**10 Agents (Docker on GOD):**
1. Gabriel :7001 — orchestrator, master state machine
2. Lucy :7002 — dashboard server, WebSocket to iPad
3. ENGR Keith :7003 — Logic Pro X transport, OSC control, MC96
4. Georgia May :7004 — voice estate builder, phoneme library, NOIZYVOX
5. Archivist :7005 — session recording, provenance, audit ledger
6. Sentinel :7006 — consent enforcement, Never Clauses, HVS guardian
7. Dispatcher :7007 — Zapier/n8n workflow triggers
8. Scanner :7008 — MICIP audio metrics, noise monitor
9. Deployer :7009 — infrastructure ops, health checks
10. Gemma :7010 — local LLM (Gemma 3 via Ollama)

**Heaven (Cloudflare Worker):**
- TypeScript on Cloudflare edge, routes all commands
- D1 bindings: gabriel_db (68ac0f08), agent-memory (b5b58cc9)
- KV: GABRIEL_VOICE, GABRIEL_KV, FEATURE_FLAGS, GAP_SOLVER
- Discord bot handler — same commands as voice, text parity
- CF Tunnel back to GOD agents
- Consent check via Sentinel before every voice operation (fail closed)

**Cloudflare Account:** Fishmusicinc (2446d788cc4280f5ea22a9948410c355)
**Domain:** noizyfish.ai — AVAILABLE as of 2026-04-12, recommended for registration via CF Registrar
**GitHub:** RSPNOIZY/NOIZYANTHROPIC (private repo)
**Deploy:** `./deploy.sh all` — local Docker + global Heaven in one command

**Why:** Docker on GOD = local-first, zero-latency, full sovereignty. Heaven on Cloudflare = global edge routing, consent logging. Together = bulletproof.

**How to apply:** All future work on the NOIZY infrastructure should reference this architecture. Agent ports are fixed. Command protocol is JSON webhooks through Heaven. Consent is enforced at Sentinel before dispatch.
