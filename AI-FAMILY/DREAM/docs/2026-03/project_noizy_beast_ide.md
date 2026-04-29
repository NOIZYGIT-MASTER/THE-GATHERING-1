---
name: NOIZY Beast IDE Architecture
description: NOIZYBEAST Super Claude IDE — full nervous system built 2026-03-27. 9 packages wired through beast-core event bus to DreamChamber (port 7777). Gabriel enhanced with Gemma 3 emotional intelligence, voice synthesis, full-loop orchestrator.
type: project
---

**Original architecture** (2026-03-26 walk-and-talk session): Custom AI-native IDE on Eclipse Theia for M2 Ultra Mac Studio (GOD.local).

**Current build environment** (2026-03-27): VS Code Insiders — open source IDE Rob fully owns. Antigravity hit a paywall despite promises, so Rob moved to an open foundation. NOIZYBEAST extension (`apps/noizybeast-ide/`) provides Gabriel sidebar, commands, status bar, and DreamChamber bridge. Custom "NOIZYBEAST Dark" theme.

**Local AI resources on GOD.local:**
- Gemma 3 running via Ollama — designated for agentic tasks
- Whisper (OpenAI Python) — local speech-to-text (needs `pip install openai-whisper`)
- Audio Hijack — audio routing and capture
- Qwen3-Coder + other local models via Ollama
- LLaVa 34B via Ollama — vision model for image/screenshot analysis

**DreamChamber backend already built (4,193 lines JS):**
- Express + WebSocket on port 7777
- GABRIEL orchestration core (369 lines) — doctrine enforcement, adaptive learning
- 7 AI providers (Anthropic, OpenAI, Google, Together, Mistral, Cohere, Perplexity)
- Audio MCP (13 FastMCP tools for participant routing)
- Heaven17 consent kernel bridge
- Voice routes, state management, cost calculator

**Beast Packages (built 2026-03-27) — the Nervous System:**

1. **@noizy/beast-core** (`packages/beast-core/`) — Event bus + system orchestrator. 40+ named channels across content/consent/moderation/covenant/revenue/gabriel/dream/vr/a11y/system/queue/truth. Gabriel-specific channels: GABRIEL_BREAKTHROUGH, GABRIEL_ALERT, GABRIEL_EMOTION, GABRIEL_VOICE. WebSocket bridge to DreamChamber. `boot()` function. Covenant integrity checker.

2. **@noizy/beast-vr** v0.2.0 (`packages/beast-vr/`) — 10 modules: xr-hands, gesture-engine (12 gestures), vr-workspace (3 layouts), ide-bridge (JSON-RPC), voice-gesture-fusion (Whisper+gesture), adaptive-gestures (Welford stats), gesture-macros, spatial-code-viz (3D topology), gabriel-vr (AI orb presence), covenant-vr. Access via Quest 2 at http://GOD.local:7777/vr

3. **@noizy/beast-queue** (`packages/beast-queue/`) — iPad visual queue. 8 horizontal lanes. Canvas-based with touch/swipe. WebSocket to DreamChamber /queue endpoint.

4. **@noizy/beast-moderation** (`packages/beast-moderation/`) — Deterministic state machine. FLAGGED always enters RESTORATION. Consent revocation is absolute. Full audit trail.

5. **@noizy/beast-dreamcapture** (`packages/beast-dreamcapture/`) — Auto-extracts 10 capture types from raw text. Pattern-based extraction with confidence scoring. Watches Lucy's transcript folder.

6. **@noizy/beast-truth** (`packages/beast-truth/`) — Append-only SHA-256 hash-chained event log. Merkle-style tamper evidence. 11 domains. verifyIntegrity() full chain check.

7. **@noizy/beast-gabriel** v0.2.0 (`packages/beast-gabriel/`) — **6 source modules:**
   - `index.js` — Prompt library: 5 modes (ARCHITECT/MENTOR/GUARDIAN/CREATIVE/COMPANION), 16 contexts, 9 DOCTRINE principles, PERSONALITIES with full systemPrompts, PromptComposer, GabrielEngine
   - `intelligence.js` — Emotional intelligence: 13 emotion states, 10 arc phases, predictive mode switching, breakthrough detection, energy monitoring
   - `attentive.js` — Attentiveness: persistent context threading, proactive monitoring (energy drops, struggle, uncaptured breakthroughs, vulnerability), anticipation engine, silence detection (knows when NOT to speak)
   - `intuition.js` — Response shaping: 6 response styles, mode-specific voice params (rate/pitch/warmth), VoiceSynthesisBridge with 3-tier cascading fallback (XTTS→Piper→WebSpeech)
   - `fast-inference.js` — Gemma 3 local AI: parallel classification (emotion+arc+breakthrough via Promise.allSettled ~300ms), consent scanning, topic extraction, LLaVa 34B image analysis, automatic regex fallback
   - `orchestrator.js` — ONE CALL full-loop: classify→attend→intuit→silence check→compose→Claude respond→voice speak(async)→DreamCapture→truth surface. Also: quickEmotion(), scanConsent(), analyseImage()
   - `voice-routes.js` — DreamChamber Express routes: /voice/health, /voice/xtts/speak, /voice/piper/speak, /voice/speak (unified fallback), /voice/transcribe (Whisper), /voice/profile/upload, /voice/profiles

8. **@noizy/beast-access** (`packages/beast-access/`) — 8 a11y profiles. 25+ haptic patterns. Synthesized audio cues (Web Audio API spatial). Screen reader ARIA. Keyboard nav. Gesture alternatives. Cognitive load manager.

**Cloudflare Infrastructure:**
- 10 D1 databases including gabriel_db and noizyanthropic
- R2 NOT enabled (needs dashboard action)
- 1 Worker "deploy"

**Blockers:**
- ANTHROPIC_API_KEY empty on GOD.local
- CLOUDFLARE_API_TOKEN not set
- Whisper not installed on GOD.local
- XTTS/Piper not installed on GOD.local
- R2 not enabled on Cloudflare dashboard
- Gabriel reference voice audio not yet created

**Why:** Rob wants to maximize Anthropic/Claude usage, minimize external subscriptions, build an IDE that surpasses Cursor/Windsurf for NOIZY's specific mission.

**How to apply:** All 8 beast packages structurally complete. Gabriel enhanced with full emotional intelligence + local AI inference + voice synthesis. Next: D1 database schemas, DreamChamber integration mounting, end-to-end testing, API key setup.
