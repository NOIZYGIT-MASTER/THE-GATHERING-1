# MASTER AUDIT — NOIZY.AI / MC96ECO

**Generated:** 2026-04-17
**Audit mode:** grep + sort, no deployments, no writes outside this file
**Scope:** Workspace filesystem, HEAVEN codebase, DNS, Linear (from 2026-04-16 briefing)
**Auditor:** Claude (this session, under hard stop on HEAVEN)

> This document reports **only what was verified from data available to this session** (filesystem, DNS paste, HEAVEN internal state, morning briefing). Claims I could not verify are marked **UNVERIFIED**, not repeated as fact. "Not found" means "not in the mounted workspace folder" — the content may live on GOD's Desktop, Mickey-P, or external drives that this session cannot see.

---

## SECTION 1 — WORKSPACE INVENTORY

Top-level of `/Users/…/CLAUDE TODAY/` — 37 directories, ~7.8 GB, ~25,000 files.

| Folder | Files | Size | Last mod |
|---|---:|---:|---|
| 00-COLLECTED-FOR-NOIZY.AI | 2 | 252K | 2026-04-09 |
| 00_COMMAND_CENTER | 13 | 476K | 2026-04-16 |
| 01_MANIFESTOS | 11 | 188K | 2026-03-23 |
| 02_NOIZYVOX | 27 | 548K | 2026-03-20 |
| 03_DREAMCHAMBER | 6 | 136K | 2026-04-15 |
| 04_NOIZYFISH | 14 | 232K | 2026-03-11 |
| 05_HVS | 7 | 216K | 2026-03-20 |
| 06_BUSINESS | 20 | 804K | 2026-04-09 |
| 07_RESEARCH | 3 | 76K | 2026-03-12 |
| 08_CANADA | 1 | 20K | 2026-03-12 |
| 09_BOOK | 3 | 44K | 2026-03-18 |
| 10_INFRASTRUCTURE | 86 | 832K | 2026-04-16 |
| 11_PROMPTS_AND_TOOLS | 11 | 272K | 2026-04-16 |
| 12_DEMOS_AND_UI | 10 | 296K | 2026-04-17 |
| 13_MEDIA | 14 | 2.9M | 2026-04-12 |
| 14_NOIZYANTHROPIC | 123 | 19M | 2026-04-12 |
| 15_ARCHIVE | 226 | 67M | 2026-04-12 |
| 16.SCREENSHOTS | 6 | 848K | 2026-04-09 |
| CLAUDELOGIC | 6 | 1.6M | 2026-04-14 |
| **NOIZYFISH_THE_AQAURIUM** | **0** | **0** | — |
| RSP-NOIZY | 82 | 436K | 2026-04-15 |
| SCOOBYSNAX | 7 | 88K | 2026-04-13 |
| THE-GATHERING-FILES | 5 | 20K | 2026-04-12 |
| Team Canon | 33 | 208K | 2026-04-13 |
| **_TOSORTOUT** | **1,851** | **7.2G** | 2026-04-14 |
| apps | 4 | 16K | 2026-04-13 |
| cloudflared | 2 | 8K | 2026-04-13 |
| files | 9 | 36K | 2026-04-10 |
| **heaven** (root-level) | 11,931 | **514M** | 2026-04-14 |
| integration-plane | 45 | 304K | 2026-04-13 |
| **landing** | 9,747 | **293M** | 2026-04-14 |
| lucy-stack | 14 | 72K | 2026-04-12 |
| noizy-mcp-remote | 4 | 16K | 2026-04-13 |
| noizy-session-tools | 3 | 12K | 2026-04-13 |
| scripts | 2 | 40K | 2026-04-13 |

**Loose files at root:** 40 files including seven overlapping NOIZY-AI-*.md/.docx audit docs (see §7), two duplicate OpenJDK .pkg installers (137 MB each), Claude.dmg (284 MB), Codex.dmg (194 MB), and multiple morning-briefing files spanning 2026-04-13 → 2026-04-16.

