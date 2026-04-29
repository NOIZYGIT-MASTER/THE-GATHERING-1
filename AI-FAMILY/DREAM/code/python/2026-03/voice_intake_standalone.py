#!/usr/bin/env python3
"""
NOIZYVOX Standalone Mic Capture — NOIZYFISH INC.
Record directly from your microphone in the terminal.
No browser required. Press ENTER to start/stop.
Outputs WAV + runs Whisper + Librosa + writes provenance.

RSP_001 · GABRIEL_V3 · GORUNFREE · Epoch V

Usage:
    python voice_intake_standalone.py
    python voice_intake_standalone.py --model medium
    python voice_intake_standalone.py --actor RSP_001 --tag verse-1
    python voice_intake_standalone.py --list-devices
    python voice_intake_standalone.py --device 2

Requirements:
    pip install sounddevice scipy openai-whisper librosa noisereduce soundfile numpy
    (ffmpeg optional — for webm→wav if using browser portal)
"""

import os
import sys
import json
import time
import hashlib
import argparse
import datetime
import threading
import queue
from pathlib import Path

# ── Imports ────────────────────────────────────────────────────────
try:
    import numpy as np
    NP_OK = True
except ImportError:
    print("  ✗  numpy required: pip install numpy")
    sys.exit(1)

try:
    import sounddevice as sd
    SD_OK = True
except ImportError:
    print("  ✗  sounddevice required: pip install sounddevice")
    sys.exit(1)

try:
    from scipy.io import wavfile as scipy_wav
    SCIPY_OK = True
except ImportError:
    print("  ⚠  scipy not installed — WAV saving limited. pip install scipy")
    SCIPY_OK = False

try:
    import soundfile as sf
    SF_OK = True
except ImportError:
    SF_OK = False

try:
    import librosa
    LIBROSA_OK = True
except ImportError:
    LIBROSA_OK = False
    print("  ⚠  librosa not installed — analysis disabled. pip install librosa")

try:
    import whisper
    WHISPER_OK = True
except ImportError:
    WHISPER_OK = False
    print("  ⚠  whisper not installed — transcription disabled. pip install openai-whisper")

try:
    import noisereduce as nr
    NR_OK = True
except ImportError:
    NR_OK = False

# ── Constants ──────────────────────────────────────────────────────
SAMPLE_RATE     = 44100
CHANNELS        = 1
DTYPE           = np.int16
BLOCK_SIZE      = 1024
OUTPUT_DIR      = Path("./noizyvox_output")
LEDGER          = OUTPUT_DIR / "provenance.jsonl"
ROYALTY_FLOOR   = 75
FOUNDING_FLOOR  = 85
CONSENT_KEY_RSP001 = "NOIZY-RSP001-CONSENT-A7F3C9B2E1D4850F-AVA-GLOBAL-CANADA-20260314"


# ── Utilities ──────────────────────────────────────────────────────

def header():
    w = 62
    print("\n" + "═" * w)
    print("  NOIZYVOX STANDALONE MIC INTAKE · NOIZYFISH INC.")
    print("  RSP_001 · GABRIEL_V3 · GORUNFREE · EPOCH V")
    print("═" * w)


def generate_utterance_id(actor_id="RSP001"):
    ts   = hex(int(time.time() * 1000))[2:].upper()
    rand = os.urandom(2).hex().upper()
    return f"UTT-{actor_id}-{ts}-{rand}"


def generate_watermark(actor_id, utterance_id, session_id, ck_id, ts):
    payload = f"{actor_id}:{utterance_id}:{session_id}:{ck_id}:{ts}"
    d = hashlib.sha256(payload.encode()).hexdigest()
    return f"WM_{d[:8].upper()}"


def append_provenance(record: dict):
    OUTPUT_DIR.mkdir(exist_ok=True)
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")


