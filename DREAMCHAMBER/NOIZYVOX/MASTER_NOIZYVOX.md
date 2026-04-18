# 🜂 MASTER NOIZYVOX

> **Consent-locked voice ownership protocol.**
> **Version:** `NOIZYVOX_MASTER_2026-04-17`
> **Owner (agent):** LUCY
> **Port:** FastAPI :8090

## WHAT NOIZYVOX IS

The **artist-facing voice platform**. NOIZYVOX is where an artist:

1. Creates their voice profile (voice signature, biometric fingerprint)
2. Grants specific, scoped, revocable NCP consent tokens
3. Sees every use of their voice in near-real-time
4. Receives LIFELUV receipts (compensation translated into human terms)
5. Fires the Kill Switch with one button

No licensee, no integrator, no platform employee can do any of these ON BEHALF of an artist. Only the artist, or their designated estate executor, can.

## THE PROTOCOL

- **Voice fingerprint** — SHA-256 over a deterministic feature set derived from the voice sample. Stored in the Voice DNA Vault.
- **HVS (Human Voice Sovereignty) token** — UUID assigned per creator, `RSP_001` is the first.
- **NCP v1.0 token** — the consent structure. See `MASTER_GABRIEL.md` for the canonical schema.
- **Voice processing pipeline** — see `GABRIEL_EXECUTOR_v1.0.txt` (archived) or the canonical flow in `AGENTS/MASTER_GABRIEL.md`.

## CLEARED VOICE TOOLS

| Tool | Purpose | License |
|------|---------|---------|
| **XTTS v2** | Synthesis | Commercial-ok |
| **RVC** | Voice conversion | Commercial-ok |
| **Librosa** | Analysis | Open-source |
| **pedalboard** | Effects | Commercial-ok |

## BLOCKED VOICE TOOLS (pending board review)

- MusicGen
- MaskGCT
- Tango 2
- FishSpeech (non-commercial only)

## BUILD STACK

- FastAPI + uvicorn (Python)
- Port `:8090`
- XTTS v2 for synthesis (via `coqui-ai/TTS`)
- Whisper for verification (local ASR)
- C2PA Python bindings (Leonard Rosenthol's reference implementation)

## API SURFACE (NOIZYVOX-specific, Heaven handles consent)

- `POST /v1/voice/onboard` — create new HVS token + ingest first sample
- `POST /v1/voice/sample` — add a sample to an existing voice
- `POST /v1/synth` — synthesis request (always gated by Heaven's NCP validation)
- `GET  /v1/voice/:id/receipts` — LIFELUV receipts for a creator
- `POST /v1/voice/:id/kill-switch` — fires revocation → Heaven propagates

## HANDOFF PROTOCOLS

- **New artist signup** → LUCY onboards via `lucy_onboard` → NOIZYVOX creates HVS token → SHIRL validates → POPS creates estate record.
- **Synthesis request** → NOIZYVOX API → Heaven validates NCP → SHIRL approves/blocks → on pass, NOIZYVOX runs XTTS → POPS attaches C2PA + watermark → ledger append.
- **Kill Switch** → artist hits button → NOIZYVOX notifies Heaven → SHIRL propagates to all downstream within 1hr SLA → LUCY notifies Guild.

## BRAND VOICE (for UX copy)

- Direct. Unfussy. Technical without jargon.
- The artist is addressed in second person: *"your voice," "your consent," "you can revoke this in one click."*
- Error states never blame the user.

## VERSION

- Prompt version: `NOIZYVOX_MASTER_2026-04-17`
- Authority: RSP_001 (rsp@noizy.ai)
- Canonical: `THE-GATHERING/DREAMCHAMBER/NOIZYVOX/MASTER_NOIZYVOX.md`

🜂 *Your voice. Your consent. Your Kill Switch.*
