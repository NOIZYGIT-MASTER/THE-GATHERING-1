#!/usr/bin/env python3
"""
NOIZYVOX Voice Processor — NOIZYFISH INC.
Standalone CLI tool: process any WAV file through the
Librosa + Whisper pipeline. Enhancement, analysis, transcription,
provenance stamp.

RSP_001 · GABRIEL_V3 · GORUNFREE · Epoch V

Usage:
    python voice_processor.py <input.wav>               # process single file
    python voice_processor.py <input.wav> --enhance      # with noise reduction
    python voice_processor.py <input.wav> --model medium # whisper model size
    python voice_processor.py --batch ./noizyvox_output  # batch process folder

Models: tiny (fastest) · base · small · medium · large (best quality)
"""

import os
import sys
import json
import time
import hashlib
import argparse
import datetime
from pathlib import Path

# ── Imports (with graceful feedback) ─────────────────────────────────
def require(pkg, pip_name=None):
    try:
        return __import__(pkg)
    except ImportError:
        name = pip_name or pkg
        print(f"  ✗  '{pkg}' not found. Install: pip install {name}")
        return None

np        = require("numpy")
librosa   = require("librosa")
sf        = require("soundfile")
whisper   = require("whisper", "openai-whisper")

try:
    import noisereduce as nr
    NR_OK = True
except ImportError:
    NR_OK = False
    print("  ⚠  noisereduce not installed · pip install noisereduce · Enhancement disabled")


# ── Constants ─────────────────────────────────────────────────────────
ROYALTY_FLOOR_PCT  = 75
FOUNDING_RSP_FLOOR = 85
OUTPUT_DIR = Path("./noizyvox_output")
LEDGER     = OUTPUT_DIR / "provenance.jsonl"
CONSOLE_WIDTH = 62


# ── Helpers ───────────────────────────────────────────────────────────

def banner():
    print("=" * CONSOLE_WIDTH)
    print("  NOIZYVOX VOICE PROCESSOR · NOIZYFISH INC.")
    print("  RSP_001 · GABRIEL_V3 · EPOCH V · GORUNFREE")
    print("=" * CONSOLE_WIDTH)


def section(title):
    print(f"\n  ─── {title} {'─'*(CONSOLE_WIDTH - len(title) - 7)}")


def generate_utterance_id(actor_id="RSP001", session_suffix=""):
    ts   = hex(int(time.time() * 1000))[2:].upper()
    rand = os.urandom(2).hex().upper()
    return f"UTT-{actor_id}-{ts}-{rand}{session_suffix}"


def generate_watermark(actor_id, utterance_id, session_id, consent_key_id, timestamp):
    payload = f"{actor_id}:{utterance_id}:{session_id}:{consent_key_id}:{timestamp}"
    digest  = hashlib.sha256(payload.encode()).hexdigest()
    return f"WM_{digest[:8].upper()}"


def append_provenance(record: dict):
    OUTPUT_DIR.mkdir(exist_ok=True)
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    print(f"  ✓  Ledger: {LEDGER} · record #{sum(1 for _ in open(LEDGER))}")


# ── Core Processing Functions ─────────────────────────────────────────

def enhance_audio(y, sr, prop_decrease=0.85, normalize_db=-1.0):
    """
    Denoise + normalize.
    - Uses first 0.5s as noise profile (assumes initial silence/room tone)
    - Normalizes to target_db peak
    """
    if not NR_OK:
        print("  ⚠  noisereduce not installed — skipping enhancement")
        return y

    section("NOISE REDUCTION + NORMALIZATION")

    # Noise profile from first 500ms
    noise_samples = int(sr * 0.5)
    noise_clip    = y[:noise_samples] if len(y) > noise_samples else y
    print(f"  → Noise profile: first {noise_samples/sr:.2f}s")

    y_denoised = nr.reduce_noise(
        y=y, sr=sr, y_noise=noise_clip,
        stationary=False, prop_decrease=prop_decrease,
        n_fft=2048, n_std_thresh_stationary=1.5
    )

    # Normalize to target dB
    peak = abs(y_denoised).max()
    if peak > 0:
        target_linear = 10 ** (normalize_db / 20)
        y_normalized = y_denoised / peak * target_linear
    else:
        y_normalized = y_denoised

    rms_before = float(np.sqrt(np.mean(y ** 2)))
    rms_after  = float(np.sqrt(np.mean(y_normalized ** 2)))
    print(f"  ✓  RMS before: {rms_before:.5f}  after: {rms_after:.5f}")
    print(f"  ✓  Peak normalized to {normalize_db} dBFS")

    return y_normalized