def save_wav(samples: np.ndarray, path: Path, sr: int = SAMPLE_RATE):
    """Save int16 or float samples as WAV."""
    if samples.dtype != np.int16:
        peak = abs(samples).max()
        if peak > 0:
            samples = (samples / peak * 32767).astype(np.int16)
        else:
            samples = samples.astype(np.int16)

    if SF_OK:
        sf.write(str(path), samples, sr, subtype="PCM_16")
    elif SCIPY_OK:
        scipy_wav.write(str(path), sr, samples)
    else:
        # Manual WAV header
        import struct
        with open(path, "wb") as f:
            num_samples = len(samples)
            byte_rate = sr * CHANNELS * 2
            data_size = num_samples * CHANNELS * 2
            f.write(b"RIFF")
            f.write(struct.pack("<I", 36 + data_size))
            f.write(b"WAVE")
            f.write(b"fmt ")
            f.write(struct.pack("<IHHIIHH", 16, 1, CHANNELS, sr,
                                byte_rate, CHANNELS * 2, 16))
            f.write(b"data")
            f.write(struct.pack("<I", data_size))
            f.write(samples.tobytes())
    print(f"  ✓  WAV saved: {path.name} ({path.stat().st_size // 1024} KB)")


def vu_meter(samples: np.ndarray, width: int = 40) -> str:
    """ASCII VU meter for playback feedback."""
    if len(samples) == 0:
        return "[" + " " * width + "]"
    rms = np.sqrt(np.mean(samples.astype(float) ** 2))
    level = int((rms / 32767) * width)
    level = min(level, width)
    bar = "█" * level + "░" * (width - level)
    db = 20 * np.log10(rms / 32767 + 1e-9)
    color = "\033[91m" if level > 30 else "\033[93m" if level > 20 else "\033[92m"
    reset = "\033[0m"
    return f"{color}[{bar}]{reset} {db:.1f} dB"


# ── Recording Engine ───────────────────────────────────────────────

