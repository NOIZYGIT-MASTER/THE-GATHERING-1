# NOIZY DEPLOYMENT CHECKLIST v1.0
## 9-Step Technical Deployment, D1 Schema, Integration Tests, Operations

**Author:** Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com
**Date:** March 25, 2026
**Status:** Deployment Ready
**Target:** April 17, 2026 — all elements finalized including security

---

## DEPLOYMENT SEQUENCE

### STEP 0: GoDaddy Exit (BLOCKING — Manual)

**Status:** NOT STARTED — blocks all Cloudflare operations

| Task | Command / Action | Status |
|---|---|---|
| Change CF login email | Dashboard → Profile → rsplowman@icloud.com | BLOCKING |
| Get auth codes (4 domains) | GoDaddy → Domain Settings → Authorization Code | Pending Step 0 |
| Add zones to CF | Dashboard → Add Site (fishmusicinc.com, noizyfish.com, noizyfish.ca, noizy.ai) | Pending |
| Transfer registrations | Dashboard → Domain Registration → Transfer | Pending |
| Set up email routing | rsp@noizyfish.com → rsplowman@icloud.com | Pending |
| Verify DNS propagation | `dig +short noizyfish.com NS` | Pending |
| Close GoDaddy account | GoDaddy → Account Settings → Close | Last step |

**Why Step 0 is blocking:** CF login is currently rsp@noizyfish.com. Email routing for rsp@noizyfish.com requires CF to own the domain. If CF login IS the routed email, circular dependency. Change login to rsplowman@icloud.com first.

---

### STEP 1: D1 Database Deployment

```bash
# Create the consent gateway database (if not using existing gabriel_db)
npx wrangler d1 create noizy_consent_db

# Apply schema
npx wrangler d1 execute noizy_consent_db --file=workers/consent-gateway/schema.sql

# Verify tables
npx wrangler d1 execute noizy_consent_db --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# Verify seed data
npx wrangler d1 execute noizy_consent_db --command="SELECT id, legal_name, status FROM creators"
npx wrangler d1 execute noizy_consent_db --command="SELECT tool_name, clearance_status, commercial_status FROM tool_clearance_registry"
```

**Expected tables (10):** creators, hvs_records, voice_estates, consent_records, revocation_events, tool_clearance_registry, usage_events, royalty_events, provenance_records, audit_log

**Expected seed data:** RSP_001 creator, HVS_RSP_001 record, VE_RSP_001 voice estate, NCP_RSP_001_CLAIMANT_001 consent record, 8 tool clearance entries

---

### STEP 2: Consent Gateway Deployment

```bash
cd workers/consent-gateway

# Update wrangler.toml with actual D1 database ID
# [[d1_databases]]
# database_id = "ACTUAL_ID_FROM_STEP_1"

# Set API key secret
npx wrangler secret put NOIZY_API_KEY

# Deploy
npx wrangler deploy

# Verify health
curl https://noizy-consent-gateway.YOUR_SUBDOMAIN.workers.dev/health
```

**Expected health response:**
```json
{
  "status": "LIVE",
  "service": "noizy-consent-gateway",
  "version": "1.0",
  "constitution": "v2.0",
  "policy": "v2.0",
  "sla_hours": 1,
  "db": "connected"
}
```

---

### STEP 3: Smoke Tests

