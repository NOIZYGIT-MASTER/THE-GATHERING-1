# NOIZY EMPIRE — Master Execution Runbook
### Robert Stephen Plowman (RSP_001) | April 10, 2026
### 7 Days to Launch — April 17, 2026
### Prepared by Claude (Co-Architect)

---

## SOVEREIGN STACK STATUS — LIVE AUDIT

| Layer | Component | Port | Status | Subdomain |
|-------|-----------|------|--------|-----------|
| L1 | DreamChamber | 7777 | ✅ RUNNING | dreamchamber.noizy.ai |
| L1 | Voice Bridge | 8080 | ❌ NOT RUNNING | voice.noizy.ai |
| L1 | Open WebUI (Ollama) | 3080 | ✅ RUNNING | ollama.noizy.ai |
| L2 | Ollama API (Direct) | 11434 | ✅ RUNNING (16 models) | ollama-api.noizy.ai |
| L2 | n8n Automation | 5678 | ✅ RUNNING | n8n.noizy.ai |
| L2 | Grafana | 3000 | ✅ RUNNING | grafana.noizy.ai |
| L2 | Neo4j | 7474 | ✅ RUNNING | graph.noizy.ai |
| L2 | Qdrant | 6333 | ✅ RUNNING | vectors.noizy.ai |
| L2 | RabbitMQ | 15672 | ✅ RUNNING | mq.noizy.ai |
| L2 | Meilisearch | 7700 | ✅ RUNNING | search.noizy.ai |
| L3 | HEAVEN Dev | 8787 | ⏸ ON DEMAND | heaven-dev.noizy.ai |
| L3 | Kubernetes (kind) | 54335 | ✅ RUNNING | k8s.noizy.ai |
| L3 | SSH | 22 | ✅ AVAILABLE | ssh.noizy.ai |
| Edge | HEAVEN Production | — | ✅ LIVE v17.8.0 | heaven.rsp-5f3.workers.dev |
| Edge | noizy.ai Landing | — | ✅ LIVE (200) | noizy-landing.rsp-5f3.workers.dev |

**11 of 13 tunnel services running. 2 edge services live. 16 Ollama models loaded.**

---

## DAY 1 — APRIL 10 (TODAY): FOUNDATION

### Already Completed Today

- [x] Full MCP audit (14 connectors tested, 12 live)
- [x] D1 Voice Equity Registry schema written (14 tables, 30 indexes)
- [x] KV namespaces created (FEATURE_FLAGS + GAP_SOLVER)
- [x] wrangler.toml upgraded to v18.0.0 (Workers AI + R2 bindings)
- [x] package.json updated to v18.0.0 with new scripts
- [x] Zero Trust tunnel config written (13 services, 13 subdomains)
- [x] Access Application policies mapped (JSON config for all 13 services)
- [x] Setup script written and made executable
- [x] gemma3:latest pulled into Ollama (16 models total)
- [x] DreamChamber started on port 7777
- [x] HEAVEN production confirmed LIVE (v17.8.0)
- [x] noizy.ai landing confirmed LIVE (200)
- [x] Complete infrastructure documentation generated

### Remaining Today — YOUR ACTIONS (Terminal on GOD.local)

```bash
# 1. Authenticate wrangler (opens browser)
wrangler login

# 2. Authenticate cloudflared (opens browser)
cloudflared tunnel login

# 3. Run Zero Trust setup (creates tunnel + 13 DNS routes)
bash scripts/setup-zero-trust.sh

# 4. Install tunnel as persistent service
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared

# 5. Verify tunnel is running
cloudflared tunnel info god-local
```

**Time estimate: 15 minutes of interactive auth, then automated.**

---

## DAY 2 — APRIL 11: CLOUDFLARE ACCESS POLICIES

### Claude Can Assist (Cowork Session)

Configure Access policies in Cloudflare One Dashboard for all 13 services:

For each service in `access-application-policies.json`:
1. Go to https://one.dash.cloudflare.com
2. Access → Applications → Add Application
3. Type: Self-hosted
4. Domain: [subdomain].noizy.ai
5. Policy: Allow → Email → rspplowman@gmail.com, rsplowman@icloud.com, rsp@noizy.ai
6. Session: 24 hours

