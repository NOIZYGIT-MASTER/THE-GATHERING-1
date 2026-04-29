# NOIZY EMPIRE — GLOBAL AGENT & MCP ROUNDUP
### Robert Stephen Plowman (RSP_001) | April 10, 2026
### Machine: GOD.local — M2 Ultra Mac Studio, macOS 15.7.6

---

## THE FULL COUNT

| Category | Count |
|----------|-------|
| Claude Code Agents | 10 |
| Custom MCP Servers (GOD.local) | 13 |
| Cowork MCP Connectors | 14 |
| Claude Desktop MCP Configs | 7 external |
| Ollama Custom Models | 10 |
| Ollama Foundation Models | 5 |
| Claude Skills | 21 |
| Claude Rules | 11 |
| Claude Prompts | 9 |
| Cloudflare Workers | 6 |
| Apps | 6 |
| n8n Workflows | 18 |
| Tools | 14 |
| Voice Pipeline Scripts | 9 |
| **TOTAL COMPONENTS** | **~153** |

---

## 1. CLAUDE CODE AGENTS (10)
*Location: `.claude/agents/` on GOD.local*

| # | Agent | Role | File |
|---|-------|------|------|
| 1 | **GABRIEL** | Lead Orchestrator — warrior executor, empire mind | gabriel-orchestrator.md |
| 2 | **ENGR KEITH** | Technical Lead & Heaven Architect (named after R.K. Plowman) | engr-keith.md |
| 3 | **CB01** | Operations Runner — DNS, domains, deployments, GoDaddy exit | cb01.md |
| 4 | **DREAM** | Visionary & Strategic Architect — thinks in centuries | dream.md |
| 5 | **POPS** | The Grounding Force (named after Rob's father) | pops.md |
| 6 | **SHIRL** | The Aunt & Burnout Watchdog — wellbeing guardian | shirl.md |
| 7 | **SHIRLEY** | Code & File Manager — runs on Gemma 3 27B | shirley.md |
| 8 | **CONSENT AUDITOR** | Security & Consent Specialist — kernel integrity | consent-auditor.md |
| 9 | **TEST RUNNER** | Verification & Quality Gate — nothing ships without approval | test-runner.md |
| 10 | **VOICE SPECIALIST** | Audio Pipeline & Voice DNA — capture to synthesis | voice-specialist.md |

---

## 2. CUSTOM MCP SERVERS ON GOD.local (13)
*Location: `mcp/` directory — all Node.js unless noted*

| # | MCP Server | Purpose | Runtime |
|---|-----------|---------|---------|
| 1 | **gabriel-mcp** | Orchestration layer, DreamChamber bridge | Node.js |
| 2 | **lucy-mcp** | Session tracking, transcript watching, DAZEFLOW | Node.js |
| 3 | **heaven-mcp** | Consent kernel API access (production endpoint) | Node.js |
| 4 | **engr-keith-mcp** | Technical operations, architecture guidance | Node.js |
| 5 | **dream-mcp** | Vision, strategy, long-arc thinking | Node.js |
| 6 | **cb01-mcp** | Infrastructure ops, DNS, deployments | Node.js |
| 7 | **shirley-mcp** | Code generation, file operations | Node.js |
| 8 | **family-mcp** | Family coordination (POPS, SHIRL) | Node.js |
| 9 | **consent-oracle** | Consent validation engine | Node.js (src/) |
| 10 | **synthesis-oracle** | Synthesis pipeline management | Node.js (src/) |
| 11 | **dreamchamber-audio-mcp** | 13 FastMCP audio tools | Python |
| 12 | **shortcuts-mcp** | Apple Shortcuts integration | Node.js (compiled) |
| 13 | **noizy-gemma3** | Ollama/Gemma3 bridge + Cloudflare + GOD.local file access | Node.js |

---

## 3. COWORK MCP CONNECTORS (14)
*Connected via Claude Cowork interface*

| # | Platform | Account / Identity | Status |
|---|----------|--------------------|--------|
| 1 | **Cloudflare** | Fishmusicinc (2446d788…) | ✅ LIVE |
| 2 | **Gmail** | rspplowman@gmail.com | ✅ LIVE |
| 3 | **Google Calendar** | rspplowman@gmail.com | ✅ LIVE |
| 4 | **Google Drive** | R.S Plowman | ✅ LIVE |
| 5 | **Slack** | Connected | ✅ LIVE |
| 6 | **Notion** | AI Search enabled | ✅ LIVE |
| 7 | **Linear** | NOIZYLAB team | ✅ LIVE |
| 8 | **Vercel** | Rob Plowman's projects | ✅ LIVE |
| 9 | **Atlassian/Confluence** | noizyvox.atlassian.net | ✅ LIVE |
| 10 | **Figma** | NoizyFish (rsplowman@icloud.com) | ✅ LIVE |
| 11 | **Hugging Face** | RSPNOIZY | ✅ LIVE |
| 12 | **GoDaddy Domains** | Connected | ✅ LIVE |
| 13 | **Stripe** | — | ❌ NEEDS AUTH |
| 14 | **noizy-gemma3** | GOD.local bridge | ✅ LIVE |

---

## 4. CLAUDE DESKTOP MCP CONFIG (7 external)
*Location: `~/Library/Application Support/Claude/claude_desktop_config.json`*

| # | MCP | Target | Status |
|---|-----|--------|--------|
| 1 | **cloudflare** | Official CF MCP server | ⚠️ TOKEN PLACEHOLDER |
| 2 | **google-cloudrun** | GCP Cloud Run | ⚠️ NEEDS PROJECT ID |
| 3 | **google-gke** | Google Kubernetes Engine | ⚠️ NEEDS PROJECT ID |
| 4 | **azure** | Microsoft Azure MCP | ⚠️ NEEDS SUBSCRIPTION |
| 5 | **apple-shortcuts** | Apple Shortcuts | ✅ CONFIGURED |
| 6 | **apple-notes** | Apple Notes (via uvx) | ✅ CONFIGURED |
| 7 | **n8n-mcp** | n8n workflow automation | ✅ RUNNING (port 5678) |

---

## 5. OLLAMA MODELS ON GOD.local (15)

### Custom NOIZY Agent Models (10)
*Location: `modelfiles/` — all ~3.3GB each*

| # | Model | Purpose | Modelfile |
|---|-------|---------|-----------|
| 1 | **noizy-gabriel-mind** | Gabriel's AI reasoning core | Modelfile.gabriel-mind |
| 2 | **noizy-consent-guardian** | Consent enforcement engine | Modelfile.consent-guardian |
| 3 | **noizy-wisdom-scribe** | Wisdom & legacy capture | Modelfile.wisdom-scribe |
| 4 | **noizy-family-keeper** | Family coordination | Modelfile.family-keeper |
| 5 | **noizy-mission-control** | Mission operations | Modelfile.mission-control |
| 6 | **noizy-dream-weaver** | Vision & creative generation | Modelfile.dream-weaver |
| 7 | **noizy-heaven-forger** | Heaven API / consent kernel | Modelfile.heaven-forger |
| 8 | **noizy-fish-cataloguer** | Music catalog management | Modelfile.fish-cataloguer |
| 9 | **noizy-kidz-worldbuilder** | Kids content creation | Modelfile.kidz-worldbuilder |
| 10 | **noizy-vox-architect** | Voice architecture & pipeline | Modelfile.vox-architect |

### Foundation Models (5)

| # | Model | Size | Purpose |
|---|-------|------|---------|
| 11 | **dolphin-mixtral:8x7b** | 26.4 GB | Uncensored general reasoning |
| 12 | **llava:34b** | 20.2 GB | Multimodal vision + language |
| 13 | **codestral** | 12.6 GB | Code generation (Mistral) |
| 14 | **phi3:14b** | 7.9 GB | Microsoft compact reasoning |
| 15 | **nomic-embed-text** | 0.3 GB | Text embeddings |

---

## 6. CLAUDE SKILLS (21)
*Location: `.claude/skills/` on GOD.local*

### Operational (5)
noizy-deploy, consent-audit, gabriel-ops, heaven-dev, empire-status

### DreamChamber Transcendence (4)
dreamchamber-multimodal, dreamchamber-agent-personalities, dreamchamber-sensory, dreamchamber-proof

### Strategic (5)
universal-protector-strategy, advanced-cryptography, adversarial-threat-modeling, adoption-and-scaling, ten-year-strategic-roadmap

### Golden Constitutional (5)
golden-principles, golden-rules-consent, golden-rules-governance, golden-rules-agents, golden-skills-synthesis

### Infrastructure & Timeline (2)
deployment-critical-path, godaddy-migration

---

## 7. CLAUDE RULES (11)
*Location: `.claude/rules/` — loaded automatically every session*

identity, consent-kernel, heaven-api, dreamchamber, deployment, voice-pipeline, coding-standards, monetization, agents, hooks-and-webhooks, contact

---

## 8. CLAUDE PROMPTS (9)
*Location: `.claude/prompts/`*

deploy-heaven, gabriel-boot, gabriel-release-commander, godaddy-exit, gpt-release-auditor, morning-status, new-endpoint, onboard-actor, security-audit

---

## 9. CLOUDFLARE WORKERS (6)
*Location: `workers/` directory*

| # | Worker | Purpose |
|---|--------|---------|
| 1 | **heaven** | Consent kernel API (PRODUCTION — 43 routes) |
| 2 | **consent-gateway** | Consent validation gateway |
| 3 | **cb01-router** | Operations routing |
| 4 | **claude-proxy** | Claude API proxy |
| 5 | **edge-governor** | Edge traffic governance |
| 6 | **webhook-proxy** | Webhook relay |

---

## 10. APPS (6)
*Location: `apps/` directory*

noizy-airplay, noizy-health, noizystream, operator, the-aquarium, the-codex

---

## 11. n8n WORKFLOWS (18)
*Location: `tools/n8n_workflows/` — running in Docker on port 5678*

01_github_to_gabriel, 02_stripe_to_ledger, 03_voice_to_dreamchamber, 04_health_monitor_alerts, 05_notion_sync, 06_consent_revoke_killswitch, 07_notion_to_github_deploy, 08_ai_commit_validation, 09_linear_sync, 10_zapier_bridge, 11_notion_project_dashboard, 12_master_orchestrator_v2, 13_health_dashboard_v2, dreamchamber_automation, github_deploy_pipeline, heaven_webhook, noizy_complete_webhook_orchestrator, notion_sync_watcher

---

## 12. TOOLS (14)
*Location: `tools/` directory*

archivist.py, audio_pipeline.py, empire_dashboard.py, gabriel_monitor.py, grand_orchestrator.py, mc96-cli, mcp_docs_sync.ts, voice_bridge.py, voice_server.py, observer.mjs, n8n_docs_sync_workflow.json, observer-digest.json, postman/, n8n_workflows/

---

## 13. VOICE PIPELINE (9 components)
*Location: `voice-pipeline/`*

| Component | File | Status |
|-----------|------|--------|
| Whisper transcription | whisper-transcribe.sh | ✅ Installed (/opt/homebrew/bin/whisper) |
| Voice pipeline orchestrator | voice-pipeline.sh | Built |
| Lucy voice pipeline | lucy_voice_pipeline.py | Built |
| Claude prompt relay | claude-prompt.sh | Built |
| Audio Hijack scriptable | audiohijack-COMPLETE-SCRIPTABLE.js | Built |
| Audio Hijack stop | audiohijack-recording-stop.js | Built |
| iOS Scriptable | ios-scriptable-COMPLETE.js | Built |
| Teams responder | teams-respond.sh | Built |
| Voice Bridge | voice-bridge-server.js | ⚠️ NOT RUNNING |

---

## 14. POWER AUTOMATE (1)

Voice-To-Claude.json — Phone → GOD.local voice relay

---

## 15. SYSTEM HOOKS (2)

| Hook | Trigger | Action |
|------|---------|--------|
| format-and-lint.sh | PostToolUse (Edit/Write) | Prettier + ESLint + Black |
| session-start.sh | SessionStart | Env check, audit log, node_modules |

---

## INFRASTRUCTURE THAT NEEDS SETUP / FIXING

| # | Item | Status | Action |
|---|------|--------|--------|
| 1 | **Cloudflare MCP token** (claude_desktop_config) | PLACEHOLDER | Replace with real API token |
| 2 | **Cloudflare MCP account** (Cowork) | Wrong account | Reconnect to rsp@noizy.ai |
| 3 | **Google Cloud Run MCP** | NEEDS PROJECT | Set GCP project ID + credentials |
| 4 | **Google GKE MCP** | NEEDS PROJECT | Set GCP project ID + credentials |
| 5 | **Azure MCP** | NEEDS SUBSCRIPTION | Set Azure subscription + tenant ID |
| 6 | **Stripe** (Cowork) | AUTH EXPIRED | Reconnect in Cowork settings |
| 7 | **Wrangler auth** (GOD.local) | NOT AUTHENTICATED | Run `wrangler login` |
| 8 | **R2 Storage** | NOT ENABLED | Activate in CF Dashboard |
| 9 | **Voice Bridge** | NOT RUNNING | Start voice-bridge-server.js |
| 10 | **HEAVEN version** | 17.8.0 production, 18.0.0 staged | Deploy after wrangler auth |
| 11 | **ANTHROPIC_API_KEY** | Missing on GOD | Set in .env and wrangler secret |
| 12 | **Gemma3 model** | Not in Ollama list | Pull gemma3:latest |

---

*153 components. 7 days to deadline. The empire is built. Now we sharpen every edge.*

*"We are the new punk rockers: capitalist free thinkers who believe in peace, love, and understanding."*