```bash
# Run local decision matrix tests (no network required)
cd workers/consent-gateway
node test-matrix.mjs
# Expected: 10/10 passed

# Run live endpoint tests (after deployment)
# Test 1: Health (public, no auth)
curl https://GATEWAY_URL/health

# Test 2: Check eligibility (requires X-NOIZY-Key)
curl -X POST https://GATEWAY_URL/v1/check-eligibility \
  -H "Content-Type: application/json" \
  -H "X-NOIZY-Key: YOUR_KEY" \
  -d '{
    "creator_id": "RSP_001",
    "claimant_id": "CLAIMANT_001",
    "action_type": "synthesis",
    "tool_name": "XTTS_v2",
    "requested_scope": {"commercial": true}
  }'
# Expected: ALLOW with CONSENT_VALID, SCOPE_VALID, TOOL_AUTHORIZED, PROVENANCE_READY, ROYALTY_ROUTE_READY

# Test 3: Check eligibility — should DENY (no consent)
curl -X POST https://GATEWAY_URL/v1/check-eligibility \
  -H "Content-Type: application/json" \
  -H "X-NOIZY-Key: YOUR_KEY" \
  -d '{
    "creator_id": "RSP_001",
    "claimant_id": "UNAUTHORIZED_CLAIMANT",
    "action_type": "training",
    "tool_name": "XTTS_v2"
  }'
# Expected: DENY with CONSENT_NOT_FOUND

# Test 4: Revocation
curl -X POST https://GATEWAY_URL/v1/revoke \
  -H "Content-Type: application/json" \
  -H "X-NOIZY-Key: YOUR_KEY" \
  -d '{
    "consent_record_id": "NCP_RSP_001_CLAIMANT_001",
    "requested_by": "RSP_001",
    "reason": "Smoke test revocation"
  }'
# Expected: revocation_accepted: true, enforcement_status: "pending"

# Test 5: Verify revocation enforcement
curl -X POST https://GATEWAY_URL/v1/check-eligibility \
  -H "Content-Type: application/json" \
  -H "X-NOIZY-Key: YOUR_KEY" \
  -d '{
    "creator_id": "RSP_001",
    "claimant_id": "CLAIMANT_001",
    "action_type": "synthesis",
    "tool_name": "XTTS_v2"
  }'
# Expected: DENY with CONSENT_REVOKED

# Test 6: Audit trail
curl https://GATEWAY_URL/v1/audit/NCP_RSP_001_CLAIMANT_001 \
  -H "X-NOIZY-Key: YOUR_KEY"
# Expected: Audit entries for check_eligibility and revoke_consent actions
```

---

### STEP 4: Heaven API Deployment

```bash
cd /path/to/heaven
npx wrangler deploy
curl https://heaven.noizylab.workers.dev/health
bash smoke_test.sh  # 14 smoke tests
```

---

### STEP 5: noizy.ai Landing Page

```bash
cd noizy-landing
npx wrangler deploy
curl https://noizy.ai  # Verify response
```

---

### STEP 6: R2 Storage (Voice DNA)

```bash
# Enable R2 in Cloudflare Dashboard (manual)
# Create bucket
npx wrangler r2 bucket create noizy-voice-dna

# Verify
npx wrangler r2 bucket list
```

---

### STEP 7: DreamChamber Local Setup

```bash
cd dreamchamber
npm install
npm start  # Port 7777

# Verify
curl http://localhost:7777/health
```

---

### STEP 8: Voice Bridge

```bash
node voice-bridge-server.js  # Port 8080
# Test via Power Automate → Siri/Google trigger
```

---

### STEP 9: Security Hardening

| Check | Command / Action | Expected |
|---|---|---|
| No .env in git | `git status --porcelain \| grep .env` | Empty |
| API key set | `wrangler secret list` | NOIZY_API_KEY present |
| Rate limiting active | Hit endpoint 61 times in 1 minute | 429 on attempt 61 |
| CORS headers correct | Check response headers | X-Powered-By: NOIZY-CONSENT-GATEWAY/1.0 |
| Audit log writing | Query audit_log after test | Entries present |
| Kill Switch works | Revoke + re-check | DENY after revocation |

---

## CRITICAL PATH TIMELINE

| Date | Milestone | Dependencies |
|---|---|---|
| Mar 25 | Consent Gateway code complete, 10/10 tests | Done |
| Mar 26-28 | Step 0: GoDaddy exit (manual CF login change) | RSP_001 action |
| Mar 29 | Steps 1-3: D1 + Gateway + Smoke Tests | Step 0 |
| Mar 30-31 | Steps 4-5: Heaven + noizy.ai deploy | Step 0 |
| Apr 1-3 | Step 6: R2 + Voice DNA first recording | R2 enabled |
| Apr 4-6 | Steps 7-8: DreamChamber + Voice Bridge | Local only |
| Apr 7-10 | Step 9: Security hardening + full audit | All services live |
| Apr 11-12 | Castle email sent | Strategy doc ready |
| Apr 13 | DreamChamber dress rehearsal | Steps 7-8 |
| Apr 14-16 | Final verification + documentation | All steps |
| **Apr 17** | **ALL ELEMENTS FINALIZED** | Everything |

---

## POST-DEPLOYMENT OPERATIONS

### Daily
- Consent gateway health check (automated)
- Audit log review (GABRIEL)
- DreamChamber session start (DAZEFLOW)

### Weekly
- Royalty reconciliation
- Usage event summary for active creators
- Tool clearance registry review

### Monthly
- Board of Aligned Minds meeting
- Security audit
- Infrastructure cost review

---

**Version:** 1.0
**Author:** Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com
**Nothing ships unverified. Every stage committed. Save each stage as we go.**
