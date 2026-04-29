# NOIZYVOX · Sprint Day 1 Launch Guide
## RSP_001 · GABRIEL_V3 · GORUNFREE · Epoch V
### MacBook Pro · VS Code Insiders · First Live Utterance

---

## ① FILE SETUP (5 minutes)

Create a project folder — call it `noizyvox/` wherever you keep code. Inside it:

```
noizyvox/
├── voice_receiver.py           ← Flask server (localhost:5050)
├── voice_processor.py          ← CLI WAV processor
├── voice_intake_standalone.py  ← Terminal mic capture (no browser)
├── requirements_noizyvox.txt   ← pip requirements
├── noizyvox-intake-portal.html ← Browser intake portal
└── .vscode/
    └── tasks.json              ← VS Code tasks (rename vscode_tasks.json → tasks.json)
```

All files are already in your Cowork outputs folder. Copy them out.

**IMPORTANT:** `vscode_tasks.json` → rename to `tasks.json` and place inside `.vscode/`

---

## ② INSTALL DEPENDENCIES (10 minutes)

Open Terminal in your `noizyvox/` folder:

```bash
pip install -r requirements_noizyvox.txt
```

This installs: flask, flask-cors, openai-whisper, librosa, soundfile, noisereduce, scipy, sounddevice, numpy.

**Whisper will download a base model (~150MB) on first use** — that's normal.

---

## ③ INSTALL FFMPEG (if not already installed)

```bash
# Check first
ffmpeg -version

# If not installed:
brew install ffmpeg
```

ffmpeg converts browser's `.webm` audio → `.wav` for the pipeline.
Not strictly required for standalone terminal mode, but needed for the browser portal → Flask path.

---

## ④ FIND YOUR APOLLO DEVICE INDEX

Your Apollo UAD interface needs the right device index. Run:

```bash
python voice_intake_standalone.py --list-devices
```

You'll see output like:
```
  [ 0] Built-in Microphone         (2ch, 44100 Hz) ← DEFAULT
  [ 1] Apollo Twin USB             (2ch, 44100 Hz)
  [ 2] BlackHole 2ch               (2ch, 44100 Hz)
```

Note the number next to your Apollo. Use `--device N` in the next step.

---

## ⑤ OPTION A — TERMINAL MODE (Fastest Start)

No browser, no server. Just terminal → mic → WAV → Whisper → Librosa → JSON.

```bash
# Default device
python voice_intake_standalone.py --actor RSP_001 --tag verse-1

# With Apollo (replace 1 with your actual device number)
python voice_intake_standalone.py --actor RSP_001 --tag verse-1 --device 1

# Higher quality transcription
python voice_intake_standalone.py --actor RSP_001 --tag verse-1 --device 1 --model medium
```

