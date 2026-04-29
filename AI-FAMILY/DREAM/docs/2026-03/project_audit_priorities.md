---
name: NOIZY Empire Audit — Full Findings & Priority Sequence
description: Live audit from 2026-03-28. P0 plaintext secrets in D1. 400+ orphaned tables. MFA unknown everywhere. Stripe still "Fish Music Inc." 52 KV namespaces vs 1 Worker.
type: project
---

Full audit spreadsheet: NOIZY_EMPIRE_AUDIT_2026-03-28.xlsx
Full runbook: NOIZY_EMPIRE_AUDIT_RUNBOOK_2026-03-28.docx
Audit script: noizybeast/scripts/noizy-audit.sh
MFA launcher: noizybeast/scripts/mfa-launcher.applescript

## P0: Plaintext Secrets in D1

The `agent-memory` D1 database (7b813205-fd12-4a23-84a6-ce83bc49ec70) has a `secrets` table with 3 API keys in plaintext:
- GEMINI_API_KEY (2025-12-10)
- M365_COPILOT_URL (2025-12-10)
- GOOGLE_AI_STUDIO_API_KEY (2025-12-13)

**Action:** Rotate keys, DELETE FROM secrets, DROP TABLE secrets. Never store secrets in D1.

## Infrastructure Sprawl

- gabriel_db: 77 tables (expected 8 for v0.3.0)
- agent-memory: 250+ tables, 2.8MB — the "everything" database
- rsp-master-budget: 90+ tables — misnamed, contains genesis AI, mc96 proxy, repair shop, drone_swarm
- Only 1 Worker ("deploy") for 52 KV namespaces and 10 D1 databases
- Stripe still shows "Fish Music Inc." (acct_1S7kf5B1WYNnCLY0)

## 24-Hour Priority Actions (2026-03-28)

1. **Rotate D1 secrets** — Google Cloud Console, then drop secrets table
2. **MFA verification** across all platforms — run mfa-launcher.applescript
3. **Inspect api-token-vault KV** (c453c1b2d5e84a17bf7282cf427f8301) via Wrangler
4. **Inspect CRAWLER_KV** (355f0d9bb3bf46abb1ac49881e6829df) via Wrangler
5. **Stripe rebrand** — "Fish Music Inc." → "NOIZY.AI", rotate keys
6. **Consolidate Slack accounts** — 6 → 1 canonical (rsp@noizy.ai)
7. **Verify gabrielalameida@noizylab.ca** in Notion
8. **Enable R2** on Cloudflare dashboard

**Why:** Live audit discovered plaintext secrets, massive infrastructure sprawl, and zero verified MFA across 20+ accounts.

**How to apply:** Priority #1 changed from MFA to secret rotation after discovering plaintext API keys in D1. Follow the numbered sequence. All items require Rob's manual action on GOD.local or in dashboards.

## 2-Week Automation Sprint
- Deploy n8n on GOD.local (self-hosted, open source, no data leaving network)
- AppleScript for local OS tasks, n8n for network/API tasks — clean boundary
- Workflows: account sync, MFA compliance, key rotation alerts, Slack audit, D1 health, KV scan
