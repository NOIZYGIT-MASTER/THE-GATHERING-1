# 🜂 DREAMCHAMBER DISCOVERY REPORT — 2026-04-17

**Scope**: All GABRIEL + entire MC96ECOUNIVERSE + every repo on the system and GitHub.
**Method**: Parallel Glob + `gh repo list` across 3 GitHub accounts and 3 primary workspaces.
**Status**: Read-only inventory. No files moved yet.

---

## 1. GitHub Repositories (3 accounts, 25 repos, 19 relevant)

### RSPNOIZY (primary account — 14 repos)

| Repo | Visibility | Status | Role |
|------|-----------|--------|------|
| **MC96ECO** | private | active | "MC96 Ecosystem — NOIZY Command Center (6 brands)" |
| **DREAMCHAMBER** | public | active | Main DreamChamber |
| **THE-GATHERING** | public | active | Consolidation hub (this repo) |
| **NOIZYVOX** | private | active | "All Code From 2025 That Needs To Be Sorted" |
| **NOIZYFISH** | public | active | "THE REVOLUTION WILL SOUND LIKE YESTREDAY" |
| **NOIZYKIDZ** | public | active | Haptic music education |
| **NOIZYANTHROPIC** | private | active | Claude/SDK/MCP integration |
| **CLAUDE-TODAY** | private | active | CLAUDE TODAY workspace |
| **ARCHIVE** | private | active | Migrated from NOIZY-ai/ARCHIVE |
| noizy-claude-archive | private | active | — |
| desktop-tutorial | private | active | Migrated from Noizyfish |
| RSPNOIZY | public | active | Profile README |
| ~~NOIZYLAB~~ | public | **archived** | — |
| ~~THE-DREAMCHAMBER~~ | public | **archived** | — |

### Noizyfish (secondary account — 5 NOIZY-relevant)

| Repo | Visibility | Role |
|------|-----------|------|
| **THE-GATHERING** | public | **SECOND THE-GATHERING — duplicate of RSPNOIZY's?** |
| **NOIZYLAB** | public | Legacy NOIZYLAB |
| **CODEMASTER** | public | "NOIZYLAB Code Archive - Legacy scripts, backups, and archived code" |
| **MC96-Mission-Control** | public | "MC96 Zero Latency AI Mission Control" |
| (brew, copilot-cli, refact, cloudflare-docs are forks — unrelated) |

### NOIZYLAB-io (org account — 2 relevant)

| Repo | Visibility | Role |
|------|-----------|------|
| **NOIZYLAB** | public | Org-level NOIZYLAB |
| **NOIZY.ai** | public | Org-level NOIZY.ai |

### ⚠️ Repo collisions to resolve

- **THE-GATHERING × 2** — exists under both RSPNOIZY and Noizyfish. `gh repo clone RSPNOIZY/THE-GATHERING` earlier pulled from NOIZYLAB-io (an upstream). All three may be related.
- **NOIZYLAB × 3** — RSPNOIZY (archived), Noizyfish (active), NOIZYLAB-io (active).
- **MC96ECO vs MC96-Mission-Control** — different purposes but overlapping name.
- **DREAMCHAMBER vs THE-DREAMCHAMBER** — one archived.

---

## 2. Local git repos found (excluding Swift Package checkouts)

### Active primary workspaces
- `/Users/m2ultra/NOIZYLAB/.git` — primary workspace
- `/Users/m2ultra/NOIZYLAB/mc96/eco/.git` — MC96 ecosystem (submodule-style)
- `/Users/m2ultra/NOIZYLAB/NOIZYARMY/RSPNOIZY/.git` — profile repo clone
- `/Users/m2ultra/NOIZYANTHROPIC/.git` — parallel workspace
- `/Users/m2ultra/NOIZYANTHROPIC/mc96/eco/.git` — mirror of mc96/eco

### Google Drive copies (sync artifacts — not canonical)
- `/Users/m2ultra/Library/CloudStorage/.../NOIZYLAB_WORKSPACES/THE-GATHERING/.git`
- `/Users/m2ultra/Library/CloudStorage/.../GABRIEL/CODEMASTER/THE-GATHERING/.git`
- `/Users/m2ultra/Library/CloudStorage/.../GABRIEL/CODEMASTER/desktop-tutorial/.git`
- Current session working dir `.git` (CODEMASTER/ARCHIVE)