**To record:**
- Press `ENTER` → recording starts (you'll see live ASCII VU meter + dB)
- Press `ENTER` again → recording stops
- Whisper transcribes. Librosa analyzes. JSON + WAV saved to `./noizyvox_output/`
- Press `Ctrl+C` to end session

**First utterance output:**
```
noizyvox_output/
├── RSP_001_verse-1_001_20260317_143022.wav
├── RSP_001_verse-1_001_20260317_143022.json
└── provenance.jsonl   ← First ledger entry
```

---

## ⑥ OPTION B — BROWSER PORTAL + FLASK SERVER (Full Pipeline)

**Step 1:** Start the Flask server

In VS Code Insiders: `Cmd+Shift+P` → `Tasks: Run Task` → `🎙 NOIZYVOX: Start Voice Receiver`

Or in terminal:
```bash
python voice_receiver.py
```

You should see:
```
════════════════════════════════════════════════════════════════
  NOIZYVOX VOICE RECEIVER · NOIZYFISH INC.
  RSP_001 · GABRIEL_V3 · GORUNFREE · EPOCH V
════════════════════════════════════════════════════════════════
  Flask:    localhost:5050
  Whisper:  base  (lazy load on first ingest)
  Librosa:  ✓
  ffmpeg:   ✓
  Ledger:   ./noizyvox_output/provenance.jsonl
────────────────────────────────────────────────────────────────
```

**Step 2:** Open the intake portal

```bash
open noizyvox-intake-portal.html
```

Or VS Code task: `🌐 NOIZYVOX: Open Intake Portal`

**Step 3:** In the browser portal
- Server status should show green ✓ (checking localhost:5050/status)
- Actor ID: `RSP_001` (pre-populated)
- Tag: `verse-1` (or whatever this utterance is)
- Consent Key is displayed — this is your provenance anchor
- Hit `● RECORD` → speak → hit `■ STOP` → hit `⚡ PROCESS`
- Watch the 7-stage pipeline light up stage by stage

---

## ⑦ VS CODE INSIDERS — ALL 9 TASKS

`Cmd+Shift+P` → `Tasks: Run Task`

| # | Task Label | What It Does |
|---|-----------|--------------|
| 1 | 🎙 Start Voice Receiver | Flask server on :5050 |
| 2 | ⚙ Process WAV (base) | Librosa + Whisper on one file |
| 3 | ⚙ Process WAV (medium) | Higher quality transcription |
| 4 | ⚙ Batch Process | All WAVs in noizyvox_output/ |
| 5 | 🎤 Standalone Mic Capture | Terminal mode, no browser |
| 6 | 📋 View Provenance Ledger | Print all utterances |
| 7 | 📦 Install Requirements | pip install all deps |
| 8 | 🔧 Check ffmpeg | Verify ffmpeg installed |
| 9 | 🌐 Open Intake Portal | Open HTML in browser |

---

## ⑧ VALIDATE FIRST PROVENANCE ENTRY

After your first recording:

```bash
cat noizyvox_output/provenance.jsonl
```

You should see one JSON line containing:
```json
{
  "utterance_id": "UTT-RSP001-XXXXX-XXXX",
  "actor_id": "RSP_001",
  "consent_key": "NOIZY-RSP001-CONSENT-A7F3C9B2E1D4850F-AVA-GLOBAL-CANADA-20260314",
  "watermark": "WM_A1B2C3D4",
  "royalty_floor_pct": 85,
  "never_clauses": ["NC_01","NC_02","NC_03","NC_04","NC_05","NC_06","NC_07","NC_08","NC_09","NC_10"],
  "gorunfree": true,
  "epoch": "V",
  "gabriel_version": "GABRIEL_V3",
  "transcript": "...",
  "analysis": { "tempo_bpm": ..., "pitch_hz": ..., ... }
}
```

**85% royalty floor confirmed. NC_01–NC_10 clear. GORUNFREE active. Epoch V.**

---

## ⑨ PROCESS AN EXISTING WAV WITH CLI

Already have a WAV from Apollo or another session?

```bash
# Single file
python voice_processor.py path/to/yourfile.wav --actor RSP_001 --enhance --model base

# Batch folder
python voice_processor.py ./noizyvox_output --batch --actor RSP_001 --enhance

# View the ledger
python voice_processor.py --list-ledger
```

---

## ⑩ KNOWN GOTCHAS

| Issue | Fix |
|-------|-----|
| `OSError: PortAudio not found` | `brew install portaudio` then `pip install sounddevice` |
| Browser says "no server" | Start `voice_receiver.py` first, then reload portal |
| Whisper slow on first run | Normal — downloading model. Subsequent calls are fast. |
| Apollo not detected | Run `--list-devices`, check exact index, use `--device N` |
| `ffmpeg not found` | `brew install ffmpeg` — required for browser webm→wav |
| `librosa pyin slow` | Normal for pitch detection on long files — try `--model tiny` for speed |

---

## CONSENT KEY · RSP_001

```
NOIZY-RSP001-CONSENT-A7F3C9B2E1D4850F-AVA-GLOBAL-CANADA-20260314
```

This key anchors every utterance to your identity as Founding RSP. It is written into every provenance record. It cannot be removed retroactively. Every WAV you record from this day forward carries it.

---

**GORUNFREE · RSP_001 · 85% ROYALTY FLOOR · NC_01–NC_10 CLEAR · EPOCH V**
*The First Utterance is the First Entry in the 500-Year Voice Codex.*
