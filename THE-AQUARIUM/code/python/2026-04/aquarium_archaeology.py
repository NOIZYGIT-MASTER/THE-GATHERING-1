#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     █████╗  ██████╗ ██╗   ██╗ █████╗ ██████╗ ██╗██╗   ██╗███╗   ███╗        ║
║    ██╔══██╗██╔═══██╗██║   ██║██╔══██╗██╔══██╗██║██║   ██║████╗ ████║        ║
║    ███████║██║   ██║██║   ██║███████║██████╔╝██║██║   ██║██╔████╔██║        ║
║    ██╔══██║██║▄▄ ██║██║   ██║██╔══██║██╔══██╗██║██║   ██║██║╚██╔╝██║        ║
║    ██║  ██║╚██████╔╝╚██████╔╝██║  ██║██║  ██║██║╚██████╔╝██║ ╚═╝ ██║        ║
║    ╚═╝  ╚═╝ ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚═╝        ║
║                                                                              ║
║                    A R C H A E O L O G Y   S C A N N E R                     ║
║                                                                              ║
║    "Mapping the Quan/Plowman vocal signature across 34TB of legacy."         ║
║                                                                              ║
║    For Rob Plowman / Fish Music Inc / NOIZYVOX                               ║
║    40 years of sonic archaeology in one script.                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

AQUARIUM ARCHAEOLOGY SCANNER v1.0
═════════════════════════════════════════════════════════════════════════════════

Scans THE_AQUARIUM (34TB archive) to find and isolate vocal signatures.
Uses spectral analysis, AI stem separation, and legacy hiss removal.

FEATURES:
    • Spectral flatness analysis for voice detection
    • HTDemucs AI stem isolation (M2 Ultra Neural Engine)
    • 11kHz legacy hiss removal
    • Parallel scanning with progress tracking
    • GABRIEL integration for organized output
    • Fingerprint generation for NOIZYVOX training

