# MC96 Support AI Architecture
## The GABRIEL Self-Healing Loop

**From building to operating. From coding to commanding.**

*Mickey P sits in the commander's seat. GABRIEL watches the territory.*

---

## The Problem

Right now, when something breaks:
1. Rob notices (or doesn't)
2. Rob pulls logs manually
3. Rob diagnoses
4. Rob writes a fix
5. Rob deploys

**Target state:**
1. GABRIEL detects the failure (telemetry)
2. GABRIEL queries the knowledge base (mc96-docs)
3. GABRIEL drafts a fix (AI triage)
4. GABRIEL notifies Rob (Slack/Discord/CLI)
5. Rob says "APPROVE" — GABRIEL deploys

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEMETRY LAYER                           │
│  Health Monitor (:9090) → pm2 → launchd → Docker → Ollama  │
│  Heaven edge → Workers Logs → n8n webhooks                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ error/alert
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  GABRIEL TRIAGE ENGINE                        │
│                                                               │
│  1. Receive alert (webhook/poll)                             │
│  2. Query mc96-docs vector DB: "Have we seen this?"          │
│  3. Query NOIZYLAB codebase: "What changed recently?"        │
│  4. Route to correct tower:                                  │
│     - Infrastructure → ENGR_KEITH tower (sonnet-4-6)         │
│     - Consent → CB01 tower (sonnet-4-6)                      │
│     - Creative → DREAM tower (opus-4-5)                      │
│     - Strategy → MAX tower (opus-4-6)                        │
│  5. Draft fix (git diff or config change)                    │
│  6. Generate confidence score                                │
│                                                               │
│  LOCAL FIRST: Ollama (llama3.1:70b) for triage               │
│  CLOUD ESCALATE: Anthropic for complex reasoning             │
└──────────────────────┬──────────────────────────────────────┘
                       │ diagnosis + proposed fix
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  NOTIFICATION LAYER                           │
│                                                               │
│  Terminal CLI (Mickey P) ← PRIMARY                           │
│  Slack (#mc96-alerts) ← TEAM                                 │
│  Discord (#noizy-ops) ← COMMUNITY OPS                        │
│  GABRIEL speak (macOS say) ← VOICE                           │
│  Notion (incident page) ← AUDIT                              │
│  Linear (issue) ← TRACKING                                   │
│                                                               │
│  Message format:                                             │
│  "Alert: [SERVICE] [ERROR]. Based on mc96-docs, this is     │
│   [DIAGNOSIS]. Proposed fix: [DIFF]. Confidence: [SCORE].    │
│   Reply APPROVE to deploy."                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ APPROVE / REJECT / INVESTIGATE
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXECUTION LAYER                              │
│                                                               │
│  If APPROVE:                                                 │
│    → git commit + push (via GitKraken CLI)                   │
│    → CI pipeline triggers (preflight gates)                  │
│    → wrangler deploy (if Worker change)                      │
│    → pm2 restart (if local service)                          │
│    → Verify fix (health check)                               │
│    → Update Notion + Linear                                  │
│    → GABRIEL speaks: "Fix deployed. All green."              │
│                                                               │
│  If REJECT:                                                  │
│    → Log rejection reason                                    │
│    → Escalate to manual investigation                        │
│    → Keep monitoring                                         │
│                                                               │
│  If INVESTIGATE:                                             │
│    → Open full diagnostic session                            │
│    → Attach logs, metrics, git blame                         │
│    → Route to DreamChamber for deep analysis                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Knowledge Base: mc96-docs

### Structure:
```
mc96-docs/
├── architecture/
│   ├── services.md          (what each service does, ports, health endpoints)
│   ├── workers.md           (Cloudflare Workers, bindings, routes)
│   ├── databases.md         (D1, KV, their IDs and purposes)
│   └── network.md           (GOD, GABRIEL, DaFixer topology)
├── runbooks/
│   ├── service-restart.md   (how to restart each service)
│   ├── deploy-heaven.md     (Heaven deployment procedure)
│   ├── consent-revoke.md    (Kill Switch procedure)
│   └── incident-response.md (what to do when things break)
├── errors/
│   ├── common-errors.md     (known errors and their fixes)
│   ├── oom-kills.md         (memory issues)
│   └── auth-failures.md     (token/key expiration patterns)
├── sops/
│   ├── morning-routine.md   (daily startup checklist)
│   ├── deploy-checklist.md  (pre-deploy gates)
│   └── weekly-audit.md      (weekly health review)
└── gospel/
    ├── never-clauses.md     (immovable constraints)
    ├── plowman-standard.md  (75/25 rule)
    └── consent-doctrine.md  (consent as executable code)
```

### Vector DB:
- **Local**: ChromaDB on GOD (M2 Ultra has 192GB RAM — plenty)
- **Embedding model**: Ollama gemma3 or sentence-transformers
- **Index**: all mc96-docs markdown files
- **Query**: natural language → relevant runbook/SOP

---

## Prompt Engineering for GABRIEL Triage

### Role + Constraint + Output Framework:

```
You are GABRIEL, the sovereign AI orchestrator of the MC96ECO Universe.
You are receiving an automated alert from the health monitoring system.

ROLE: Senior SRE and consent infrastructure guardian.
CONSTRAINT: 
- Never bypass Never Clauses
- Never deploy without explicit APPROVE from RSP_001
- Always check mc96-docs before proposing a fix
- Prefer local fixes (pm2 restart) over cloud changes (wrangler deploy)
- If confidence < 70%, escalate to INVESTIGATE instead of proposing a fix

CONTEXT:
Service: {service_name}
Error: {error_message}
Logs: {last_20_lines}
Recent changes: {git_log_last_5}
mc96-docs match: {vector_search_result}

OUTPUT:
1. Diagnosis (1-2 sentences)
2. Root cause (with evidence)
3. Proposed fix (exact command or git diff)
4. Confidence score (0-100%)
5. Recommendation: APPROVE / INVESTIGATE / ESCALATE
```

---

## CLI Tool: `mc96` (Mickey P Terminal)

```bash
# Morning briefing
mc96 brief

# Check all services
mc96 status

# Ask GABRIEL a question
mc96 ask "Why is the voice bridge restarting?"

# Review pending fixes
mc96 fixes

# Approve a fix
mc96 approve FIX-001

# Deploy
mc96 deploy heaven
mc96 deploy consent-gateway --env staging

# Incident mode
mc96 incident "NOIZYVOX down"

# Search knowledge base
mc96 docs "how to restart dreamchamber"
```

---

## Implementation Priority

### Phase 1 (This week): Foundation
- [ ] Create mc96-docs repo with architecture + runbooks
- [ ] Install ChromaDB on GOD
- [ ] Build `mc96` CLI tool (Node.js, connects to GABRIEL :7777)
- [ ] Wire Health Monitor alerts → GABRIEL triage

### Phase 2 (Next week): Intelligence
- [ ] Vector-index mc96-docs into ChromaDB
- [ ] Build triage prompt engine with confidence scoring
- [ ] Wire n8n workflow: alert → triage → notification
- [ ] Add git blame and recent changes to triage context

### Phase 3 (Week of April 14): Deployment
- [ ] Wire APPROVE → auto-deploy pipeline
- [ ] Add Slack/Discord notification channels
- [ ] Build incident mode (full diagnostic sessions)
- [ ] Test with intentional failures

### Phase 4 (Post-launch): Learning
- [ ] GABRIEL learns from approved fixes (feedback loop)
- [ ] Auto-generate runbook entries from resolved incidents
- [ ] Confidence scoring improves over time
- [ ] Lucy archives patterns into Echo Moments

---

## The Doctrine

> "The map is not the territory. But a good map, updated in real-time
> by an intelligence that understands the territory, makes the
> commander unstoppable."

GABRIEL watches. GABRIEL diagnoses. GABRIEL proposes.
Rob commands. Rob approves. Rob leads.

**The AI supports. The human decides. The system heals.**

**GORUNFREE.**