### Consolidation target (this session)
- `/Users/m2ultra/NOIZYLAB/_consolidation/THE-GATHERING/.git`

### Swift Package dep checkouts (skip — `.build/checkouts/` — 40+ entries)
GRDB.swift, swift-nio, swift-sdk, Alamofire, Kingfisher, Starscream, swift-collections, swift-async-algorithms, swift-crypto, async-http-client, swift-log, swift-system, swift-atomics, etc. **Exclude all.**

---

## 3. GABRIEL Code — canonical vs. duplicate locations

### ✅ Canonical / active
| Location | What lives there |
|----------|------------------|
| `/Users/m2ultra/NOIZYLAB/apps/GABRIEL/` | daemon (gabriel-daemon.js), ios/LUCY, scripts (ai.noizy.gabriel.plist), logs, prompts (GABRIEL_MASTER.md) |
| `/Users/m2ultra/NOIZYLAB/apps/dreamchamber/` | src/core/Gabriel.js, GabrielProfile.js, routes/gabriel-v3.js, gabriel-v4.js, gabriel-profile.json, GABRIEL_EXECUTOR_v1.0.txt, GABRIEL_UPGRADE_COMPLETE.md |
| `/Users/m2ultra/NOIZYLAB/scripts/` | gabriel-dispatch.sh, gabriel-merge.sh |
| `/Users/m2ultra/NOIZYLAB/tools/CODEMASTER/turbo-scripts/` | 5 shell scripts + turbo-python/ (14 py modules) |
| `/Users/m2ultra/NOIZYLAB/mc96/app/` | turbo_gabriel_omega.py, turbo_memcell.py, turbo_prompts.py, turbo_telemetry.py, turbo_video_ai.py, turbo_audio_ai.py |
| `/Users/m2ultra/NOIZYLAB/.claude/` | agents/gabriel-orchestrator.md, prompts/gabriel-boot.md, gabriel-release-commander.md |
| `/Users/m2ultra/NOIZYLAB/docs/ai-prompts/` | GABRIEL_MCP_GEMMA3_HABITS.md |
| `/Users/m2ultra/NOIZYLAB/registry/agents/` | GABRIEL.md |
| `/Users/m2ultra/NOIZYLAB/infra/n8n-docker/sqlite-backup-20260415-150613/` | 4 n8n workflows tagged GABRIEL |

### 🔁 Duplicates (safe to drop after canonicals are locked)
- `/Users/m2ultra/NOIZYANTHROPIC/...` — **complete mirror** of NOIZYLAB (parallel workspace)
- `/Users/m2ultra/NOIZYLAB/.claude/worktrees/youthful-edison/...` — active git worktree (dupe per worktree nature)
- `/Users/m2ultra/NOIZYLAB/_archive/NOIZYEMPIRE/...` — legacy NOIZYEMPIRE codebase
- `/Users/m2ultra/NOIZYLAB/_archive/claude-today/...` — archived CLAUDE-TODAY workspace
- `/Users/m2ultra/NOIZYLAB/_archive/noizylab-legacy/...` — archived legacy NOIZYLAB
- `/Users/m2ultra/NOIZYLAB/_archive/gdrive-codemaster/...` — Google Drive CODEMASTER snapshot
- `/Users/m2ultra/NOIZYLAB/_archive/root-mcp-originals/` — original MCP scripts
- `/Users/m2ultra/NOIZYLAB/_archive/gemini-scratch/` — Gemini scratchpad
- `/Users/m2ultra/NOIZYLAB/repos/the-gathering/gabriel/` — prior GATHERING export
- `/Users/m2ultra/NOIZYLAB/_consolidation/THE-GATHERING/gabriel/` — our fresh clone