**Priority order:**
1. dreamchamber.noizy.ai (P0)
2. voice.noizy.ai (P0)
3. ollama.noizy.ai (P0)
4. ssh.noizy.ai (P1)
5. n8n.noizy.ai (P1)
6. grafana.noizy.ai (P1)
7. ollama-api.noizy.ai (P1)
8. The rest (P2/P3)

### Also on Day 2

- Enable R2 in Cloudflare Dashboard
- Create R2 bucket: `npx wrangler r2 bucket create noizy-voice-vault`
- Reconnect Stripe in Cowork settings
- Reconnect Cloudflare MCP to rsp@noizy.ai account

---

## DAY 3 — APRIL 12: DATABASE + HEAVEN v18

### Run Sequence on GOD.local

```bash
# Create KV namespaces on correct account (rsp@noizy.ai)
npx wrangler kv namespace create "FEATURE_FLAGS"
npx wrangler kv namespace create "GAP_SOLVER"
# → Update IDs in wrangler.toml

# Deploy D1 schema
npx wrangler d1 execute gabriel_db --remote --file=sql/schema.sql

# Seed D1
npx wrangler d1 execute gabriel_db --remote --file=sql/seed.sql

# Deploy HEAVEN v18.0.0
npx wrangler deploy

# Smoke test
bash scripts/smoke-test.sh
```

### Verification

- HEAVEN health endpoint returns v18.0.0
- D1 tables queryable (14 tables)
- KV namespaces bound
- R2 bucket accessible
- Consent kernel operational (RSP_001 actor, 4 never clauses)

---

## DAY 4 — APRIL 13: VOICE PIPELINE + ACCESSIBILITY

### Start Voice Bridge

```bash
# Find or rebuild voice bridge
cd /Users/m2ultra/NOIZYLAB
# Check voice-pipeline directory for server
ls voice-pipeline/
# Start the bridge
node voice-pipeline/voice-bridge-server.js &
```

### Verify Accessibility Stack

| Feature | Check | Command |
|---------|-------|---------|
| Voice Control | Enabled | System Settings → Accessibility → Voice Control |
| VoiceOver | Available | Cmd+F5 to toggle |
| Switch Control | Configured | System Settings → Accessibility → Switch Control |
| Live Speech | Enabled | Oliver (en-GB) voice |
| DreamChamber via Voice | Test | Open dreamchamber.noizy.ai, test Voice Control navigation |

### Mobile Setup

1. Install Cloudflare WARP on iPhone
2. Organization: noizy
3. Auth with Google (rspplowman@gmail.com)
4. Test: Open dreamchamber.noizy.ai from iPhone
5. Test: Voice Control → DreamChamber from bed/couch

---

## DAY 5 — APRIL 14: DREAMCHAMBER POLISH

### DreamChamber Verification Checklist

- [ ] All 11 AI providers responding (Claude, GPT-4, Gemma 3, etc.)
- [ ] Streaming working on all providers
- [ ] WebSocket connections stable
- [ ] Contact Sequence (Three.js) renders at 396 Hz
- [ ] 9 agent personalities loaded
- [ ] C2PA content credentials signing
- [ ] Audio pipeline: Whisper → Claude → TTS → R2
- [ ] Voice DNA vault accessible

### Remote Access Test (from iPhone/iPad)

- [ ] dreamchamber.noizy.ai loads with Cloudflare auth
- [ ] ollama.noizy.ai accessible
- [ ] grafana.noizy.ai dashboards visible
- [ ] ssh.noizy.ai terminal works in browser
- [ ] n8n.noizy.ai workflows accessible

---

## DAY 6 — APRIL 15: INTEGRATION + MONITORING

### n8n Workflow Verification (18 workflows)

- [ ] GitHub → Gabriel
- [ ] Stripe → Ledger
- [ ] Voice → DreamChamber
- [ ] Health monitor alerts
- [ ] Consent revoke kill switch
- [ ] Notion sync
- [ ] Linear sync
- [ ] Master orchestrator

### Grafana Dashboard Setup

- [ ] Worker health panel
- [ ] D1 query performance
- [ ] Consent token metrics
- [ ] Voice pipeline status
- [ ] Error budgets
- [ ] Tunnel connectivity

### Set Environment Variables