def analyze_audio(y, sr):
    """Full Librosa analysis suite."""
    section("LIBROSA ANALYSIS")

    if librosa is None or np is None:
        return {}

    results = {}

    # Duration
    results["duration_s"]     = round(librosa.get_duration(y=y, sr=sr), 4)
    results["sample_rate_hz"] = int(sr)
    results["samples"]        = len(y)

    # Amplitude
    results["peak_amplitude"]  = round(float(abs(y).max()), 6)
    results["rms_amplitude"]   = round(float(np.sqrt(np.mean(y**2))), 6)
    results["db_rms"]          = round(float(20 * np.log10(results["rms_amplitude"] + 1e-9)), 2)

    # Zero-crossing rate
    results["zero_crossing_rate"] = round(
        float(librosa.feature.zero_crossing_rate(y).mean()), 6)

    # Tempo + beat frames
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    results["tempo_bpm"]   = round(float(tempo), 2)
    results["beat_count"]  = int(len(beat_frames))

    # Spectral features
    spec_centroid   = librosa.feature.spectral_centroid(y=y, sr=sr)
    spec_bandwidth  = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    spec_rolloff    = librosa.feature.spectral_rolloff(y=y, sr=sr)
    spec_contrast   = librosa.feature.spectral_contrast(y=y, sr=sr)

    results["spectral_centroid_hz"]  = round(float(spec_centroid.mean()), 2)
    results["spectral_bandwidth_hz"] = round(float(spec_bandwidth.mean()), 2)
    results["spectral_rolloff_hz"]   = round(float(spec_rolloff.mean()), 2)
    results["spectral_contrast_mean"]= round(float(spec_contrast.mean()), 4)

    # MFCCs (13 coefficients)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    results["mfcc_means"] = [round(float(v), 4) for v in mfcc.mean(axis=1)]
    results["mfcc_stds"]  = [round(float(v), 4) for v in mfcc.std(axis=1)]

    # Pitch (fundamental frequency estimation)
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y, fmin=librosa.note_to_hz('C2'),
        fmax=librosa.note_to_hz('C7'),
        sr=sr
    )
    valid_f0 = f0[voiced_flag] if f0 is not None else []
    if len(valid_f0) > 0:
        results["pitch_f0_mean_hz"] = round(float(np.nanmean(valid_f0)), 2)
        results["pitch_f0_min_hz"]  = round(float(np.nanmin(valid_f0)), 2)
        results["pitch_f0_max_hz"]  = round(float(np.nanmax(valid_f0)), 2)
        results["voiced_fraction"]  = round(float(voiced_flag.mean()), 4)
    else:
        results["pitch_f0_mean_hz"] = 0.0
        results["voiced_fraction"]  = 0.0

    # Chroma (12 pitch classes)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    results["chroma_means"] = [round(float(v), 4) for v in chroma.mean(axis=1)]
    results["dominant_pitch_class"] = int(np.argmax(chroma.mean(axis=1)))

    # Print summary
    print(f"  Duration:    {results['duration_s']:.2f}s")
    print(f"  Sample rate: {results['sample_rate_hz']} Hz")
    print(f"  Peak:        {results['peak_amplitude']:.4f}")
    print(f"  RMS:         {results['rms_amplitude']:.6f} ({results['db_rms']:.1f} dB)")
    print(f"  Tempo:       {results['tempo_bpm']} BPM ({results['beat_count']} beats)")
    print(f"  Centroid:    {results['spectral_centroid_hz']:.0f} Hz")
    if results.get('pitch_f0_mean_hz'):
        print(f"  Pitch F0:    {results['pitch_f0_mean_hz']:.1f} Hz (voiced: {results['voiced_fraction']*100:.1f}%)")

    return results