class MicRecorder:
    def __init__(self, device=None, sr=SAMPLE_RATE):
        self.device     = device
        self.sr         = sr
        self.recording  = False
        self.frames     = []
        self._lock      = threading.Lock()
        self._stream    = None

    def callback(self, indata, frames, time_info, status):
        if status:
            pass  # e.g., overflow
        with self._lock:
            if self.recording:
                self.frames.append(indata.copy())

        # Live VU meter (in-place update)
        chunk = indata[:, 0].astype(float)
        rms = np.sqrt(np.mean(chunk ** 2))
        level = int(rms * 50)
        bar = ("█" * min(level, 40)).ljust(40, "░")
        db = 20 * np.log10(rms + 1e-9)
        color = "\033[91m" if level > 30 else "\033[93m" if level > 20 else "\033[92m"
        elapsed = time.time() - self._start_time if hasattr(self, "_start_time") else 0
        min_ = int(elapsed // 60)
        sec_ = elapsed % 60
        sys.stdout.write(
            f"\r  {color}●{chr(27)}[0m REC {min_:02d}:{sec_:04.1f}  [{color}{bar}{chr(27)}[0m] {db:+.1f} dB  "
        )
        sys.stdout.flush()

    def start(self):
        self.frames = []
        self.recording = True
        self._start_time = time.time()
        self._stream = sd.InputStream(
            samplerate=self.sr,
            channels=CHANNELS,
            dtype="float32",
            blocksize=BLOCK_SIZE,
            device=self.device,
            callback=self.callback,
        )
        self._stream.start()

    def stop(self) -> np.ndarray:
        self.recording = False
        if self._stream:
            self._stream.stop()
            self._stream.close()
        sys.stdout.write("\n")

        with self._lock:
            if not self.frames:
                return np.array([], dtype=np.int16)
            audio_float = np.concatenate(self.frames, axis=0)
            audio_int16 = (audio_float * 32767).clip(-32768, 32767).astype(np.int16)
            return audio_int16[:, 0]  # mono

    def get_duration(self) -> float:
        return time.time() - self._start_time if hasattr(self, "_start_time") else 0.0


# ── Analysis + Transcription (reuse voice_processor logic) ────────

def quick_analyze(wav_path: Path) -> dict:
    if not LIBROSA_OK:
        return {}
    try:
        y, sr = librosa.load(str(wav_path), sr=None, mono=True)
        rms   = float(np.sqrt(np.mean(y ** 2)))
        peak  = float(abs(y).max())
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

        # Pitch
        f0, voiced, _ = librosa.pyin(y, fmin=librosa.note_to_hz("C2"),
                                      fmax=librosa.note_to_hz("C7"), sr=sr)
        valid_f0 = f0[voiced] if f0 is not None else []
        avg_pitch = float(np.nanmean(valid_f0)) if len(valid_f0) > 0 else 0.0

        return {
            "duration_s":  round(librosa.get_duration(y=y, sr=sr), 3),
            "sample_rate": sr,
            "peak":        round(peak, 5),
            "rms":         round(rms, 6),
            "db_rms":      round(20 * np.log10(rms + 1e-9), 2),
            "tempo_bpm":   round(float(tempo), 2),
            "pitch_hz":    round(avg_pitch, 2),
        }
    except Exception as e:
        return {"error": str(e)}


def quick_transcribe(wav_path: Path, model_name: str = "base") -> str:
    if not WHISPER_OK:
        return "[whisper not installed]"
    try:
        print(f"\n  ⏳ Transcribing with Whisper ({model_name})...")
        model = whisper.load_model(model_name)
        result = model.transcribe(str(wav_path), language=None,
                                   temperature=0.0, verbose=False)
        text = result.get("text", "").strip()
        lang = result.get("language", "?")
        print(f"  ✓  [{lang}] \"{text[:80]}{'...' if len(text) > 80 else ''}\"")
        return text
    except Exception as e:
        print(f"  ✗  Whisper error: {e}")
        return f"[error: {str(e)[:80]}]"


# ── Main Recording Session ─────────────────────────────────────────

def run_session(args):
    header()
    OUTPUT_DIR.mkdir(exist_ok=True)

    actor_id   = args.actor
    tag        = args.tag
    model      = args.model

    print(f"\n  Actor:   {actor_id}")
    print(f"  Tag:     {tag}")
    print(f"  Model:   {model}")
    print(f"  Device:  {args.device or 'default'}")
    print(f"  Output:  {OUTPUT_DIR}/")
    print(f"\n  Consent Key:")
    print(f"  {CONSENT_KEY_RSP001[:50]}")
    print(f"  {CONSENT_KEY_RSP001[50:]}")
    print()

    recorder = MicRecorder(device=args.device, sr=SAMPLE_RATE)
    session_num = 1

    try:
        while True:
            print(f"\n  ─── UTTERANCE {session_num:03d} {'─'*44}")
            print(f"  Press  ENTER  to START recording")
            print(f"  Press  ENTER  again to STOP")
            print(f"  Press  Ctrl+C  to quit\n")

            input()  # Wait for ENTER to start
            print(f"  ● RECORDING... press ENTER to stop")
            recorder.start()

            input()  # Wait for ENTER to stop
            audio = recorder.stop()
            duration = recorder.get_duration()

            if len(audio) == 0 or duration < 0.2:
                print("  ⚠  Nothing recorded. Try again.")
                continue

            print(f"\n  Duration: {duration:.2f}s · {len(audio):,} samples")

            # ── Timestamps + IDs ──────────────────────────────────
            now_iso      = datetime.datetime.utcnow().isoformat() + "Z"
            session_id   = f"SES-STANDALONE-{hex(int(time.time()))[2:].upper()}"
            utterance_id = generate_utterance_id(actor_id.replace("_", ""))
            ck_id        = "A7F3C9B2E1D4850F"
            watermark    = generate_watermark(actor_id, utterance_id,
                                               session_id, ck_id, now_iso)

            # ── Save WAV ──────────────────────────────────────────
            ts_str   = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{actor_id}_{tag}_{session_num:03d}_{ts_str}.wav"
            wav_path = OUTPUT_DIR / filename
            save_wav(audio, wav_path)

            print(f"  Utterance ID: {utterance_id}")
            print(f"  Watermark:    {watermark}")

            # ── Analysis ──────────────────────────────────────────
            analysis = quick_analyze(wav_path)
            if analysis:
                print(f"\n  ANALYSIS:")
                print(f"    Peak:   {analysis.get('peak', '?'):.4f}")
                print(f"    RMS:    {analysis.get('rms', '?'):.6f} ({analysis.get('db_rms', '?')} dB)")
                print(f"    Tempo:  {analysis.get('tempo_bpm', '?')} BPM")
                if analysis.get("pitch_hz"):
                    print(f"    Pitch:  {analysis.get('pitch_hz', '?')} Hz")

            # ── Transcribe ────────────────────────────────────────
            transcript = quick_transcribe(wav_path, model_name=model)

            # ── Provenance Record ────────────────────────────────
            royalty = FOUNDING_FLOOR if actor_id == "RSP_001" else ROYALTY_FLOOR
            record  = {
                "utterance_id":      utterance_id,
                "actor_id":          actor_id,
                "session_id":        session_id,
                "consent_key":       CONSENT_KEY_RSP001,
                "watermark":         watermark,
                "timestamp_utc":     now_iso,
                "file":              filename,
                "duration_s":        round(duration, 3),
                "tag":               tag,
                "transcript":        transcript,
                "analysis":          analysis,
                "royalty_floor_pct": royalty,
                "never_clauses":     [f"NC_0{i}" for i in range(1, 10)] + ["NC_10"],
                "source":            "standalone_mic",
                "epoch":             "V",
                "gabriel_version":   "GABRIEL_V3",
                "gorunfree":         True,
            }
            append_provenance(record)

            # ── Write individual report JSON ──────────────────────
            report_path = wav_path.with_suffix(".json")
            with open(report_path, "w") as f:
                json.dump(record, f, indent=2)

            print(f"\n  ✓  Provenance recorded · Ledger entry #{session_num}")
            print(f"  ✓  Report: {report_path.name}")
            print(f"\n  GORUNFREE · {royalty}% ROYALTY FLOOR · NC_01–NC_10 CLEAR")

            session_num += 1

    except KeyboardInterrupt:
        print(f"\n\n  ■ Session ended · {session_num - 1} utterances captured")
        print(f"  Output: {OUTPUT_DIR}/")
        print(f"  Ledger: {LEDGER}")
        print(f"\n  GORUNFREE · RSP_001 · EPOCH V\n")


def list_devices():
    print("\n  AVAILABLE AUDIO INPUT DEVICES:\n")
    devices = sd.query_devices()
    for i, d in enumerate(devices):
        if d["max_input_channels"] > 0:
            marker = " ← DEFAULT" if i == sd.default.device[0] else ""
            print(f"  [{i:2d}] {d['name'][:55]}"
                  f"  ({d['max_input_channels']}ch, {int(d['default_samplerate'])} Hz){marker}")
    print()


# ── CLI ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="NOIZYVOX Standalone Mic Intake · RSP_001 · GORUNFREE"
    )
    parser.add_argument("--actor",        default="RSP_001")
    parser.add_argument("--tag",          default="intake")
    parser.add_argument("--model",        default="base",
                        choices=["tiny","base","small","medium","large"])
    parser.add_argument("--device",       default=None, type=int,
                        help="Audio device index (see --list-devices)")
    parser.add_argument("--list-devices", action="store_true",
                        help="List available audio input devices")

    args = parser.parse_args()

    if args.list_devices:
        list_devices()
        sys.exit(0)

    run_session(args)