---

## SECTION 2 — CLAIMED FILES (prior Claude sessions) vs. VERIFIED

| Claim (from prior sessions / messages) | Verification | Notes |
|---|---|---|
| `skills/vox/raw/rsp_philosophy_take_04.wav` | **NOT FOUND** | No matching path anywhere in workspace |
| `rsp-guide.mp3` | **NOT FOUND** | Targeted for Dream Chamber audio altar — not in workspace |
| `rsp-ambient.mp3` | **NOT FOUND** | Same — not in workspace |
| `archive/logic_pro/2023/unreleased_drone_09.mp3` | **NOT FOUND** | No `archive/` folder at claimed path |
| `assets/sfx/abandoned_ui_pings.zip` | **NOT FOUND** | No `assets/` folder at claimed path |
| `covenant.json` | **NOT FOUND** | Claimed as canonical metadata file — doesn't exist |
| `dream-chamber.html` (exact filename) | **NOT FOUND** | 03_DREAMCHAMBER contains `NOIZY_AI_DREAMCHAMBER.html`, `NOIZY_DreamChamber_VR.html`, `GABRIEL_MASTER_ARCHITECTURE.html` instead |
| `rsp-guide-original.mp3` (proposed R2 key) | **NOT FOUND** | Cannot register what doesn't exist |
| `THE AQUARIUM` — 34 TB archive of 40 years | **FOLDER EXISTS, EMPTY** | `NOIZYFISH_THE_AQAURIUM/` (note typo: AQAURIUM not AQUARIUM). 0 files. Just `.git` + `.claude` subdirectories |
| Queen of Spades M101–M146 Logic sessions | **NOT FOUND** | Zero matches for `M10*` / `M1[0-4]?*` / `queen*spades*` |
| 02_NOIZYVOX contains audio masters | **NOT FOUND** | 23 .docx + 3 .html + 1 .zip. Zero audio files. It's pure documentation |
| `github.com/rspoisy` canonical repo | **UNVERIFIED** | No way to verify an external GitHub account from this session |

**Audio across the entire workspace:** Zero `.wav` / `.mp3` / `.aif` / `.flac` files outside `node_modules` (and zero inside `_TOSORTOUT` either). The composer's audio archive does not live in this mounted folder. It lives somewhere else — likely GOD's Desktop, Mickey-P, or an external drive — and every prior Claude session that claimed specific audio paths within this workspace was fabricating.

---

## SECTION 3 — TWO HEAVEN CODEBASES (routing conflict on deploy)

Two separate, incompatible HEAVEN projects exist in the workspace:

| Attribute | `/heaven/` (root) | `/10_INFRASTRUCTURE/cloudflare-workers/heaven/` |
|---|---|---|
| Declared version | **18.0.0** | **0.5.0** |
| Worker name | `heaven` | `noizy-ai` |
| Cloudflare account | `5f36aa9795348ea681d0b21910dfc82a` | `2446d788cc4280f5ea22a9948410c355` (Fishmusicinc) |
| Language | TypeScript (`src/index.ts`) | JavaScript (`worker.js`) |
| Framework | Hono 4.4.0 | None |
| Tests | Vitest | Node round-trip harnesses (3 files) |
| D1 binding names | `DB_AGENT`, others | `AGENT_MEMORY`, `CONSENT_DB`, `MANIFEST_DB`, `CATALOGUE_DB` |
| D1 UUIDs | `bc2f9abc-…`, `a31d68e2-…` | `b5b58cc9-…` (matches 2026-04-16 briefing) |
| Authored by | `rsp@noizyfish.com` in package.json | (no author in package.json) |
| Last src edit | 2026-04-13 | 2026-04-17 (this session) |
| Deployed? | UNVERIFIED | NOT DEPLOYED (hard stop honored) |
| Size on disk | 514 MB (54 × node_modules dirs) | small, no node_modules installed |