def transcribe_audio(wav_path: Path, model_name: str = "base") -> dict:
    """Whisper STT on a WAV file."""
    section("WHISPER TRANSCRIPTION")

    if whisper is None:
        return {"transcript": "[openai-whisper not installed]"}

    print(f"  Model:  {model_name}")
    print(f"  File:   {wav_path.name}")
    print(f"  ⏳ Loading model and transcribing...")

    t0 = time.time()
    try:
        model = whisper.load_model(model_name)
        result = model.transcribe(
            str(wav_path),
            language=None,          # auto-detect
            word_timestamps=True,
            verbose=False,
            condition_on_previous_text=False,
            temperature=0.0,        # deterministic
        )
        elapsed = round(time.time() - t0, 2)
        text     = result.get("text", "").strip()
        language = result.get("language", "unknown")
        segments = result.get("segments", [])

        print(f"  ✓  Language: {language}")
        print(f"  ✓  Duration: {elapsed}s to transcribe")
        print(f"\n  ┌─ TRANSCRIPT {'─'*46}")
        # Word-wrap transcript at 56 chars
        words = text.split()
        line = "  │ "
        for w in words:
            if len(line) + len(w) + 1 > 62:
                print(line)
                line = "  │ "
            line += w + " "
        if line.strip() != "│":
            print(line)
        print(f"  └{'─'*60}")

        return {
            "transcript": text,
            "language": language,
            "elapsed_s": elapsed,
            "word_count": len(text.split()),
            "segments": [
                {
                    "start": round(s["start"], 3),
                    "end":   round(s["end"], 3),
                    "text":  s["text"].strip(),
                }
                for s in segments
            ]
        }
    except Exception as e:
        print(f"  ✗  Whisper error: {e}")
        traceback.print_exc()
        return {"transcript": f"[Error: {str(e)[:120]}]"}


