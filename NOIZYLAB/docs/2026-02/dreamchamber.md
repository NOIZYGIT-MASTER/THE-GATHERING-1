# THE DREAMCHAMBER
## Ultimate Accessibility-Powered Creative System
### NOIZY.AI × R.S. Plowman

**Status:** Active Build
**Owner:** Rob (R.S. Plowman)
**Platform:** macOS / M2 Ultra
**Voice:** Jamie (Premium British) — Already calibrated for GABRIEL

---

## Vision

The DreamChamber is an accessibility-first creative command center that transforms Rob's M2 Ultra Mac into a voice-controlled AI powerhouse. It bridges the gap between physical limitations and unlimited creative potential through intelligent automation, multi-AI orchestration, and predictive systems.

**Core Philosophy:** Rob does the heavy THINKING. GABRIEL does the heavy TEACHING & GUIDING.

---

## Architecture

### Voice-First Interface
- **Jamie (Premium British)** — macOS Accessibility voice, already setup & perfected
- Voice commands route through Apple Shortcuts → Keyboard Maestro → GABRIEL
- Natural language parsing via GABRIEL COMMS module
- Context-aware responses (Jamie speaks GABRIEL's output)

### AI Council Table
Multi-AI orchestration — the right AI for the right task:

| Seat | AI | Role | When |
|------|----|------|------|
| **Primary** | Claude (Anthropic) | Strategy, architecture, deep analysis | Complex reasoning, code review, planning |
| **Creative** | GPT-4/5 (OpenAI) | Marketing assets, creative writing | Via GABRIEL agents (WRA, SARAH, etc.) |
| **Research** | Gemini (Google) | Web research, data gathering | Information retrieval, fact-checking |
| **Local** | Ollama (M2 Ultra) | Private processing, fast inference | Sensitive data, offline work, quick tasks |
| **Specialist** | Domain-specific | Audio analysis, music generation | Specialized tasks as needed |

### Automation Layer
- **Keyboard Maestro** — Macro orchestration, app control, hotkey routing
- **Apple Shortcuts** — System-level automation, Jamie voice integration
- **BetterTouchTool** — Custom gestures, touch bar, trackpad commands
- **GABRIEL CLI** — Direct TypeScript agent execution

### Predictive Automation
- Context-aware task suggestions based on time, active app, recent activity
- Auto-preparation of workspaces (morning routine, project switching)
- Smart file routing based on content type detection

---

## 5-Stage Build Plan (10 Weeks)

### Stage 1: Foundation (Weeks 1-2)
**Goal:** Voice commands work, basic automation running

- Jamie voice command templates for GABRIEL
- Keyboard Maestro base macros (app launch, workspace switching)
- Apple Shortcuts → GABRIEL CLI bridge
- Basic status commands ("Gabriel, status" → spoken response)
- File organization shortcuts for The Vault

### Stage 2: AI Council (Weeks 3-4)
**Goal:** Multi-AI routing operational

- Ollama local model setup on M2 Ultra (Code Llama, Mistral)
- Context-aware AI switching logic
- Claude integration for strategy/architecture
- GPT integration via GABRIEL agents (already built)
- Fallback chains (if primary AI unavailable, route to backup)

### Stage 3: Creative Workflows (Weeks 5-6)
**Goal:** End-to-end creative pipelines via voice

- "Gabriel, scan The Vault" → METABEAST runs → Jamie reports results
- "Gabriel, research [company]" → Marketing pipeline → assets generated
- "Gabriel, teach me [topic]" → MENTORBEAST → lesson delivered
- Audio file workflows (tag, organize, backup via voice)
- Project workspace auto-setup

### Stage 4: Predictive Intelligence (Weeks 7-8)
**Goal:** GABRIEL anticipates needs

- Time-based automation (morning briefing, evening summary)
- App-context awareness (Logic Pro open → audio tools ready)
- Smart suggestions based on recent activity patterns
- Proactive notifications ("3 files need metadata", "backup due")
- Learning from Rob's patterns over time

### Stage 5: Full Integration (Weeks 9-10)
**Goal:** Everything connected, polished, reliable

- Slack/Discord bot live (GABRIEL COMMS module)
- Web dashboard (PWA) for visual status
- Error recovery and self-healing automations
- Performance optimization for M2 Ultra
- Documentation and command reference finalized

---

## macOS-Specific Setup

### Jamie Voice Integration
```
Voice Command → Apple Shortcut → Keyboard Maestro → Terminal (GABRIEL CLI) → Output → Jamie Speaks
```

### Keyboard Maestro Macro Groups
- **GABRIEL Core** — Status, help, mode switching
- **METABEAST** — Scan, organize, tag, backup commands
- **TESTBEAST** — Test, fix, validate commands
- **MENTORBEAST** — Learn, teach, explain, how-to commands
- **Workspace** — App layouts, project switching, environment setup

### M2 Ultra Local AI (Ollama)
- Code Llama 34B — Code review, generation (fits in unified memory)
- Mistral 7B — Fast inference for quick tasks
- Custom fine-tuned models (future) — NOIZY.AI domain-specific

### File Paths
- **The Vault:** `/Users/rob/Music/The Vault/` (or configured path)
- **GABRIEL System:** Project directory with all agent files
- **Memory:** `memory/` directory (persistent knowledge base)
- **Automations:** `~/Library/Application Support/Keyboard Maestro/`

---

## GABRIEL System Files

| File | Module | Purpose |
|------|--------|---------|
| `gabriel.ts` | Master Orchestrator | Routes commands to correct mode |
| `gabriel-metabeast.ts` | METABEAST | Media scanning, cataloging, organization |
| `gabriel-testbeast.ts` | TESTBEAST | Pipeline testing, analysis, auto-fix |
| `gabriel-comms.ts` | COMMS | Slack/Discord integration, command parsing |
| `gabriel-mentor.ts` | MENTORBEAST | AI teaching, coding mentor, learning paths |
| `workflow-agents-upgraded.ts` | Marketing Pipeline | WRA → SARAH → Summarize → GABRIEL creative |

---

## Key Principles

1. **Voice-first, always** — Every feature must work via Jamie voice commands
2. **Rob thinks, GABRIEL teaches** — Complementary intelligence
3. **Right AI, right task** — Council Table routing, not one-AI-fits-all
4. **Predict, don't wait** — Anticipate needs before Rob asks
5. **Never lose context** — Memory system preserves everything
6. **Accessibility is the feature** — Not an afterthought, it IS the product
7. **GORUNFREE!!** — The spirit that drives everything

---

*Last Updated: February 2026*
*Part of the NOIZY.AI Ecosystem*