### 🗝 Key standalone GABRIEL artifacts
- **GABRIEL EXECUTOR v1.0** — `apps/dreamchamber/GABRIEL_EXECUTOR_v1.0.txt`
- **GABRIEL MEGA INTELLIGENCE** — `_archive/NOIZYEMPIRE/agents/metabeast/GABRIEL_MEGA_INTELLIGENCE.py`
- **Modelfile.GABRIEL** — `_archive/NOIZYEMPIRE/codemaster/HEAVEN/modelfiles/Modelfile.GABRIEL`
- **Modelfile.gabriel-mind** — `.claude/worktrees/youthful-edison/modelfiles/Modelfile.gabriel-mind`
- **GABRIEL VOICE ENGINE** (refactored) — `_archive/claude-today/11_PROMPTS_AND_TOOLS/🗣️ GABRIEL VOICE ENGINE - REFACTORED.py`
- **GABRIEL MASTER ARCHITECTURE** (html) — `_archive/claude-today/03_DREAMCHAMBER/GABRIEL_MASTER_ARCHITECTURE.html`
- **gabriel-mcp.mjs** — `_archive/root-mcp-originals/gabriel-mcp.mjs`
- **Gabriel.postman_collection.json** — `_archive/noizylab-legacy/integrations/postman/`
- **VPN configs** — `repos/the-gathering/gabriel/VPN/{GABRIEL_MOBILE,GABRIEL_OMEN,GABRIEL_PORTAL_PAD}.conf`

---

## 4. MC96ECOUNIVERSE — canonical map

### 🌌 The ecosystem root
`/Users/m2ultra/NOIZYLAB/mc96/` — git submodule, has its own `.git/`. This IS the universe.

### Inside mc96/
- `mc96/app/` — TURBO modules (turbo_gabriel_omega.py, turbo_memcell, turbo_prompts, turbo_telemetry, turbo_video_ai, turbo_audio_ai, turbo-pro-upgrade.js)
- `mc96/eco/` — the eco-system
  - `mc96/eco/DREAMCHAMBER/` — DreamChamber submodule inside eco
    - `GABRIEL_EXECUTOR_v1.0.txt`, `GABRIEL_UPGRADE_COMPLETE.md`, `gabriel-profile.json`
    - `src/core/Gabriel.js`, `GabrielProfile.js`
    - `src/routes/gabriel-v3.js`, `gabriel-v4.js`, `gabriel.js`
  - `mc96/eco/app/dashboard/` — gabriel.css, gabriel.js
  - `mc96/eco/scripts/mc96_universe_heal.sh`
  - `mc96/eco/logs/` — heal + report logs (2026-04-03 runs)
  - `mc96/eco/wisdom/prompts/GABRIEL_PROMPT.md`
  - `mc96/eco/mc96eco.config.js` — config root
  - `mc96/eco/archive/Projects_old/MC96/` — old MC96 snapshot
- `mc96/Lucy-Fork/` — Swift package, fork of Lucy (swift-collections, Kingfisher, Alamofire, Starscream deps)

### Standalone MC96 tools (outside mc96/)
- `tools/mc96-cli/bin/mc96.js` — the CLI
- `swift-library/bin/mc96diag` — Swift diagnostic binary
- `swift-library/MC96AudioDiag.swift` — audio diagnostic source

### MC96ECO governance & briefing docs (CRITICAL — your 14-month memory)
All under `_archive/claude-today/` and `_archive/claude-today/15_ARCHIVE/loose-files/`:

- `MC96ECOUNIVERSE_100_PERCENT.md` (3 copies)
- `MC96ECOUNIVERSE_COMPLETE_AUDIT.md` (3 copies)
- `MC96ECO_FOUNDER_BLUEPRINT.md` (in legacy dreamchamber)
- `MC96ECO_MASTER_OPERATIONS.docx`
- `MC96ECO_STACK_MAP.md`
- `MC96ECO_SUBSCRIPTION_REPORT.md`
- `MC96ECO_IP_WEEKLY_DIGEST.md` + dated weekly digest 2026-03-23
- `MC96ECO_NOIZY_AI_OS.html`
- `MC96ECO_AI_COMMAND_CENTER.html` (in _COMMAND_CENTER/)
- `MC96ECO_AI_FAMILY_DASHBOARD.html`
- `MC96ECO_CLOUDFLARE_CLEANUP.html`
- **Daily morning briefings** (11 files):
  - 2026-03-25, 03-27, 03-29, 03-30, 03-31, 04-01 (×2), 04-02, 04-03, 04-13, 04-14
- `MC96-FULL-DIAGNOSTIC-20260413.md`
- `MC96_FULL_DIAG_20260413.txt`
- `mc96_deep_audit.sh`

### n8n MC96 backups
`/Users/m2ultra/NOIZYLAB/infra/n8n-docker/sqlite-backup-20260415-150613/` — includes `YaT9rNaSz6MkaQi1__MC96_Daily_Backup.json`

---

## 5. Counts