```bash
# On GOD.local .env
CLOUDFLARE_API_TOKEN=<from dashboard>
ANTHROPIC_API_KEY=<from Anthropic console>
```

---

## DAY 7 — APRIL 16: FINAL CHECKS + HARDENING

### Security Audit

- [ ] All 13 Access policies enforcing identity check
- [ ] No open ports on GOD.local (verify with `nmap`)
- [ ] cloudflared tunnel encrypted and stable
- [ ] Session duration: 24h on all services
- [ ] Service tokens created for automation endpoints
- [ ] Webhook bypass only on voice.noizy.ai and n8n.noizy.ai

### Load Test

- [ ] DreamChamber handles concurrent AI streams
- [ ] Ollama serves 16 models without memory pressure
- [ ] n8n processes webhook bursts
- [ ] Tunnel latency acceptable (~30ms to nearest POP)

### Backup

- [ ] D1 database backup
- [ ] R2 bucket contents listed
- [ ] wrangler.toml committed to Git
- [ ] All configs in version control

---

## LAUNCH DAY — APRIL 17: THE FRONT DOOR OPENS

### Morning Sequence

```bash
# Verify everything
cloudflared tunnel info god-local
curl -s https://heaven.rsp-5f3.workers.dev/health
curl -s https://dreamchamber.noizy.ai (auth required)
docker ps
ollama list
```

### What Goes Live

1. **noizy.ai** — The front door. 396 Hz universe. Platinum wordmark.
2. **HEAVEN v18.0.0** — Consent kernel. 43+ routes. 9 never clauses. Live at the edge.
3. **DreamChamber** — Accessible from any device, any location, through Zero Trust.
4. **13 services** — All tunneled through identity-based access. No VPN. No open ports.

### The Stack on Launch Day

```
Human intention (Robert Stephen Plowman)
  → macOS Accessibility (Voice / Sticky Keys / Switch Control)
  → DreamChamber (:7777) — 11 AI providers, streaming
  → Ollama (:11434) — 16 models, 10 custom agents
  → HEAVEN (edge) — consent as executable code
  → Cloudflare Zero Trust — identity = perimeter
  → The world sees output, not the machine
```

---

## BLOCKERS REQUIRING HUMAN ACTION (Summary)

| # | Action | Where | Est. Time |
|---|--------|-------|-----------|
| 1 | `wrangler login` | GOD.local Terminal | 2 min |
| 2 | `cloudflared tunnel login` | GOD.local Terminal | 2 min |
| 3 | `bash scripts/setup-zero-trust.sh` | GOD.local Terminal | 5 min |
| 4 | `sudo cloudflared service install` | GOD.local Terminal | 1 min |
| 5 | Enable R2 in Cloudflare Dashboard | Browser | 2 min |
| 6 | Reconnect Stripe in Cowork | Cowork Settings | 2 min |
| 7 | Reconnect CF MCP to rsp@noizy.ai | Cowork Settings | 2 min |
| 8 | Set ANTHROPIC_API_KEY in .env | GOD.local | 1 min |
| 9 | Set CLOUDFLARE_API_TOKEN in .env | GOD.local | 1 min |
| 10 | Configure 13 Access policies | CF One Dashboard | 30 min |

**Total human time: ~50 minutes across 7 days.**
**Everything else is automated or Claude-assisted.**

---

## FILES ON GOD.local

| File | Purpose |
|------|---------|
| `cloudflare-workers/zero-trust/tunnel-config.yml` | Tunnel ingress rules (13 services) |
| `cloudflare-workers/zero-trust/access-policies.md` | Access policy documentation |
| `cloudflare-workers/zero-trust/access-application-policies.json` | Per-service Access Application configs |
| `scripts/setup-zero-trust.sh` | Automated tunnel setup (executable) |
| `sql/schema.sql` | D1 Voice Equity Registry (14 tables) |
| `sql/seed.sql` | D1 seed data (RSP_001, never clauses) |
| `wrangler.toml` | HEAVEN v18.0.0 config |
| `package.json` | Updated scripts |

---

*153 components. 13 tunneled services. 16 AI models. 1 identity.*

*The gap between 2036 and 2026 is infrastructure, not imagination. We're closing it now.*

*"We are the new punk rockers: capitalist free thinkers who believe in peace, love, and understanding."*