USAGE:
    # Scan entire archive
    python aquarium_archaeology.py scan /Volumes/Aquarium_34TB

    # Scan specific folder
    python aquarium_archaeology.py scan /path/to/folder --output ./vocals

    # Isolate vocals from specific file
    python aquarium_archaeology.py isolate song.wav --output ./isolated

    # Generate vocal fingerprint for NOIZYVOX
    python aquarium_archaeology.py fingerprint ./vocals/*.wav

REQUIREMENTS:
    pip install librosa numpy scipy soundfile demucs torch torchaudio

"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Iterator

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

# Vocal frequency ranges
VOCAL_FREQ_LOW = 80      # Hz - lowest male fundamental
VOCAL_FREQ_HIGH = 255    # Hz - highest female fundamental  
VOCAL_FORMANT_LOW = 300  # Hz - first formant start
VOCAL_FORMANT_HIGH = 4000  # Hz - formant ceiling

# Archive paths (configurable)
DEFAULT_ARCHIVE_PATH = "/Volumes/Aquarium_34TB"
DEFAULT_OUTPUT_PATH = "./aquarium_vocals"

# Analysis thresholds
SPECTRAL_FLATNESS_THRESHOLD = 0.05  # Below this = complex audio (potential voice)
VOCAL_ENERGY_THRESHOLD = 0.3        # Minimum energy in vocal range
MIN_DURATION_SECONDS = 1.0          # Minimum audio length to analyze
ANALYSIS_DURATION = 5.0             # Seconds to analyze per file

# Legacy hiss removal
LEGACY_HISS_FREQ = 11000  # Hz - common tape hiss frequency
HISS_REDUCTION_DB = -20   # dB reduction for hiss

# Supported audio formats
AUDIO_EXTENSIONS = {
    ".wav", ".mp3", ".flac", ".aiff", ".aif", 
    ".ogg", ".m4a", ".wma", ".opus", ".webm",
}

# File size limits
MIN_FILE_SIZE = 10 * 1024           # 10KB minimum
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB maximum


# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class VocalSignature:
    """Represents a detected vocal signature."""
    
    file_path: str
    detected_at: str
    duration_seconds: float
    sample_rate: int
    
    # Spectral features
    spectral_flatness: float
    spectral_centroid: float
    vocal_energy_ratio: float
    
    # Classification
    is_vocal: bool
    confidence: float
    vocal_type: str  # "speech", "singing", "mixed", "unknown"
    
    # Metadata
    file_size: int
    file_hash: str
    
    # Processing status
    isolated: bool = False
    isolated_path: Optional[str] = None
    hiss_removed: bool = False
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "VocalSignature":
        return cls(**data)


@dataclass
class ScanResult:
    """Result of an archive scan."""
    
    scan_id: str
    started_at: str
    completed_at: Optional[str] = None
    
    # Statistics
    files_scanned: int = 0
    files_with_vocals: int = 0
    files_skipped: int = 0
    files_errored: int = 0
    
    # Data
    signatures: List[VocalSignature] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    
    # Timing
    total_duration_scanned: float = 0.0  # seconds of audio
    processing_time_seconds: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            **asdict(self),
            "signatures": [s.to_dict() for s in self.signatures],
        }
    
    def save(self, path: Path) -> None:
        """Save scan result to JSON."""
        path.write_text(
            json.dumps(self.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CONSOLE OUTPUT (Zero Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════

class Console:
    """Simple console output with ANSI colors."""
    
    # ANSI codes
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    
    def __init__(self, color: bool = True):
        self.color = color and sys.stdout.isatty()
    
    def _fmt(self, text: str, *codes: str) -> str:
        if not self.color:
            return text
        return "".join(codes) + text + self.RESET
    
    def banner(self, text: str) -> None:
        width = 70
        print()
        print(self._fmt("╔" + "═" * (width - 2) + "╗", self.CYAN, self.BOLD))
        print(self._fmt("║" + text.center(width - 2) + "║", self.CYAN, self.BOLD))
        print(self._fmt("╚" + "═" * (width - 2) + "╝", self.CYAN, self.BOLD))
        print()
    
    def section(self, text: str) -> None:
        print()
        print(self._fmt(f"═══ {text} ", self.CYAN) + self._fmt("═" * (60 - len(text)), self.DIM))
    
    def success(self, text: str) -> None:
        print(self._fmt("  ✓ ", self.GREEN) + text)
    
    def error(self, text: str) -> None:
        print(self._fmt("  ✗ ", self.RED) + text)
    
    def warning(self, text: str) -> None:
        print(self._fmt("  ⚠ ", self.YELLOW) + text)
    
    def info(self, text: str) -> None:
        print(self._fmt("  ℹ ", self.BLUE) + text)
    
    def item(self, text: str) -> None:
        print(self._fmt("  → ", self.MAGENTA) + text)
    
    def progress(self, current: int, total: int, prefix: str = "") -> None:
        pct = int(100 * current / total) if total > 0 else 0
        bar_len = 40
        filled = int(bar_len * current / total) if total > 0 else 0
        bar = "█" * filled + "░" * (bar_len - filled)
        
        line = f"\r  {prefix}[{bar}] {pct:3d}% ({current}/{total})"
        print(line, end="", flush=True)
        
        if current >= total:
            print()


console = Console()


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIO ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

def lazy_import_librosa():
    """Lazy import librosa to speed up CLI startup."""
    import librosa
    return librosa


def lazy_import_numpy():
    """Lazy import numpy."""
    import numpy as np
    return np


def file_hash(path: Path, chunk_size: int = 65536) -> str:
    """Generate SHA256 hash of file (first 1MB for speed)."""
    sha = hashlib.sha256()
    max_bytes = 1024 * 1024  # 1MB
    bytes_read = 0
    
    with open(path, "rb") as f:
        while bytes_read < max_bytes:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            sha.update(chunk)
            bytes_read += len(chunk)
    
    return sha.hexdigest()


def analyze_audio(file_path: Path) -> Optional[VocalSignature]:
    """
    Analyze audio file for vocal content.
    
    Uses spectral analysis to detect human voice characteristics:
    - Spectral flatness (low = complex/tonal = potential voice)
    - Energy in vocal frequency range
    - Spectral centroid for voice classification
    """
    librosa = lazy_import_librosa()
    np = lazy_import_numpy()
    
    try:
        # Load audio (5 second sample for speed)
        y, sr = librosa.load(
            str(file_path), 
            duration=ANALYSIS_DURATION, 
            sr=None,
            mono=True,
        )
        
        if len(y) == 0:
            return None
        
        duration = len(y) / sr
        
        if duration < MIN_DURATION_SECONDS:
            return None
        
        # ─────────────────────────────────────────────────────────────
        # Spectral Analysis
        # ─────────────────────────────────────────────────────────────
        
        # Spectral flatness: low value = tonal/complex (voice, music)
        # high value = noisy (white noise, percussion)
        flatness = librosa.feature.spectral_flatness(y=y)
        mean_flatness = float(np.mean(flatness))
        
        # Spectral centroid: "brightness" of sound
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        mean_centroid = float(np.mean(centroid))
        
        # Energy in vocal frequency range
        # Compute STFT
        D = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)
        
        # Find vocal range bins
        vocal_mask = (freqs >= VOCAL_FREQ_LOW) & (freqs <= VOCAL_FORMANT_HIGH)
        total_energy = np.sum(D ** 2)
        vocal_energy = np.sum(D[vocal_mask] ** 2) if np.any(vocal_mask) else 0
        
        vocal_ratio = float(vocal_energy / total_energy) if total_energy > 0 else 0
        
        # ─────────────────────────────────────────────────────────────
        # Classification
        # ─────────────────────────────────────────────────────────────
        
        # Determine if this is likely vocal content
        is_vocal = (
            mean_flatness < SPECTRAL_FLATNESS_THRESHOLD and
            vocal_ratio > VOCAL_ENERGY_THRESHOLD
        )
        
        # Calculate confidence
        flatness_score = max(0, 1 - (mean_flatness / SPECTRAL_FLATNESS_THRESHOLD))
        energy_score = min(1, vocal_ratio / VOCAL_ENERGY_THRESHOLD)
        confidence = (flatness_score + energy_score) / 2
        
        # Classify vocal type based on centroid
        if is_vocal:
            if mean_centroid < 1500:
                vocal_type = "speech"  # Lower centroid = speech
            elif mean_centroid < 3000:
                vocal_type = "singing"  # Mid centroid = singing
            else:
                vocal_type = "mixed"
        else:
            vocal_type = "unknown"
        
        # ─────────────────────────────────────────────────────────────
        # Build signature
        # ─────────────────────────────────────────────────────────────
        
        return VocalSignature(
            file_path=str(file_path),
            detected_at=datetime.now().isoformat(),
            duration_seconds=duration,
            sample_rate=sr,
            spectral_flatness=mean_flatness,
            spectral_centroid=mean_centroid,
            vocal_energy_ratio=vocal_ratio,
            is_vocal=is_vocal,
            confidence=confidence,
            vocal_type=vocal_type,
            file_size=file_path.stat().st_size,
            file_hash=file_hash(file_path),
        )
        
    except Exception as e:
        console.error(f"Analysis failed: {file_path.name} - {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# VOCAL ISOLATION (HTDemucs)
# ═══════════════════════════════════════════════════════════════════════════════

def isolate_vocals(
    input_path: Path,
    output_dir: Path,
    remove_hiss: bool = True,
) -> Optional[Path]:
    """
    Isolate vocals using HTDemucs AI model.
    
    Uses the M2 Ultra Neural Engine for acceleration.
    Optionally removes 11kHz legacy tape hiss.
    """
    try:
        import torch
        import torchaudio
        from demucs import pretrained
        from demucs.apply import apply_model
        
    except ImportError:
        console.error("Demucs not installed. Run: pip install demucs")
        return None
    
    np = lazy_import_numpy()
    
    console.info(f"Isolating vocals: {input_path.name}")
    
    try:
        # Load model (htdemucs is the best quality)
        model = pretrained.get_model("htdemucs")
        
        # Use MPS (Metal) on Apple Silicon, CUDA on NVIDIA, else CPU
        if torch.backends.mps.is_available():
            device = torch.device("mps")
            console.info("Using M2 Ultra Neural Engine (MPS)")
        elif torch.cuda.is_available():
            device = torch.device("cuda")
            console.info("Using CUDA GPU")
        else:
            device = torch.device("cpu")
            console.info("Using CPU")
        
        model.to(device)
        
        # Load audio
        waveform, sr = torchaudio.load(str(input_path))
        
        # Ensure stereo
        if waveform.shape[0] == 1:
            waveform = waveform.repeat(2, 1)
        
        # Add batch dimension
        waveform = waveform.unsqueeze(0).to(device)
        
        # Apply model
        with torch.no_grad():
            sources = apply_model(model, waveform, device=device)
        
        # Extract vocals (index 3 in htdemucs: drums, bass, other, vocals)
        vocals = sources[0, 3]  # Shape: [2, samples]
        
        # Move to CPU for processing
        vocals = vocals.cpu().numpy()
        
        # ─────────────────────────────────────────────────────────────
        # Legacy Hiss Removal
        # ─────────────────────────────────────────────────────────────
        
        if remove_hiss:
            from scipy import signal
            
            console.info("Removing 11kHz legacy hiss...")
            
            # Design notch filter at 11kHz
            Q = 30.0  # Quality factor
            w0 = LEGACY_HISS_FREQ / (sr / 2)  # Normalized frequency
            
            if w0 < 1.0:  # Only if within Nyquist
                b, a = signal.iirnotch(w0, Q)
                
                # Apply to both channels
                vocals[0] = signal.filtfilt(b, a, vocals[0])
                vocals[1] = signal.filtfilt(b, a, vocals[1])
        
        # ─────────────────────────────────────────────────────────────
        # Save Output
        # ─────────────────────────────────────────────────────────────
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_name = f"{input_path.stem}_vocals.wav"
        output_path = output_dir / output_name
        
        # Convert to tensor and save
        vocals_tensor = torch.from_numpy(vocals)
        torchaudio.save(str(output_path), vocals_tensor, sr)
        
        console.success(f"Saved: {output_path}")
        
        return output_path
        
    except Exception as e:
        console.error(f"Isolation failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# ARCHIVE SCANNER
# ═══════════════════════════════════════════════════════════════════════════════

def find_audio_files(root: Path) -> Iterator[Path]:
    """
    Find all audio files in directory tree.
    
    Yields files matching audio extensions within size limits.
    """
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        
        if path.suffix.lower() not in AUDIO_EXTENSIONS:
            continue
        
        try:
            size = path.stat().st_size
            if size < MIN_FILE_SIZE or size > MAX_FILE_SIZE:
                continue
        except OSError:
            continue
        
        yield path


def scan_archive(
    archive_path: Path,
    output_dir: Path,
    parallel: bool = True,
    max_workers: int = 4,
    isolate: bool = False,
) -> ScanResult:
    """
    Scan archive for vocal content.
    
    Args:
        archive_path: Root directory to scan
        output_dir: Where to save results
        parallel: Use parallel processing
        max_workers: Number of parallel workers
        isolate: Also isolate detected vocals
        
    Returns:
        ScanResult with all findings
    """
    console.banner("AQUARIUM ARCHAEOLOGY SCANNER")
    
    scan_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    
    result = ScanResult(
        scan_id=scan_id,
        started_at=datetime.now().isoformat(),
    )
    
    start_time = time.time()
    
    # ─────────────────────────────────────────────────────────────────
    # Collect files
    # ─────────────────────────────────────────────────────────────────
    
    console.section("Collecting Audio Files")
    console.info(f"Scanning: {archive_path}")
    
    files = list(find_audio_files(archive_path))
    console.success(f"Found {len(files)} audio files")
    
    if not files:
        console.warning("No audio files found")
        result.completed_at = datetime.now().isoformat()
        return result
    
    # ─────────────────────────────────────────────────────────────────
    # Analyze files
    # ─────────────────────────────────────────────────────────────────
    
    console.section("Analyzing for Vocal Content")
    
    if parallel and len(files) > 10:
        # Parallel processing
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(analyze_audio, f): f
                for f in files
            }
            
            completed = 0
            for future in as_completed(futures):
                completed += 1
                console.progress(completed, len(files), prefix="Analyzing: ")
                
                try:
                    sig = future.result()
                    if sig:
                        result.files_scanned += 1
                        result.total_duration_scanned += sig.duration_seconds
                        
                        if sig.is_vocal:
                            result.files_with_vocals += 1
                            result.signatures.append(sig)
                    else:
                        result.files_skipped += 1
                        
                except Exception as e:
                    result.files_errored += 1
                    result.errors.append(str(e))
    else:
        # Sequential processing
        for i, file_path in enumerate(files):
            console.progress(i, len(files), prefix="Analyzing: ")
            
            try:
                sig = analyze_audio(file_path)
                if sig:
                    result.files_scanned += 1
                    result.total_duration_scanned += sig.duration_seconds
                    
                    if sig.is_vocal:
                        result.files_with_vocals += 1
                        result.signatures.append(sig)
                else:
                    result.files_skipped += 1
                    
            except Exception as e:
                result.files_errored += 1
                result.errors.append(f"{file_path}: {e}")
        
        console.progress(len(files), len(files), prefix="Analyzing: ")
    
    # ─────────────────────────────────────────────────────────────────
    # Isolate vocals if requested
    # ─────────────────────────────────────────────────────────────────
    
    if isolate and result.signatures:
        console.section("Isolating Vocals")
        
        vocals_dir = output_dir / "isolated_vocals"
        
        for i, sig in enumerate(result.signatures):
            console.progress(i, len(result.signatures), prefix="Isolating: ")
            
            isolated_path = isolate_vocals(
                Path(sig.file_path),
                vocals_dir,
                remove_hiss=True,
            )
            
            if isolated_path:
                sig.isolated = True
                sig.isolated_path = str(isolated_path)
                sig.hiss_removed = True
        
        console.progress(len(result.signatures), len(result.signatures), prefix="Isolating: ")
    
    # ─────────────────────────────────────────────────────────────────
    # Save results
    # ─────────────────────────────────────────────────────────────────
    
    result.completed_at = datetime.now().isoformat()
    result.processing_time_seconds = time.time() - start_time
    
    output_dir.mkdir(parents=True, exist_ok=True)
    result_path = output_dir / f"scan_result_{scan_id}.json"
    result.save(result_path)
    
    # ─────────────────────────────────────────────────────────────────
    # Summary
    # ─────────────────────────────────────────────────────────────────
    
    console.section("Scan Complete")
    
    console.info(f"Files scanned:      {result.files_scanned}")
    console.info(f"Files with vocals:  {result.files_with_vocals}")
    console.info(f"Files skipped:      {result.files_skipped}")
    console.info(f"Errors:             {result.files_errored}")
    console.info(f"Audio analyzed:     {result.total_duration_scanned / 3600:.1f} hours")
    console.info(f"Processing time:    {result.processing_time_seconds:.1f} seconds")
    
    console.success(f"Results saved: {result_path}")
    
    # Show top findings
    if result.signatures:
        console.section("Top Vocal Findings")
        
        # Sort by confidence
        top = sorted(result.signatures, key=lambda s: s.confidence, reverse=True)[:10]
        
        for sig in top:
            console.item(
                f"{Path(sig.file_path).name} "
                f"({sig.vocal_type}, {sig.confidence:.0%} confidence)"
            )
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# VOCAL FINGERPRINT (for NOIZYVOX)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class VocalFingerprint:
    """Fingerprint for NOIZYVOX voice cloning training."""
    
    source_files: List[str]
    total_duration_seconds: float
    sample_rate: int
    
    # Voice characteristics
    pitch_mean: float
    pitch_std: float
    formant_f1: float  # First formant average
    formant_f2: float  # Second formant average
    
    # Spectral features
    mfcc_means: List[float]  # 13 MFCC coefficients
    
    # Metadata
    created_at: str
    fingerprint_id: str
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    def save(self, path: Path) -> None:
        path.write_text(
            json.dumps(self.to_dict(), indent=2),
            encoding="utf-8"
        )


def generate_fingerprint(
    vocal_files: List[Path],
    output_path: Path,
) -> Optional[VocalFingerprint]:
    """
    Generate vocal fingerprint for NOIZYVOX training.
    
    Extracts voice characteristics for clone model training.
    """
    librosa = lazy_import_librosa()
    np = lazy_import_numpy()
    
    console.banner("NOIZYVOX FINGERPRINT GENERATOR")
    
    if not vocal_files:
        console.error("No vocal files provided")
        return None
    
    console.info(f"Analyzing {len(vocal_files)} vocal files...")
    
    all_pitches = []
    all_mfccs = []
    total_duration = 0.0
    sample_rate = None
    
    for i, path in enumerate(vocal_files):
        console.progress(i, len(vocal_files), prefix="Analyzing: ")
        
        try:
            y, sr = librosa.load(str(path), sr=None, mono=True)
            
            if sample_rate is None:
                sample_rate = sr
            
            duration = len(y) / sr
            total_duration += duration
            
            # Extract pitch
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            pitch_values = pitches[pitches > 0]
            if len(pitch_values) > 0:
                all_pitches.extend(pitch_values)
            
            # Extract MFCCs
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            all_mfccs.append(np.mean(mfccs, axis=1))
            
        except Exception as e:
            console.warning(f"Failed to analyze {path.name}: {e}")
    
    console.progress(len(vocal_files), len(vocal_files), prefix="Analyzing: ")
    
    if not all_pitches or not all_mfccs:
        console.error("Insufficient data for fingerprint")
        return None
    
    # Compute aggregates
    pitch_array = np.array(all_pitches)
    mfcc_stack = np.stack(all_mfccs)
    
    fingerprint = VocalFingerprint(
        source_files=[str(p) for p in vocal_files],
        total_duration_seconds=total_duration,
        sample_rate=sample_rate or 44100,
        pitch_mean=float(np.mean(pitch_array)),
        pitch_std=float(np.std(pitch_array)),
        formant_f1=float(np.percentile(pitch_array, 25)),  # Approximation
        formant_f2=float(np.percentile(pitch_array, 75)),
        mfcc_means=[float(x) for x in np.mean(mfcc_stack, axis=0)],
        created_at=datetime.now().isoformat(),
        fingerprint_id=hashlib.sha256(
            "".join(str(p) for p in vocal_files).encode()
        ).hexdigest()[:16],
    )
    
    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fingerprint.save(output_path)
    
    console.section("Fingerprint Generated")
    console.info(f"Total duration:  {total_duration / 60:.1f} minutes")
    console.info(f"Mean pitch:      {fingerprint.pitch_mean:.1f} Hz")
    console.info(f"Pitch range:     ±{fingerprint.pitch_std:.1f} Hz")
    console.success(f"Saved: {output_path}")
    
    return fingerprint


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Main CLI entry point."""
    
    parser = argparse.ArgumentParser(
        description="AQUARIUM ARCHAEOLOGY - Vocal signature scanner for THE_AQUARIUM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scan entire archive
  %(prog)s scan /Volumes/Aquarium_34TB

  # Scan with vocal isolation
  %(prog)s scan /path/to/music --isolate --output ./vocals

  # Isolate vocals from specific file
  %(prog)s isolate song.wav --output ./isolated

  # Generate NOIZYVOX fingerprint
  %(prog)s fingerprint ./vocals/*.wav --output fingerprint.json
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # ─────────────────────────────────────────────────────────────────
    # scan command
    # ─────────────────────────────────────────────────────────────────
    
    scan_parser = subparsers.add_parser("scan", help="Scan archive for vocals")
    scan_parser.add_argument("path", type=Path, help="Archive path to scan")
    scan_parser.add_argument(
        "--output", "-o", type=Path, 
        default=Path(DEFAULT_OUTPUT_PATH),
        help="Output directory"
    )
    scan_parser.add_argument(
        "--isolate", "-i", action="store_true",
        help="Also isolate detected vocals"
    )
    scan_parser.add_argument(
        "--workers", "-w", type=int, default=4,
        help="Number of parallel workers"
    )
    scan_parser.add_argument(
        "--sequential", action="store_true",
        help="Disable parallel processing"
    )
    
    # ─────────────────────────────────────────────────────────────────
    # isolate command
    # ─────────────────────────────────────────────────────────────────
    
    isolate_parser = subparsers.add_parser("isolate", help="Isolate vocals from file")
    isolate_parser.add_argument("file", type=Path, help="Audio file to process")
    isolate_parser.add_argument(
        "--output", "-o", type=Path,
        default=Path("./isolated"),
        help="Output directory"
    )
    isolate_parser.add_argument(
        "--no-hiss-removal", action="store_true",
        help="Skip 11kHz hiss removal"
    )
    
    # ─────────────────────────────────────────────────────────────────
    # fingerprint command
    # ─────────────────────────────────────────────────────────────────
    
    fp_parser = subparsers.add_parser("fingerprint", help="Generate NOIZYVOX fingerprint")
    fp_parser.add_argument("files", type=Path, nargs="+", help="Vocal files to analyze")
    fp_parser.add_argument(
        "--output", "-o", type=Path,
        default=Path("./vocal_fingerprint.json"),
        help="Output JSON path"
    )
    
    # ─────────────────────────────────────────────────────────────────
    # Parse and execute
    # ─────────────────────────────────────────────────────────────────
    
    args = parser.parse_args()
    
    if args.command == "scan":
        if not args.path.exists():
            console.error(f"Path not found: {args.path}")
            sys.exit(1)
        
        scan_archive(
            args.path,
            args.output,
            parallel=not args.sequential,
            max_workers=args.workers,
            isolate=args.isolate,
        )
        
    elif args.command == "isolate":
        if not args.file.exists():
            console.error(f"File not found: {args.file}")
            sys.exit(1)
        
        isolate_vocals(
            args.file,
            args.output,
            remove_hiss=not args.no_hiss_removal,
        )
        
    elif args.command == "fingerprint":
        # Expand globs
        files = []
        for pattern in args.files:
            if "*" in str(pattern):
                files.extend(Path(".").glob(str(pattern)))
            else:
                files.append(pattern)
        
        files = [f for f in files if f.exists()]
        
        if not files:
            console.error("No valid files found")
            sys.exit(1)
        
        generate_fingerprint(files, args.output)
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
