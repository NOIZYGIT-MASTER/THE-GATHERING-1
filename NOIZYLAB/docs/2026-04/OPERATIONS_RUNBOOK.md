# NOIZY Operations Runbook
## Notion → n8n → GitHub → GABRIEL → Deploy

**The full ops pipeline. Every task starts in Notion, routes through consent, deploys through GABRIEL.**

---

## Pipeline Architecture

```
Notion (Task Created, Status: Active)
  │
  ├──→ n8n Trigger (webhook or polling)
  │      │
  │      ├──→ Parse task: repo, branch, action, consent
  │      │
  │      ├──→ CONSENT GATE (Heaven API)
  │      │      ├── PASS → proceed
  │      │      └── FAIL → GABRIEL speaks "BLOCKED"
  │      │
  │      ├──→ GitHub Actions trigger
  │      │      ├── Push CLAUDE.md + CODEOWNERS
  │      │      ├── Trigger CI (preflight gates)
  │      │      └── Deploy on green
  │      │
  │      └──→ GABRIEL memcell + speak alert
  │
  └──→ Notion: Status → "Deployed" (or "Failed")
```

---

## Workflow: Task Lifecycle

### 1. Task Begins in Notion

| Field | Value |
|---|---|
| **Database** | Creative Briefs / Automation Runs |
| **Status** | `Active` |
| **Brand** | NOIZY.AI / NOIZYVOX / NOIZYFISH / etc. |
| **Assigned** | Agent (GABRIEL, Lucy, Dream, etc.) |

### 2. n8n Listening Event

**Trigger:** Notion webhook or polling (every 60s)

**Actions:**
1. Parse task properties (repo, branch, action)
2. Resolve secrets from n8n credentials store
3. Validate consent via Heaven API
4. Route to appropriate workflow

### 3. GitHub Repositories Update

**Automated by n8n → GitHub API:**
1. Push `CLAUDE.md` updates (if changed)
2. Push `CODEOWNERS` (if changed)
3. Trigger CI workflows (preflight → deploy)
4. Apply branch protection policies

### 4. Deployment by GABRIEL

**Consent verified → Route through all workflows:**
1. Pre-flight gate (73 tests must pass)
2. Proof bundle generated
3. `wrangler deploy` (Cloudflare)
4. Post-deploy smoke tests
5. GABRIEL speaks result
6. Notion status updated → "Deployed" or "Failed"

---

## Error Handling

### Step 1: Check Logs
```
~/NOIZYLAB/logs/                    # Local service logs
~/.pm2/logs/                        # pm2 process logs
/tmp/noizylab-health/               # Health check logs
n8n UI → Execution History          # n8n workflow runs
```

### Step 2: Re-run via n8n
- Open `http://localhost:5678`
- Find failed execution
- Click "Retry" or manually trigger

### Step 3: GABRIEL Diagnostics
```bash
curl http://localhost:7777/health    # GABRIEL status
curl http://localhost:9090/api/status # Full service health
bash ~/NOIZYLAB/scripts/deploy-readiness.sh --quick
```

### Step 4: Escalate
If automated recovery fails:
1. GABRIEL speaks critical alert
2. Notion task → Status: "Failed"
3. Error summary written to Automation Runs
4. Email notification (via Zapier Zap 4)

---

## n8n Workflows (7 total)

| # | Workflow | Trigger | Action |
|---|---|---|---|
| 1 | GitHub Push → GABRIEL | Webhook | Alert + memcell |
| 2 | Stripe Payment → Ledger | Webhook | 75/25 split + Heaven ledger |
| 3 | Voice → DreamChamber | Webhook | Tower auto-detect + Claude |
| 4 | Health Monitor | Cron (5m) | Alert on failure |
| 5 | Events → Notion | Webhook | Log to Notion database |
| 6 | Consent Revoke → Kill Switch | Webhook | Heaven revoke + CRITICAL alert |
| 7 | Notion Task → Deploy | Webhook | Consent gate + deploy |

**Import all:** `~/NOIZYLAB/tools/n8n_workflows/*.json` → n8n Settings → Import

---

## Service Endpoints

| Service | URL | Health |
|---|---|---|
| GABRIEL | localhost:7777 | /health |
| Voice Bridge | localhost:8080 | /health |
| NOIZYVOX | localhost:8421 | /api/v1/health |
| NOIZYSTREAM | localhost:4040 | /health |
| AirPlay | localhost:3001 | /health |
| Health Monitor | localhost:9090 | /health |
| Command Center | localhost:8888 | / |
| n8n | localhost:5678 | /healthz |
| Ollama | localhost:11434 | /api/tags |
| Heaven (edge) | heaven.noizylab.workers.dev | /health |

---

## Quick Commands

```bash
# Full status
bash ~/NOIZYLAB/scripts/empire-status.sh

# Deploy readiness
bash ~/NOIZYLAB/scripts/deploy-readiness.sh

# Run all tests
for d in consent-gateway cb01-router claude-proxy; do
  cd ~/NOIZYLAB/workers/$d && npm test
done

# GABRIEL speak
curl -X POST http://localhost:7777/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "Mission complete."}'
```

---

*Protocol: GORUNFREE. Every task starts in Notion. Every deploy goes through consent. Every result speaks through GABRIEL.*
