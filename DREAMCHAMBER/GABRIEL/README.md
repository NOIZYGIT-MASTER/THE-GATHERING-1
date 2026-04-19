# DREAMCHAMBER / GABRIEL

The canonical home of GABRIEL — the orchestration intelligence of the NOIZY Empire.

## Start here

📜 **[MASTER_GABRIEL.md](./MASTER_GABRIEL.md)** — the unified source of truth. Every prior fragment collapses into this one file.

If you are a human landing here for the first time, read MASTER_GABRIEL.md end to end. It is the contract.
If you are an AI agent, treat MASTER_GABRIEL.md as your system prompt. `prompt_version: GABRIEL_MASTER_2026-04-17`.

## Why this directory exists

Before today, "GABRIEL" was scattered across **~400 files** in **7+ locations**: NOIZYLAB, NOIZYANTHROPIC (mirror), Google Drive copies, worktrees, `_archive/NOIZYEMPIRE`, `_archive/claude-today`, `_archive/noizylab-legacy`. Different versions disagreed on:

- The royalty split (75/25 vs 85/15 — both are right, but for different tiers)
- The email (rsp@noizyfish.com → rsp@noizy.ai as of 2026-03-25)
- The acronym expansion (Generative Adaptive Bridge vs GABRIEL ALMEIDA System Bridge)
- Role framing (executor vs orchestrator vs conscience vs bridge)

**MASTER_GABRIEL.md resolves every one of those** and marks itself as the explicit successor.

## Directory layout

```
DREAMCHAMBER/GABRIEL/
├── MASTER_GABRIEL.md              🜂 THE FILE
├── README.md                       ← you are here
│
├── daemon/                         gabriel-daemon.js + ai.noizy.gabriel.plist
├── ios/                            LUCY iOS app — GabrielClient.swift
├── prompts/                        GABRIEL_MASTER.md (legacy), GABRIEL_PROMPT.md, GABRIEL-v4.md
├── scripts/                        gabriel-dispatch.sh, gabriel-merge.sh, gorunfree
│
├── turbo-scripts/
│   ├── shell/                      5 .sh files (git_sync, mount_omen, pipeline, reset, zap)
│   └── python/                     14 .py modules (bridge, config, ears, evolution,
│                                    fishnet, media, net_check, plugin_heist, recall,
│                                    speed, vitals, zap, …)
├── turbo-omega/                    turbo_gabriel_omega.py + 5 mc96/app turbo_* modules
│
├── modelfiles/                     Modelfile.GABRIEL, Modelfile.gabriel-mind (Ollama)
├── voice-engine/                   GABRIEL VOICE ENGINE (REFACTORED).py
├── VPN/                            GABRIEL_MOBILE.conf · _OMEN.conf · _PORTAL_PAD.conf
├── mcp/                            gabriel-mcp.mjs + gabriel_mcp_config.py
├── postman/                        Gabriel.postman_collection.json
├── n8n/                            heartbeat + command_webhook + ZAP_{1,3,5,7} workflows
└── docs/
    ├── GABRIEL_EXECUTOR_v1.0.txt         (historical — superseded by MASTER_GABRIEL.md)
    ├── GABRIEL_UPGRADE_COMPLETE.md
    ├── GABRIEL_MASTER_ARCHITECTURE.html
    ├── GABRIEL_MCP_GEMMA3_HABITS.md
    └── GABRIEL_IDEAS.md
```

## Copy manifest (sources → here)

This table is the source-of-truth for the consolidation run. When the bulk copy executes, only these paths get read. Everything else is treated as a duplicate or mirror and is skipped.