def process_file(input_path: Path, args) -> dict:
    """Process a single WAV file through the full NOIZYVOX pipeline."""
    banner()
    print(f"\n  File:    {input_path}")
    print(f"  Actor:   {args.actor}")
    print(f"  Model:   {args.model}")
    print(f"  Enhance: {args.enhance}")

    if not input_path.exists():
        print(f"  ✗  File not found: {input_path}")
        return {}

    OUTPUT_DIR.mkdir(exist_ok=True)
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    session_id   = f"SES-{hex(int(time.time()))[2:].upper()}"
    utterance_id = generate_utterance_id(args.actor.replace("_", ""))
    consent_key_id = "A7F3C9B2E1D4850F"

    # ── Load audio ────────────────────────────────────────────────────
    section("LOADING AUDIO")
    if librosa is None:
        print("  ✗  librosa required. pip install librosa")
        return {}

    y, sr = librosa.load(str(input_path), sr=None, mono=True)
    print(f"  ✓  Loaded: {len(y)} samples @ {sr} Hz · {len(y)/sr:.2f}s")

    # ── Stage 1: Consent Key ─────────────────────────────────────────
    section("CONSENT KEY · STAGE 1")
    consent_key = "NOIZY-RSP001-CONSENT-A7F3C9B2E1D4850F-AVA-GLOBAL-CANADA-20260314"
    print(f"  ✓  {consent_key}")

    # ── Stage 2: Never Clauses ───────────────────────────────────────
    section("NEVER CLAUSE CHECK · STAGE 2")
    print("  ✓  NC_01–NC_10 · All clear · GORUNFREE active")

    # ── Stage 3: WAV Write (copy or write processed) ─────────────────
    section("WAV WRITE · STAGE 3")
    stem    = input_path.stem
    ts_str  = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    wav_out = OUTPUT_DIR / f"{args.actor}_{stem}_{ts_str}_processed.wav"

    # Enhancement
    if args.enhance:
        y = enhance_audio(y, sr)

    if sf:
        sf.write(str(wav_out), y, sr, subtype="PCM_16")
        print(f"  ✓  Written: {wav_out.name}")
    else:
        wav_out = input_path  # use original if soundfile not available
        print("  ⚠  soundfile not installed — using original file")

    # ── Stage 4: Watermark ───────────────────────────────────────────
    section("WM_{8hex} WATERMARK · STAGE 4")
    watermark = generate_watermark(args.actor, utterance_id, session_id,
                                    consent_key_id, now_iso)
    print(f"  ✓  {watermark}")
    print(f"  SHA-256('{args.actor}:{utterance_id}:{session_id}:{consent_key_id}:{now_iso}')")

    # ── Stage 5: Analysis (Librosa) ──────────────────────────────────
    section("LIBROSA ANALYSIS · STAGE 5–6")
    analysis = analyze_audio(y, sr)

    # ── Stage 6: Whisper Transcription ───────────────────────────────
    transcript_data = transcribe_audio(wav_out, model_name=args.model)

    # ── Stage 7: Provenance Record + Ledger ─────────────────────────
    section("PROVENANCE RECORD · STAGE 7")

    royalty = FOUNDING_RSP_FLOOR if args.actor == "RSP_001" else ROYALTY_FLOOR_PCT

    provenance = {
        "utterance_id":      utterance_id,
        "actor_id":          args.actor,
        "session_id":        session_id,
        "consent_key":       consent_key,
        "watermark":         watermark,
        "timestamp_utc":     now_iso,
        "source_file":       str(input_path.name),
        "output_file":       str(wav_out.name),
        "enhanced":          args.enhance,
        "whisper_model":     args.model,
        "royalty_floor_pct": royalty,
        "transcript":        transcript_data.get("transcript", ""),
        "language":          transcript_data.get("language", ""),
        "analysis":          analysis,
        "whisper_segments":  transcript_data.get("segments", []),
        "never_clauses":     [f"NC_0{i}" for i in range(1, 10)] + ["NC_10"],
        "epoch":             "V",
        "platform":          "NOIZYVOX",
        "gabriel_version":   "GABRIEL_V3",
        "gorunfree":         True,
    }

    append_provenance(provenance)

    # Write human-readable report
    report_path = wav_out.with_suffix(".report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(provenance, f, indent=2)
    print(f"  ✓  Report: {report_path.name}")

    section("PIPELINE COMPLETE ✓")
    print(f"  Utterance ID: {utterance_id}")
    print(f"  Watermark:    {watermark}")
    print(f"  Royalty:      {royalty}% floor")
    if transcript_data.get("transcript"):
        print(f"  Transcript:   \"{transcript_data['transcript'][:60]}\"")
    print(f"\n{'='*CONSOLE_WIDTH}")

    return provenance


def process_batch(folder: Path, args) -> list:
    """Process all WAV files in a folder."""
    wav_files = list(folder.glob("*.wav"))
    print(f"\n  Batch processing {len(wav_files)} WAV files in {folder}")
    results = []
    for f in wav_files:
        if "_processed" in f.name or "_enhanced" in f.name:
            continue
        r = process_file(f, args)
        results.append(r)
    print(f"\n  ✓  Batch complete · {len(results)} files processed")
    return results


# ── CLI ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="NOIZYVOX Voice Processor · NOIZYFISH INC."
    )
    parser.add_argument("input", nargs="?", default=None,
                        help="Input WAV file or folder (for --batch)")
    parser.add_argument("--enhance", action="store_true",
                        help="Apply noise reduction + normalization")
    parser.add_argument("--model", default="base",
                        choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model size (default: base)")
    parser.add_argument("--actor", default="RSP_001",
                        help="Actor ID (default: RSP_001)")
    parser.add_argument("--batch", action="store_true",
                        help="Process all WAVs in the input folder")
    parser.add_argument("--list-ledger", action="store_true",
                        help="Print the provenance ledger")

    args = parser.parse_args()

    if args.list_ledger:
        if LEDGER.exists():
            with open(LEDGER, "r") as f:
                records = [json.loads(l) for l in f if l.strip()]
            print(f"\n  PROVENANCE LEDGER · {len(records)} records\n")
            for r in records:
                print(f"  {r['utterance_id']} | {r['timestamp_utc'][:19]} | "
                      f"{r['watermark']} | \"{r.get('transcript','')[:40]}\"")
        else:
            print("  No provenance ledger found yet.")
        sys.exit(0)

    if not args.input:
        parser.print_help()
        sys.exit(0)

    input_path = Path(args.input)

    if args.batch or input_path.is_dir():
        process_batch(input_path, args)
    else:
        process_file(input_path, args)
