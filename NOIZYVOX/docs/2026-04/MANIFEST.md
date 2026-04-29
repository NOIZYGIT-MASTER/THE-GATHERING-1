# NOIZYVOX — A.I.V.A. Voice Lab

**Founded:** 2026-04-26 by RSP_001
**Mission:** Cultivate sovereign voices for the NOIZY agent fleet. Cloning rooted in consent.
**First voice:** GABRIEL — lead orchestrator.

## v0 goals (this session)

1. Install Coqui XTTS v2 (open-source MPL 2.0 voice cloning engine, supports zero-shot from short reference audio).
2. Install Piper as fallback runtime.
3. Locate or capture reference audio (Jamie-character open voice OR Rob's own voice).
4. Synthesize first GABRIEL speech sample.
5. Wire GABRIEL voice into NOIZYBEAST chat pane (replace browser SpeechSynthesis).

## Directory layout

- `voices/` — trained/cloned voice models, one subdir per agent
- `samples/` — reference audio used as training input (must include source license)
- `outputs/` — synthesized speech files (logged to NOIZY ledger when wired)
- `scripts/` — synth pipeline, capture tools
- `logs/` — install logs, training logs, synth logs
- `.venv/` — isolated Python env (PyTorch + Coqui TTS + Piper)

## Consent doctrine compliance

Per ~/CLAUDE.md and ~/.claude/rules/identity.md Never Clauses:

- Every voice in `voices/` MUST have a `LICENSE.md` documenting source consent or open-source license
- Apple Siri voices (including "Jamie" Australian English voice 4) are PROPRIETARY and not used directly
- Reference audio that is RSP_001's own voice is implicitly consented (he's the founder)
- Any future actor voice requires consent token from Heaven before training begins
- All synthesized output gets C2PA content credentials when integration is built (v1)

## Untouched

- No existing files modified
- No NOIZY services restarted
- New isolated tree at ~/NOIZYVOX/
