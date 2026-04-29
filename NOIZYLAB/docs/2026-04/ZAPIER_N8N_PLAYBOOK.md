# NOIZY Automation Playbook
## Zapier First → n8n Mirror → Sovereign

**Strategy:** Build in Zapier (fast, visual). Mirror to n8n (local, sovereign). Shift gradually.

---

## ZAP 1: GitHub Push → GABRIEL Alert

**What it does:** Every push to NOIZY repos → speaks alert + stores in GABRIEL memcell

**Zapier Setup:**
1. Trigger: **Webhooks by Zapier** → Catch Hook
2. Copy the webhook URL Zapier gives you
3. Go to GitHub repo → Settings → Webhooks → Add webhook
4. Paste the Zapier URL, content type: `application/json`, events: `push`
5. Action 1: **Webhooks by Zapier** → POST to `http://GOD.local:7777/memcell/github:push:{{zap_id}}`
   - Body: `{ "value": { "pusher": "{{pusher_name}}", "commits": {{commits_length}}, "branch": "{{ref}}", "repo": "{{repository_full_name}}" } }`
6. Action 2: **Webhooks by Zapier** → POST to `http://GOD.local:7777/speak`
   - Body: `{ "text": "{{pusher_name}} pushed {{commits_length}} commits to {{ref}}" }`

**n8n Mirror:** `tools/n8n_workflows/01_github_to_gabriel.json` — import at `http://localhost:5678`

---

## ZAP 2: Stripe Payment → Consent Ledger → Creator Notification

**What it does:** Every payment → applies 75/25 Plowman Standard → writes to Heaven ledger → speaks amount

**Zapier Setup:**
1. Trigger: **Stripe** → New Payment Intent Succeeded
2. Action 1: **Code by Zapier** → JavaScript
   ```js
   const amount = inputData.amount / 100;
   output = [{
     amount,
     creator_split: amount * 0.75,
     platform_split: amount * 0.25,
     currency: inputData.currency.toUpperCase()
   }];
   ```
3. Action 2: **Webhooks by Zapier** → POST to `https://heaven.noizylab.workers.dev/api/v1/ledger/append`
   - Headers: `X-NOIZY-Key: {{your_api_key}}`
   - Body: `{ "event_type": "payment.received", "payload_json": "...", "source_system": "STRIPE" }`
4. Action 3: **Webhooks by Zapier** → POST to `http://GOD.local:7777/speak`
   - Body: `{ "text": "Payment received. {{amount}} {{currency}}. Creator gets {{creator_split}}." }`

**n8n Mirror:** `tools/n8n_workflows/02_stripe_to_ledger.json`

---

## ZAP 3: Voice Command → DreamChamber → GABRIEL Response

**What it does:** iPhone voice → Power Automate → Zapier → routes to the right Claude tower

**Zapier Setup:**
1. Trigger: **Webhooks by Zapier** → Catch Hook
2. Power Automate sends to this URL when voice is captured
3. Action 1: **Code by Zapier** → JavaScript (tower detection)
   ```js
   const text = inputData.text.toLowerCase();
   let tower = 'max';
   if (/build|code|deploy/.test(text)) tower = 'code';
   else if (/consent|revoke/.test(text)) tower = 'cb01';
   else if (/vision|future/.test(text)) tower = 'dream';
   output = [{ text: inputData.text, tower }];
   ```
4. Action 2: **Webhooks by Zapier** → POST to `http://GOD.local:8080/claude`
   - Headers: `Authorization: Bearer {{voice_auth_token}}`
   - Body: `{ "text": "{{text}}", "tower": "{{tower}}" }`

**n8n Mirror:** `tools/n8n_workflows/03_voice_to_dreamchamber.json`

---

## ZAP 4: Health Monitor → Alert Pipeline

**What it does:** Every 5 min checks all services → alerts only when something is DOWN

**Zapier Setup:**
1. Trigger: **Schedule by Zapier** → Every 5 Minutes
2. Action 1: **Webhooks by Zapier** → GET `http://GOD.local:9090/api/status`
3. Action 2: **Filter by Zapier** → Only continue if `score` < 100
4. Action 3: **Webhooks by Zapier** → POST to `http://GOD.local:7777/speak`
   - Body: `{ "text": "Health alert. Score {{score}} percent. Services down." }`
5. Action 4 (optional): **Gmail** → Send email to rsp@noizyfish.com

**n8n Mirror:** `tools/n8n_workflows/04_health_monitor_alerts.json`

---

## ZAP 5: GABRIEL Events → Notion Log

**What it does:** Key empire events → logged as pages in Notion database

**Zapier Setup:**
1. Trigger: **Webhooks by Zapier** → Catch Hook
2. Configure Voice Bridge / GABRIEL to POST events to this URL
3. Action 1: **Notion** → Create Database Item
   - Database: NOIZYEMPIRE Command Center (or create "Empire Events" database)
   - Title: `{{event_type}}`
   - Properties: Source, Summary, Severity, Timestamp

**n8n Mirror:** `tools/n8n_workflows/05_notion_sync.json`

---

## ZAP 6: Consent Revoke → Kill Switch → Alert Chain (CRITICAL)

**What it does:** Creator requests revocation → Kill Switch fires → proof logged → GABRIEL CRITICAL alert

**Zapier Setup:**
1. Trigger: **Webhooks by Zapier** → Catch Hook
2. Action 1: **Webhooks by Zapier** → POST to `https://heaven.noizylab.workers.dev/api/v1/consent-tokens/{{consent_id}}/revoke`
   - Headers: `X-NOIZY-Key: {{api_key}}`
   - Body: `{ "reason": "{{reason}}", "requested_by": "{{creator_id}}" }`
3. Action 2: **Webhooks by Zapier** → POST to `http://GOD.local:7777/speak`
   - Body: `{ "text": "CRITICAL. Consent revocation. Creator {{creator_id}}. Kill switch active." }`
4. Action 3: **Notion** → Create page in "Consent Events" database
5. Action 4: **Gmail** → Alert email to rsp@noizyfish.com

**n8n Mirror:** `tools/n8n_workflows/06_consent_revoke_killswitch.json`

---

## Migration Path: Zapier → n8n

| Week | Action |
|---|---|
| 1 | Build Zaps 1-4 in Zapier. Import n8n mirrors. Both running in parallel. |
| 2-3 | Compare outputs. Tune n8n to match. Add Zap 5-6. |
| 4 | Route non-critical traffic to n8n only. Keep Zapier for Stripe + GitHub. |
| 5-6 | Move Stripe + GitHub to n8n. Zapier becomes backup. |
| 7+ | Zapier for external-only integrations (Notion, Gmail). n8n owns the core. |

## n8n Setup (one-time)

```bash
# n8n is already running on GOD:5678
# Open browser: http://localhost:5678
# Create owner account
# Settings → API → Create API Key
# Import workflows: Settings → Import → paste JSON
```

## Architecture

```
iPhone → Power Automate → Zapier (fast lane)
                              ↓
                        Voice Bridge :8080
                              ↓
               DreamChamber (10 towers) :7777
                              ↓
                     Heaven Ledger (edge)
                              ↓
                     Notion (audit log)

     [Parallel n8n mirror on GOD:5678]
```

---

*Protocol: GORUNFREE. Zapier gets you started. n8n makes you sovereign.*