- **GABRIEL-named files**: ~400 across all locations (∼100 canonical, ∼300 duplicates/mirrors)
- **MC96-named files**: ~100 across all locations (∼30 canonical, ∼70 duplicates/mirrors)
- **Unique git repos** (user-authored, excluding .build checkouts): 12 local + 19 GitHub
- **NOIZYLAB repos across 3 GitHub accounts**: 3 (two public, one archived)
- **THE-GATHERING repos across 2 GitHub accounts**: 2 (+ upstream NOIZYLAB-io)

---

## 6. Recommended destination (DREAMCHAMBER hub)

```
THE-GATHERING/DREAMCHAMBER/
├── GABRIEL/
│   ├── daemon/                   ← from NOIZYLAB/apps/GABRIEL/daemon/
│   ├── ios/                      ← from NOIZYLAB/apps/GABRIEL/ios/LUCY/
│   ├── prompts/                  ← GABRIEL_MASTER.md, GABRIEL_PROMPT.md, GABRIEL-v4.md
│   ├── scripts/                  ← gabriel-dispatch.sh, gabriel-merge.sh, ai.noizy.gabriel.plist
│   ├── turbo-scripts/
│   │   ├── shell/                ← 5 .sh files
│   │   └── python/               ← 14 .py modules
│   ├── turbo-omega/              ← turbo_gabriel_omega.py + 5 mc96/app/turbo_*.py
│   ├── modelfiles/               ← Modelfile.GABRIEL, Modelfile.gabriel-mind
│   ├── voice-engine/             ← GABRIEL VOICE ENGINE REFACTORED.py
│   ├── VPN/                      ← GABRIEL_MOBILE.conf, _OMEN.conf, _PORTAL_PAD.conf
│   ├── mcp/                      ← gabriel-mcp.mjs + gabriel_mcp_config.py
│   ├── postman/                  ← Gabriel.postman_collection.json
│   ├── n8n/                      ← 4 workflows + heartbeat + command_webhook
│   └── docs/
│       ├── GABRIEL.md            ← from registry/agents/ + Team Canon
│       ├── GABRIEL_EXECUTOR_v1.0.txt
│       ├── GABRIEL_UPGRADE_COMPLETE.md
│       ├── GABRIEL_MASTER_ARCHITECTURE.html
│       ├── GABRIEL_MCP_GEMMA3_HABITS.md
│       └── GABRIEL_IDEAS.md
│
├── MC96ECO/
│   ├── universe/                 ← mc96/eco/ tree (exclude .build/ + .git/)
│   ├── cli/                      ← mc96-cli/bin/mc96.js
│   ├── swift/                    ← MC96AudioDiag.swift, mc96diag binary
│   ├── docs/
│   │   ├── 100_PERCENT.md        ← MC96ECOUNIVERSE_100_PERCENT.md
│   │   ├── COMPLETE_AUDIT.md     ← MC96ECOUNIVERSE_COMPLETE_AUDIT.md
│   │   ├── FOUNDER_BLUEPRINT.md
│   │   ├── MASTER_OPERATIONS.docx
│   │   ├── STACK_MAP.md
│   │   ├── IP_WEEKLY_DIGEST.md
│   │   └── command-center/       ← 5 .html files
│   ├── briefings/                ← 11 dated morning briefings (2026-03-25 → 2026-04-14)
│   ├── diagnostics/              ← MC96-FULL-DIAGNOSTIC + FULL_DIAG + deep_audit.sh
│   └── n8n-backups/              ← MC96_Daily_Backup.json
│
└── (other brand folders: NOIZY.AI, NOIZYVOX, FISHMUSICINC, NOIZYKIDZ...)
```

---

## 7. Next decision points (for you)

1. **Source of truth** — Copy from `/Users/m2ultra/NOIZYLAB/` (live) or from `_archive/claude-today/` (historical 14-month record)?
2. **THE-GATHERING duplicate** — RSPNOIZY/THE-GATHERING or Noizyfish/THE-GATHERING is the real one?
3. **Handle the mirror** — `/Users/m2ultra/NOIZYANTHROPIC/` is a 1:1 mirror of NOIZYLAB. Ignore it, or also include?
4. **Archive into DREAMCHAMBER or keep flat?** — You said "INTO THE DREAMCHAMBER, IN THE BRAND FOLDERS". Confirming: `THE-GATHERING/DREAMCHAMBER/<brand>/...` ✓
