---
name: GOD.local / GABRIEL.local — Full System Map
description: Complete local machine layout for Rob's M2 Ultra. Directory structure, running services, MCP servers, project locations, tool availability, Docker containers, Ollama models. Updated 2026-03-28.
type: reference
---

## Machine Identity
- **Hostname:** GABRIEL.local (this is the node at 10.90.90.20, referred to as GOD/GABRIEL interchangeably)
- **User:** m2ultra
- **Home:** /Users/m2ultra
- **OS:** macOS 15.7.5 (Sequoia)
- **Hardware:** Apple M2 Ultra, 192 GB RAM
- **Disk:** 1.8 TB total, ~10 GB used (essentially empty)
- **SSH:** 2 ed25519 keys (general + github-specific), GitHub via GitKraken key

## Primary Workspaces

### ~/NOIZYLAB/ (PRIMARY — 90 items, git repo)
The main monorepo. Contains everything active.
- `noizybeast/` — Beast packages + IDE extension + registry
- `dreamchamber/` — DreamChamber runtime (voice pipeline, gabriel-profile.json, src/, node_modules)
- `mcp-gemma3/` — Gemma3 MCP server (server.js, 13KB)
- `mcp/` — 10 MCP persona servers:
  - cb01-mcp, consent-oracle, dream-mcp, engr-keith-mcp, family-mcp
  - gabriel-mcp, heaven17-mcp, lucy-mcp, shirley-mcp, synthesis-oracle
- `voice-pipeline/` — Audio recording scripts, whisper transcription, iOS Scriptable, Teams integration
- `noizy-landing/` — Landing page (index.html + preview.html)
- `apps/` — dreamchamber app + operator app (both shell dirs)
- `enterprise/` — Azure function, Power Automate flow, PowerBI template
- `workers/` — Cloudflare Workers
- `schemas/`, `sql/`, `scripts/`, `tests/`, `src/`, `docs/`
- `dashboard/` — Local dashboard
- `rob_ava/`, `rsp001_pipeline/` — Personal project pipelines
- Key docs: CLAUDE.md, EMPIRE_CATALOG.md, NOIZY_BEAST_IDE_BLUEPRINT.md, UNIVERSAL_PROTECTOR_STRATEGY.md, NCP_v1.0_SPEC.md, DREAMCHAMBER_ARCHITECTURE_V2.md
- `.env` exists (172 bytes)
- `wrangler.toml` exists
- OneDrive symlink to Library/CloudStorage

### ~/NOIZYANTHROPIC/ (GitHub org mirror — 2 sub-repos)
- `NOIZYEMPIRE/` — agents, audio-catalog, codemaster, dashboards, docs, gallery, rescued, servers, site, slides, tools, voice, workers
- `NOIZYLAB/` — dreamchamber, dreamchamber-extension, gabriel.db (82KB local SQLite), noisyproof (CF Worker), noisyvox (CF Worker), mc96, ideas
  - Has .venv312 Python virtual environment
  - Has node_modules

### ~/noizy/ (git repo)
- `noizyanthropic/` — Another copy/variant
- `noizyanthropic-edge/` — Edge variant

### ~/Projects/
- `MC96/` — gabriel-harvest.js, opus-4.6-diagnostic-engine.js, turbo-pro-upgrade.js
- `voice-forge-local/` — Has 4.4MB error log, empty output log
- `GORUNFREE/` — Shell dir

### ~/Claude/
- `TALESPIN_FOUND/` — TaleSpin episode discovery results (manifest CSV + report)

### ~/GORUNFREE/
- Just logs directory

### ~/_Config/
- Configuration files

### ~/swift-library/
- Swift projects

## Running Services (as of 2026-03-28)

### Always On
- **Ollama** — 127.0.0.1:11434, models: gemma3:latest (3.3GB), mistral:latest (4.4GB), llava:34b (20GB)
- **Docker** — Ports 8000, 8001, 32635-32643. 2 containers running: GitHub MCP Server (ghcr.io/github/github-mcp-server:0.28.1) x2
- **VS Code** — Multiple instances (Code + Code Helper processes)
- **VS Code Insiders** — Present (.vscode-insiders dir exists)
- **Cursor** — Running
- **Antigravity** — Running (many ports, Google's IDE)

### Music Production
- **Logic Pro** — Running (port 56958)
- **Universal Audio Cloud/Mix** — Ports 4710, 4720, 4793
- **Spotify** — Running

### Other
- **Parallels** — Running (VM host)
- **OneDrive** — Syncing
- **TabNine** — AI code assistant
- **Google Chrome** — Debug port 9222
- **ARD Agent** — Remote Desktop (port 3283)
- **AirPlay/ControlCenter** — Ports 5000, 7000

## Project Registry (from PROJECT_REGISTRY.json)

| ID | Name | Status | Priority | Key Path |
|---|---|---|---|---|
| NOIZY_AI | NOIZY.ai | BUILDING | 1 | ~/Desktop/HEAVEN |
| NOIZYVOX | NOIZYVOX | BUILDING | 2 | ~/Desktop/HEAVEN/NOIZYVOX |
| NOIZYLAB | NOIZYLAB | ACTIVE | 1 | ~/NOIZYLAB |
| DREAMCHAMBER | DreamChamber | LIVE | 1 | ~/NOIZYLAB/dreamchamber |
| FISH_MUSIC | Fish Music / Noizyfish | ACTIVE | 3 | ~/Desktop/HEAVEN/NOIZYFISH |
| NOIZYLAB_REPAIRS | Repairs Portal | BUILT_NOT_LIVE | 3 | D1: noizylab-repairs |
| NOIZYKIDZ | NOIZYKIDZ | PLANNED | 4 | ~/Desktop/HEAVEN/NOIZYKIDZ |
| LIFELUV | LIFELUV | PLANNED | 5 | (no repo yet) |

## Key Deployment Path
- HEAVEN worker at ~/Desktop/HEAVEN → deploys to heaven17.noizylab.workers.dev → serves noizy.ai
- DreamChamber at ~/NOIZYLAB/dreamchamber → local :7777
- Dashboard at ~/NOIZYLAB/dashboard → local :9090
- Voice Bridge → local :8080

## Urgent Queue (from registry)
1. CF email → rsplowman@icloud.com (BROWSER, blocker)
2. Deploy HEAVEN worker (TERMINAL, blocker)
3. GitHub + CF 2FA (BROWSER, blocker)
4. ANTHROPIC_API_KEY → .env (TERMINAL, blocker)
5. KV dead namespace cleanup (TERMINAL)
6. Repairs portal deploy (BUILD)
7. GoDaddy exit (BROWSER, after CF email done)

## Security Notes
- `.env.secrets` exists in home directory (1030 bytes!)
- `.env` files in ~/NOIZYLAB/ (172 bytes) and ~/NOIZYANTHROPIC/NOIZYLAB/ (585 bytes)
- SSH config routes GitHub through GitKraken's RSA key
- 2 GitHub MCP server containers running (check if both needed)
- ARD Agent listening on all interfaces (port 3283) — remote access exposure