**Conflict:** Two projects, two Cloudflare accounts, two worker names, two sets of D1 UUIDs. The briefing from 2026-04-16 treats Fishmusicinc (matching `10_INFRASTRUCTURE/…/heaven`) as canonical. The root `/heaven/` appears to be an earlier exploration on a second Cloudflare account — consistent with the account-consolidation task you've mentioned. Root `/heaven/` has been dormant for 4 days while this session shipped v0.2 → v0.3 → v0.4 → v0.5 on the Fishmusicinc path.

**Recommendation (not executed):** after account consolidation and before the first HEAVEN production deploy, declare `10_INFRASTRUCTURE/cloudflare-workers/heaven/` canonical, move root `/heaven/` to `15_ARCHIVE/heaven-v18-typescript-exploration/` to preserve the TypeScript/Hono work without it colliding at deploy time.

---

## SECTION 4 — HEAVEN v0.5.0 STATE (canonical, what this session built)

Location: `10_INFRASTRUCTURE/cloudflare-workers/heaven/`

**Source modules (`src/`):**
- `consent-gate.js` — Never-Clauses, checkConsent, Voice-of-Refusal, consent_events logger
- `verdict-signer.js` — HMAC-SHA256 signer, rotating KV keys, verify helper
- `artifact-gate.js` — R2 key prefix computation with scope-aware sanitizer
- `r2-mediator.js` — dry-run authorize-write
- `r2-writer.js` — streaming PUT with provenance metadata + catalogue insert
- `stream-gate.js` — Cloudflare Stream live inputs (**dormant** until account consolidation)
- `dual-write-bridge.js` — legacy `agent-memory.consent_log` mirror during migration window

**Migrations (`migrations/`):**
- `001_consent_schema.sql` (consent_db + manifest_db + catalogue_db + legacy consent_log stub)
- `002_stream_schema.sql` (catalogue_db.stream_sessions)
- `003_artifacts_schema.sql` (catalogue_db.artifacts)

**Tests (`tests/`):**
- `verdict_roundtrip.mjs` — 9 cases, all green
- `r2_mediator_roundtrip.mjs` — 7 cases, all green
- `r2_writer_roundtrip.mjs` — 10 cases, all green
- `smoke.http` — 41 live-deploy verification requests

**Tools (`tools/`):**
- `register-original-work.sh` — one-command composer registration flow

**Router:** 16 distinct routes, no collisions. Audited in session on 2026-04-17.

**Deploy state:** NOT DEPLOYED. Hard stop honored. Last deploy on Cloudflare is still the 2025-12-02 Hello World stub (per 2026-04-16 briefing).

---

## SECTION 5 — DNS STATE (noizy.ai, from 2026-04-17 user paste)

**Good:** apex A/AAAA proxied through Cloudflare (4 records), Email Routing MX (3 records), modern DKIM (`cf2024-1` selector), SPF softfail (`~all`), `www.noizy.ai` bound to Worker `noizy-landing`.

**Gaps (not yet fixed):**
- No `_dmarc.noizy.ai` TXT record — brand is spoofable
- No CAA records — any CA can issue certs for noizy.ai
- SPF at `~all` (soft) — tighten to `-all` once all senders confirmed

**Routing conflict pending:** `www.noizy.ai` → `noizy-landing` today, but HEAVEN `wrangler.toml` declares routes for both apex AND www pointing at `noizy-ai`. First HEAVEN deploy will collide. Decision needed on shape (apex=HEAVEN + www=landing? both=HEAVEN? etc.).

---

## SECTION 6 — LINEAR STATE (from 2026-04-16 briefing, NOT re-checked this session)

Team NOIZYLAB, 88 total issues.

| Status | Count |
|---|---:|
| ✅ Done | 68 |
| 🟡 Backlog | 16 |
| 🔵 In Progress | 4 |
| 🔴 Overdue | 0 |