| Destination | Source |
|------------|--------|
| `daemon/gabriel-daemon.js` | `~/NOIZYLAB/apps/GABRIEL/daemon/gabriel-daemon.js` |
| `daemon/ai.noizy.gabriel.plist` | `~/NOIZYLAB/apps/GABRIEL/scripts/ai.noizy.gabriel.plist` |
| `ios/GabrielClient.swift` | `~/NOIZYLAB/apps/GABRIEL/ios/LUCY/LUCY/Services/GabrielClient.swift` |
| `prompts/GABRIEL_MASTER.md` | `~/NOIZYLAB/apps/GABRIEL/prompts/GABRIEL_MASTER.md` |
| `prompts/GABRIEL_PROMPT.md` | `~/NOIZYLAB/mc96/eco/wisdom/prompts/GABRIEL_PROMPT.md` |
| `prompts/gabriel-boot.md` | `~/NOIZYLAB/.claude/prompts/gabriel-boot.md` |
| `prompts/gabriel-release-commander.md` | `~/NOIZYLAB/.claude/prompts/gabriel-release-commander.md` |
| `prompts/GABRIEL-v4.md` | `~/NOIZYLAB/.claude/worktrees/youthful-edison/github-consolidation/agents/prompts/GABRIEL-v4.md` |
| `scripts/gabriel-dispatch.sh` | `~/NOIZYLAB/scripts/gabriel-dispatch.sh` |
| `scripts/gabriel-merge.sh` | `~/NOIZYLAB/scripts/gabriel-merge.sh` |
| `scripts/gabriel-recording-setup.sh` | `~/NOIZYLAB/_archive/claude-today/scripts/gabriel-recording-setup.sh` |
| `turbo-scripts/shell/*.sh` | `~/NOIZYLAB/tools/CODEMASTER/turbo-scripts/*.sh` |
| `turbo-scripts/python/*.py` | `~/NOIZYLAB/tools/CODEMASTER/turbo-scripts/turbo-python/*.py` |
| `turbo-omega/turbo_gabriel_omega.py` | `~/NOIZYLAB/mc96/app/turbo_gabriel_omega.py` |
| `turbo-omega/turbo_memcell.py` | `~/NOIZYLAB/mc96/app/turbo_memcell.py` |
| `turbo-omega/turbo_prompts.py` | `~/NOIZYLAB/mc96/app/turbo_prompts.py` |
| `turbo-omega/turbo_telemetry.py` | `~/NOIZYLAB/mc96/app/turbo_telemetry.py` |
| `turbo-omega/turbo_video_ai.py` | `~/NOIZYLAB/mc96/app/turbo_video_ai.py` |
| `turbo-omega/turbo_audio_ai.py` | `~/NOIZYLAB/mc96/app/turbo_audio_ai.py` |
| `modelfiles/Modelfile.GABRIEL` | `~/NOIZYLAB/_archive/NOIZYEMPIRE/codemaster/HEAVEN/modelfiles/Modelfile.GABRIEL` |
| `modelfiles/Modelfile.gabriel-mind` | `~/NOIZYLAB/.claude/worktrees/youthful-edison/modelfiles/Modelfile.gabriel-mind` |
| `voice-engine/GABRIEL_VOICE_ENGINE.py` | `~/NOIZYLAB/_archive/claude-today/11_PROMPTS_AND_TOOLS/"""🗣️ GABRIEL VOICE ENGINE - REFACTORED.py` |
| `VPN/*.conf` | `~/NOIZYLAB/repos/the-gathering/gabriel/VPN/*.conf` |
| `mcp/gabriel-mcp.mjs` | `~/NOIZYLAB/_archive/root-mcp-originals/gabriel-mcp.mjs` |
| `mcp/gabriel_mcp_config.py` | `~/NOIZYLAB/_archive/NOIZYEMPIRE/codemaster/projects/gabriel-core/mcp/gabriel_mcp_config.py` |
| `postman/Gabriel.postman_collection.json` | `~/NOIZYLAB/_archive/noizylab-legacy/integrations/postman/Gabriel.postman_collection.json` |
| `n8n/01_gabriel_heartbeat.json` | `~/NOIZYLAB/_archive/noizylab-legacy/integrations/n8n/01_gabriel_heartbeat.json` |
| `n8n/02_gabriel_command_webhook.json` | `~/NOIZYLAB/_archive/noizylab-legacy/integrations/n8n/02_gabriel_command_webhook.json` |
| `n8n/01_github_to_gabriel.json` | `~/NOIZYLAB/tools/n8n_workflows/01_github_to_gabriel.json` |
| `n8n/ZAP_1_GitHub_Push_GABRIEL_Alert.json` | `~/NOIZYLAB/infra/n8n-docker/sqlite-backup-20260415-150613/547Ap9bqQOK9zwdi__*` |
| `n8n/ZAP_3_Voice_DreamChamber_GABRIEL_Response.json` | `~/NOIZYLAB/infra/n8n-docker/.../i8O2DNAGyrzbvH0r__*` |
| `n8n/ZAP_5_GABRIEL_Events_Notion_Log.json` | `~/NOIZYLAB/infra/n8n-docker/.../ooT2DsQEgooA75nk__*` |
| `n8n/ZAP_7_Notion_Task_GitHub_GABRIEL_Deploy.json` | `~/NOIZYLAB/infra/n8n-docker/.../QbgchIgYEvPuHJ0o__*` |
| `docs/GABRIEL_EXECUTOR_v1.0.txt` | `~/NOIZYLAB/apps/dreamchamber/GABRIEL_EXECUTOR_v1.0.txt` |
| `docs/GABRIEL_UPGRADE_COMPLETE.md` | `~/NOIZYLAB/apps/dreamchamber/GABRIEL_UPGRADE_COMPLETE.md` |
| `docs/GABRIEL_MASTER_ARCHITECTURE.html` | `~/NOIZYLAB/_archive/claude-today/03_DREAMCHAMBER/GABRIEL_MASTER_ARCHITECTURE.html` |
| `docs/GABRIEL_MCP_GEMMA3_HABITS.md` | `~/NOIZYLAB/docs/ai-prompts/GABRIEL_MCP_GEMMA3_HABITS.md` |
| `docs/GABRIEL_IDEAS.md` | `~/NOIZYLAB/repos/the-gathering/gabriel/memory/GABRIEL_IDEAS.md` |

