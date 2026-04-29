# NOIZY.AI — Master Infrastructure Status Report
### Robert Stephen Plowman | April 10, 2026
### Prepared by Claude (Co-Architect)

---

## 1. MCP CONNECTION AUDIT — FULL RESULTS

### LIVE & WORKING (12 of 13)

| # | Platform | Account / Identity | Status | Notes |
|---|----------|--------------------|--------|-------|
| 1 | **Cloudflare** | Fishmusicinc (ID: 2446d788…) | ✅ LIVE | Workers, D1, KV operational. R2 not yet enabled. |
| 2 | **Gmail** | rspplowman@gmail.com | ✅ LIVE | 75 messages, 71 threads |
| 3 | **Google Calendar** | rspplowman@gmail.com | ✅ LIVE | Primary + NOIZY-AI classroom calendar |
| 4 | **Google Drive** | R.S Plowman (rspplowman@gmail.com) | ✅ LIVE | Full read/search access |
| 5 | **Slack** | Connected | ✅ LIVE | Workspace active |
| 6 | **Notion** | Connected (AI Search) | ✅ LIVE | Semantic + workspace search |
| 7 | **Linear** | NOIZYLAB team | ✅ LIVE | Team ID: 7b7f0fc3… |
| 8 | **Vercel** | Rob Plowman's projects (team_LlTkU8ow…) | ✅ LIVE | Active team |
| 9 | **Atlassian / Confluence** | noizyvox.atlassian.net | ✅ LIVE | Confluence scopes only (no Jira) |
| 10 | **Figma** | NoizyFish (rsplowman@icloud.com) | ✅ LIVE | Fish Music team, Starter plan, View seat |
| 11 | **Hugging Face** | RSPNOIZY | ✅ LIVE | Authenticated |
| 12 | **GoDaddy Domains** | Connected | ✅ LIVE | Domain search + availability check |

### NEEDS ACTION (1)

| # | Platform | Status | Action Required |
|---|----------|--------|-----------------|
| 13 | **Stripe** | ❌ AUTH REQUIRED | Reconnect via Cowork settings — needs re-authentication |

### NEEDS ATTENTION (Non-blocking)

| Issue | Platform | Detail |
|-------|----------|--------|
| R2 not enabled | Cloudflare | 403 error — must activate R2 through Cloudflare Dashboard |
| No Jira scopes | Atlassian | Only Confluence read/write/search. No Jira issue tracking. |
| View-only seat | Figma | Starter plan, View seat — cannot edit designs |

---

## 2. CLOUDFLARE INFRASTRUCTURE — CURRENT STATE

### Existing Resources

| Resource | Name | Status | Details |
|----------|------|--------|---------|
| **Worker** | deploy | Active | Created Dec 2, 2025 |
| **D1 Database** | gabriel_db | Empty | UUID: 68ac0f08…, 0 tables, production |
| **KV Namespace** | GABRIEL_VOICE | Active | ID: 1a172d52… |
| **KV Namespace** | GABRIEL_KV | Active | ID: 61673efa… |
| **R2 Bucket** | — | ❌ NOT ENABLED | Must activate via Dashboard |
| **Hyperdrive** | — | None configured | — |
| **Pages** | — | None deployed | — |
| **Workers AI** | — | Not yet bound | Available via `[ai]` binding |

### Target Architecture (Cloudflare + Claude Code)

The transition moves NOIZY.AI from Vercel-specific tooling to a Cloudflare-native edge stack:

**Workers AI** — Replaces local Wasm for edge-side spectral analysis with managed inference. Zero-latency via `[ai]` binding in `wrangler.toml`, routing to the nearest Cloudflare data center (~30ms globally).

**D1 (gabriel_db → Voice Equity Registry)** — SQL database for artist royalties, usage telemetry, and voice equity tracking. Replaces Firestore, enabling complex JOINs and high-concurrency queries.

**R2 (Voice Vault)** — Object storage for audio buffers, voice prints, and creative assets. Zero egress fees — critical cost advantage for serving large audio files at scale vs. Vercel/S3.

**KV (GABRIEL_VOICE + GABRIEL_KV)** — Already provisioned for fast key-value lookups (session state, config, caching).

**Claude Code Integration** — `.claudecode.json` config enabling the Claude CLI agent to manage deployments, run D1 migrations, and monitor R2 buckets. Entry point: `pnpm run claude`.

---

## 3. GOOGLE ECOSYSTEM — CURRENT STATE

| Service | Account | Status |
|---------|---------|--------|
| Gmail | rspplowman@gmail.com | ✅ Connected |
| Calendar | rspplowman@gmail.com | ✅ Connected |
| Drive | rspplowman@gmail.com | ✅ Connected |
| Google Meet | Via Calendar | ✅ Conference enabled |
| Google Workspace | — | TBD — evaluate business tier |

---

## 4. MICROSOFT ECOSYSTEM — CURRENT STATE

| Service | Status | Notes |
|---------|--------|-------|
| Microsoft 365 | Installed (Excel, Word, PowerPoint, Outlook, Teams, OneNote) | Apps present on machine |
| Azure Portal | PWA installed | Needs business subscription setup |
| Entra Admin Center | PWA installed | Identity management ready |
| Microsoft 365 Copilot | App installed | Needs licensing |

---

## 5. APPLE ECOSYSTEM — CURRENT STATE

| Service | Status | Notes |
|---------|--------|-------|
| iCloud | rsplowman@icloud.com | Primary Apple ID |
| Apple Developer | TBD | Evaluate for app distribution |
| Keynote / Pages / Numbers | Installed | Native productivity suite ready |

---

## 6. CLAUDE MAX — CURRENT STATE

| Capability | Status |
|------------|--------|
| Claude Opus 4.6 | ✅ Active (current model) |
| Cowork Mode | ✅ Active with full MCP toolkit |
| Computer Use | ✅ Available (macOS) |
| Skills System | ✅ 80+ skills loaded |
| Custom Skills | ✅ super-assistant, thenoizyman, wisdom-project, universal-protector-strategy, web-artifacts-builder |
| File Access | ✅ Workspace mounted (CLAUDE TODAY) |
| Sandbox Shell | ✅ Linux sandbox with Python, Node, CLI tools |

---

## 7. IMMEDIATE ACTION ITEMS

### Block 1: Fix & Activate (Today)

1. **Reconnect Stripe** — Re-authenticate in Cowork connector settings
2. **Enable R2** — Activate through Cloudflare Dashboard (requires login)
3. **Add Jira scopes** — Reconnect Atlassian with Jira permissions if needed

### Block 2: Cloudflare Build-Out (Next)

4. **Create D1 Voice Equity Registry schema** — Artists, royalties, usage telemetry tables
5. **Create R2 Voice Vault bucket** — For audio buffers and voice prints
6. **Bind Workers AI** — Add `[ai]` binding to wrangler.toml
7. **Deploy Edge AI Orchestrator** — Spectral analysis worker
8. **Configure Claude Code integration** — .claudecode.json + CLAUDE.md

### Block 3: Platform Setup (Following)

9. **Google Workspace** — Evaluate business tier for noizylab.ca
10. **Microsoft 365** — Configure business subscription
11. **Apple Developer** — Evaluate enrollment

---

*This is a living document. Each block will be built systematically, one at a time.*