**In Progress (as of 2026-04-16):** NOI-77 (Google Business Foundation), NOI-84 (Phase 7 edge bridge), NOI-86 (KV cleanup 53 → ≤10), NOI-79 (Cloud Run mirror).

**Top urgent-and-open touched by HEAVEN v0.5.0 work this session:** NOI-67 (wrangler.toml broken Parallels path — FIXED in src, awaiting deploy), NOI-75 (production build — DONE in src, awaiting deploy).

Linear has not been re-queried this session. Use fresh MCP pull before next stand-up.

---

## SECTION 7 — DOCUMENTATION SPRAWL AT WORKSPACE ROOT

Seven overlapping NOIZY-AI-*.md|.docx docs, all authored 2026-04-13 within a ~10-hour window:

| File | Size | Time |
|---|---:|---|
| NOIZY-AI-COMPLIANCE-AUDIT-20260413.md | 25 KB | 13:08 |
| NOIZY-AI-FULL-ARSENAL-20260413.md | 31 KB | 13:18 |
| NOIZY-AI-MEGA-ARSENAL-20260413.md | 36 KB | 13:38 |
| NOIZY-AI-MASTER-ARCHITECTURE.md | 21 KB | 14:58 |
| NOIZY-AI-GLOBAL-AUDIT-2026-04-13.docx | 23 KB | 22:11 |
| NOIZY-AI-FOUNDATION-ARCHITECTURE-v1.0.docx | 29 KB | 22:20 |
| NOIZY-AI-DAY-0-EXECUTION-RUNBOOK.docx | 20 KB | 22:23 |

Strong signal of multiple Claude sessions generating overlapping territory on the same day. Consolidation into one CANON.md would eliminate the sprawl but requires reading all seven — not done this audit. Flagged as follow-up.

---

## SECTION 8 — OPEN QUESTIONS BLOCKING FORWARD MOTION

| # | Question | Blocking |
|---|---|---|
| 1 | **Layer 1 vs Layer 2 vs Both** — the reliable-Claude-layer question asked 3 messages ago | HEAVEN resume |
| 2 | www.noizy.ai: `noizy-landing` keeps it, or HEAVEN takes it on deploy? | HEAVEN deploy |
| 3 | Which `/heaven/` is canonical — root v18 (TypeScript/Hono) or 10_INFRASTRUCTURE v0.5.0 (JS)? | HEAVEN deploy |
| 4 | Where does the actual audio archive live? (GOD Desktop? Mickey-P? external?) | Voice Layer design, composer onboarding |
| 5 | DMARC + CAA records — produce them now, or later? | Launch readiness |
| 6 | Is the Cloudflare support ticket for account consolidation filed yet? | Stream gate activation, account cleanup |

---

## SECTION 9 — WHAT THIS AUDIT DID **NOT** DO

- **Did not deploy anything** (hard stop honored)
- Did not check Linear live (used 2026-04-16 briefing numbers)
- Did not pull fresh from agent-memory D1 (no MCP calls this turn)
- Did not read the seven overlapping NOIZY-AI-*.md docs (flagged for separate audit)
- Did not verify `github.com/rspoisy` exists (external to this session)
- Did not scan `_TOSORTOUT/` (7.2 GB, 1,851 files — needs its own pass)
- Did not verify what's in root-level `heaven/` vs `landing/` beyond version headers

---

## NEXT STEPS (no action taken — your call)

1. **Answer question #1** (Layer 1 / Layer 2 / Both) — unblocks Claude-layer work
2. **Answer question #2** (www.noizy.ai routing) — unblocks HEAVEN deploy
3. **Confirm question #3** (canonical /heaven/) — unblocks HEAVEN deploy
4. **Decide on §7 consolidation** — want me to read all seven and produce one CANON.md?
5. **Decide on §9 _TOSORTOUT audit** — want a second-pass grep of that folder's 7.2 GB?

---

*Audit ends here. Nothing was deployed, nothing was written outside this file, no fabricated claim was repeated as verified.*