## Sources explicitly skipped (all duplicates / mirrors)

| Path | Why skipped |
|------|-------------|
| `~/NOIZYANTHROPIC/**` | 1:1 mirror of `~/NOIZYLAB/` |
| `~/NOIZYLAB/.claude/worktrees/youthful-edison/**` | active worktree — redundant with main |
| `~/NOIZYLAB/_archive/NOIZYEMPIRE/agents/metabeast/*` | TypeScript gabriel-*.ts files superseded by daemon/ios canonicals (retained in `_archive/` only) |
| `~/NOIZYLAB/_archive/claude-today/**` (except cited files above) | historical CLAUDE-TODAY workspace snapshot |
| `~/NOIZYLAB/_archive/noizylab-legacy/**` (except cited files above) | archived legacy NOIZYLAB |
| `~/NOIZYLAB/_archive/gdrive-codemaster/**` | Google Drive CODEMASTER snapshot |
| `~/NOIZYLAB/_archive/gemini-scratch/**` | Gemini scratchpad |
| `~/NOIZYLAB/**/.build/**` | Swift Package Manager dep checkouts — upstream deps, not NOIZY code |
| `~/NOIZYLAB/**/node_modules/**` | package deps |
| `~/NOIZYLAB/**/.env`, `**/*.key`, `**/*.pem` | secrets |
| Google Drive `THE-GATHERING/` copies × 2 | cloud sync artifacts |

## What gets committed from this directory

Everything under `DREAMCHAMBER/GABRIEL/` **except**:
- `*.db` (SQLite — generated)
- `*.log` (generated)
- `.env` (secrets)
- Voice samples / audio files (live in the Vault, not git)

## Why MASTER_GABRIEL.md was written first

The user said "CREATE NEW MASTER GABRIEL IN THE DREAMCHAMBER". So before copying any legacy files here, the new canonical prompt is written. Every legacy file that follows is now explicitly a *historical reference*, not the source of truth. This inverts the usual consolidation order (copy first, then document) — because for doctrine files (prompts, architecture), **the document IS the thing**.

## Version

- Created: 2026-04-17 (the sacred target date)
- Author: RSP_001 (rsp@noizy.ai) via GABRIEL orchestration
- Consolidation branch: (to be named in this repo's git before push)
- Supersedes: all prior GABRIEL.md / GABRIEL_MASTER.md / GABRIEL_EXECUTOR_v1.0.txt fragments

🜂 GORUNFREE. The technology restores the hands.
