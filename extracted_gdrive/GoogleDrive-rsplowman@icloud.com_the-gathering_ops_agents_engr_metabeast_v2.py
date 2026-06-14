#!/usr/bin/env python3
"""
ENGR METABEAST v2 — AQUARIUM INTELLIGENCE ENGINE
RSP_001 — Robert Stephen Plowman — Fish Music Inc.
Gemma 4 Decuple Hunter: 10 parallel agents scanning audio universe
Stack: Librosa + Mutagen + AcoustID + SQLite + Gemma 4 (local Ollama)
Constitutional: THE AQUARIUM = external storage ONLY — never write audio to GOD system drive

Usage:
  python3 engr_metabeast_v2.py --drive /Volumes/AQUARIUM --workers 10
  python3 engr_metabeast_v2.py --drive /Volumes/AQUARIUM --drive /Volumes/ARCHIVE2 --workers 10
"""

import os
import sys
import json
import time
import hashlib
import sqlite3
import argparse
import logging
import threading
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

# ── Dependency guard ──────────────────────────────────────────
try:
    import librosa
    import numpy as np
    import mutagen
    from mutagen import File as MutagenFile
    import requests
except ImportError as e:
    print(f"MISSING: {e}")
    print("Install: pip install librosa mutagen requests numpy --break-system-packages")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
GEMMA_MODEL = os.environ.get("GEMMA_MODEL", "gemma3:latest")  # Gemma 4 when available
DB_PATH = os.path.expanduser("~/noizy/agents/engr/metabeast.db")
RSP_CATALOG_ID_PREFIX = "RSP001"
LOG_FILE = os.path.expanduser("~/logs/metabeast.log")

AUDIO_EXTENSIONS = {
    ".wav", ".aif", ".aiff", ".mp3", ".flac", ".m4a", ".aac",
    ".ogg", ".opus", ".wma", ".mp4", ".mov", ".bwf"
}

# Constitutional boundaries — GOD system drive is NEVER scanned
PROHIBITED_PATHS = frozenset([
    "/", "/System", "/Library", "/usr", "/bin", "/sbin", "/private",
    "/Users/m2ultra/Library",
])

# ── Logging ───────────────────────────────────────────────────
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(threadName)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("METABEAST")

# ── Database ──────────────────────────────────────────────────
def init_db(db_path: str) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")  # 64MB cache for bulk writes
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS catalog (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            catalog_id    TEXT UNIQUE,
            file_path     TEXT NOT NULL,
            file_name     TEXT,
            file_size     INTEGER,
            file_hash     TEXT,
            title         TEXT,
            artist        TEXT,
            album         TEXT,
            year          INTEGER,
            network       TEXT,
            format        TEXT,
            duration_sec  REAL,
            sample_rate   INTEGER,
            bit_depth     INTEGER,
            channels      INTEGER,
            tempo_bpm     REAL,
            key_signature TEXT,
            genre_tags    TEXT,
            gemma_summary TEXT,
            hvs_flag      INTEGER DEFAULT 0,
            rights_owner  TEXT DEFAULT 'Fish Music Inc.',
            scanned_at    TEXT,
            scan_version  TEXT DEFAULT '2.0'
        );

        CREATE INDEX IF NOT EXISTS idx_catalog_hash ON catalog(file_hash);
        CREATE INDEX IF NOT EXISTS idx_catalog_hvs  ON catalog(hvs_flag);
        CREATE INDEX IF NOT EXISTS idx_catalog_year ON catalog(year);
        CREATE INDEX IF NOT EXISTS idx_catalog_path ON catalog(file_path);

        CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(
            catalog_id, title, artist, network, genre_tags, gemma_summary,
            content='catalog', content_rowid='id'
        );

        CREATE TABLE IF NOT EXISTS scan_runs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            drive_path TEXT,
            started_at TEXT,
            ended_at   TEXT,
            files_found INTEGER DEFAULT 0,
            files_new   INTEGER DEFAULT 0,
            files_dup   INTEGER DEFAULT 0,
            errors      INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS duplicates (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            file_hash   TEXT,
            path_a      TEXT,
            path_b      TEXT,
            detected_at TEXT,
            UNIQUE(file_hash, path_b)
        );
    """)
    conn.commit()
    return conn

DB_LOCK = threading.Lock()

# ── Catalog ID generator ──────────────────────────────────────
_catalog_counter = 0
_catalog_counter_lock = threading.Lock()

def make_catalog_id(file_path: str, file_hash: str) -> str:
    global _catalog_counter
    stamp = datetime.now().strftime("%Y%m")
    short = file_hash[:8].upper()
    with _catalog_counter_lock:
        _catalog_counter += 1
        seq = _catalog_counter
    return f"{RSP_CATALOG_ID_PREFIX}-{stamp}-{short}-{seq:05d}"

# ── File hash ─────────────────────────────────────────────────
def file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(131072), b""):
            h.update(chunk)
    return h.hexdigest()

# ── Librosa analysis ─────────────────────────────────────────
def analyze_audio(path: str) -> dict:
    result = {}
    try:
        y, sr = librosa.load(path, sr=None, mono=True, duration=60)
        if y is None or len(y) == 0:
            return result

        result["sample_rate"] = int(sr)
        result["duration_sec"] = round(librosa.get_duration(y=y, sr=sr), 2)

        # Tempo — handle both old and new librosa API
        try:
            tempo_result = librosa.beat.beat_track(y=y, sr=sr)
            if isinstance(tempo_result, tuple):
                tempo_val = tempo_result[0]
            else:
                tempo_val = tempo_result
            # Handle numpy array (older librosa returns array)
            if isinstance(tempo_val, np.ndarray):
                tempo_val = float(tempo_val[0]) if tempo_val.size > 0 else 0.0
            else:
                tempo_val = float(tempo_val)
            result["tempo_bpm"] = round(tempo_val, 1)
        except Exception as e:
            log.debug(f"Tempo detection failed for {path}: {e}")

        # Key detection via chroma
        try:
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
            key_idx = int(chroma.mean(axis=1).argmax())
            keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
            result["key_signature"] = keys[key_idx]
        except Exception as e:
            log.debug(f"Key detection failed for {path}: {e}")

    except Exception as e:
        log.debug(f"Librosa error on {path}: {e}")
    return result

# ── Mutagen metadata ─────────────────────────────────────────
def read_metadata(path: str) -> dict:
    result = {}
    try:
        f = MutagenFile(path, easy=True)
        if f:
            result["title"]  = str(f.get("title",  [""])[0]) if f.get("title")  else None
            result["artist"] = str(f.get("artist", [""])[0]) if f.get("artist") else None
            result["album"]  = str(f.get("album",  [""])[0]) if f.get("album")  else None
            year_raw = f.get("date", [None])[0]
            if year_raw:
                try:
                    result["year"] = int(str(year_raw)[:4])
                except ValueError:
                    pass
            genre_raw = f.get("genre", [])
            if genre_raw:
                result["genre_tags"] = ", ".join(str(g) for g in genre_raw)
            if hasattr(f, "info"):
                result["duration_sec"] = round(f.info.length, 2)
                result["sample_rate"]  = getattr(f.info, "sample_rate", None)
                result["channels"]     = getattr(f.info, "channels", None)
                result["bit_depth"]    = getattr(f.info, "bits_per_sample", None)
    except Exception as e:
        log.debug(f"Mutagen error on {path}: {e}")
    return result

# ── Network detection (TV/Film cues) ─────────────────────────
def detect_network(path: str, title: str) -> Optional[str]:
    """Detect broadcast network from path or filename markers."""
    markers = {
        "CBC":    ["cbc", "radio-canada"],
        "CTV":    ["ctv", "bellmedia"],
        "NBC":    ["nbc", "peacock"],
        "ABC":    ["abc", "disney"],
        "CBS":    ["cbs", "paramount"],
        "FOX":    ["fox"],
        "PBS":    ["pbs"],
        "NETFLIX": ["netflix"],
        "AMAZON":  ["amazon", "prime"],
        "APPLE":   ["apple", "atv+"],
        "CORUS":   ["corus", "ytv", "treehouse", "teletoon"],
        "DHX":     ["dhx", "wildbrain"],
        "NELVANA": ["nelvana"],
    }
    haystack = " ".join([str(path).lower(), str(title or "").lower()])
    for network, keywords in markers.items():
        if any(kw in haystack for kw in keywords):
            return network
    return None

# ── Gemma 4 summary ───────────────────────────────────────────
_gemma_available = None
_gemma_check_lock = threading.Lock()

def check_gemma() -> bool:
    """Check once if Gemma is available, cache the result."""
    global _gemma_available
    with _gemma_check_lock:
        if _gemma_available is not None:
            return _gemma_available
        try:
            r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
            models = [m["name"] for m in r.json().get("models", [])]
            _gemma_available = any(GEMMA_MODEL.split(":")[0] in m for m in models)
            if _gemma_available:
                log.info(f"Gemma connected: {GEMMA_MODEL} via {OLLAMA_URL}")
            else:
                log.warning(f"Gemma model '{GEMMA_MODEL}' not found. Available: {models}")
                log.warning("Continuing without AI summaries.")
        except Exception:
            _gemma_available = False
            log.warning(f"Ollama not reachable at {OLLAMA_URL}. Continuing without AI summaries.")
        return _gemma_available

def gemma_describe(title: str, artist: str, tempo: float, key: str) -> Optional[str]:
    if not check_gemma():
        return None
    try:
        prompt = (
            f"One sentence: describe this music cue for a catalog. "
            f"Title: {title or 'unknown'}. Artist: {artist or 'RSP_001'}. "
            f"Tempo: {tempo or '?'} BPM. Key: {key or '?'}. "
            f"Context: animated TV / interactive media. Be specific and evocative."
        )
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": GEMMA_MODEL, "prompt": prompt, "stream": False},
            timeout=30
        )
        if r.status_code == 200:
            return r.json().get("response", "").strip()[:500]
        return None
    except Exception as e:
        log.debug(f"Gemma error: {e}")
        return None

# ── HVS flag heuristic ────────────────────────────────────────
def detect_hvs(path: str, title: str, artist: str) -> bool:
    """Mark RSP_001 original voice performances."""
    markers = ["vox", "voice", "vocal", "rsp001", "rsp_001", "plowman", "spoken",
               "narrat", "dialog", "dialogue", "v.o.", "voiceover"]
    haystack = " ".join([
        str(path).lower(), str(title or "").lower(), str(artist or "").lower()
    ])
    return any(m in haystack for m in markers)

# ── Single file scan ──────────────────────────────────────────
def scan_file(path: str, conn: sqlite3.Connection, run_id: int) -> str:
    """Returns: 'new' | 'dup' | 'error'"""
    try:
        # Quick stat check before heavy I/O
        try:
            fstat = os.stat(path)
            if fstat.st_size == 0:
                log.debug(f"Skipping empty file: {path}")
                return "error"
        except OSError:
            return "error"

        fhash = file_hash(path)

        # Duplicate check
        with DB_LOCK:
            existing = conn.execute(
                "SELECT catalog_id, file_path FROM catalog WHERE file_hash = ?", (fhash,)
            ).fetchone()

        if existing:
            if existing[1] != path:
                with DB_LOCK:
                    conn.execute(
                        "INSERT OR IGNORE INTO duplicates (file_hash, path_a, path_b, detected_at) VALUES (?,?,?,?)",
                        (fhash, existing[1], path, datetime.now().isoformat())
                    )
                    conn.commit()
            return "dup"

        # Metadata
        meta = read_metadata(path)
        audio = analyze_audio(path)
        # Audio analysis overrides mutagen for sample_rate/duration (more accurate)
        merged = {**meta, **audio}

        title  = merged.get("title")  or Path(path).stem
        artist = merged.get("artist") or "RSP_001"
        tempo  = merged.get("tempo_bpm")
        key    = merged.get("key_signature")
        network = detect_network(path, title)

        # Gemma 4 description
        summary = gemma_describe(title, artist, tempo, key)

        catalog_id = make_catalog_id(path, fhash)
        hvs = 1 if detect_hvs(path, title, artist) else 0

        row = {
            "catalog_id":    catalog_id,
            "file_path":     path,
            "file_name":     Path(path).name,
            "file_size":     fstat.st_size,
            "file_hash":     fhash,
            "title":         title,
            "artist":        artist,
            "album":         merged.get("album"),
            "year":          merged.get("year"),
            "network":       network,
            "format":        Path(path).suffix.lower().strip("."),
            "duration_sec":  merged.get("duration_sec"),
            "sample_rate":   merged.get("sample_rate"),
            "bit_depth":     merged.get("bit_depth"),
            "channels":      merged.get("channels"),
            "tempo_bpm":     tempo,
            "key_signature": key,
            "genre_tags":    merged.get("genre_tags"),
            "gemma_summary": summary,
            "hvs_flag":      hvs,
            "scanned_at":    datetime.now().isoformat(),
        }

        with DB_LOCK:
            conn.execute("""
                INSERT OR REPLACE INTO catalog
                (catalog_id, file_path, file_name, file_size, file_hash,
                 title, artist, album, year, network, format, duration_sec,
                 sample_rate, bit_depth, channels, tempo_bpm, key_signature,
                 genre_tags, gemma_summary, hvs_flag, scanned_at)
                VALUES
                (:catalog_id, :file_path, :file_name, :file_size, :file_hash,
                 :title, :artist, :album, :year, :network, :format, :duration_sec,
                 :sample_rate, :bit_depth, :channels, :tempo_bpm, :key_signature,
                 :genre_tags, :gemma_summary, :hvs_flag, :scanned_at)
            """, row)
            conn.commit()

        lvl = "HVS 🔒" if hvs else "NEW"
        log.info(f"[{lvl}] {catalog_id} — {title} ({merged.get('duration_sec', '?')}s, {tempo or '?'} BPM, {key or '?'})")
        return "new"

    except Exception as e:
        log.error(f"ERROR scanning {path}: {e}")
        return "error"

# ── Drive discovery ───────────────────────────────────────────
def find_audio_files(drives: list[str]) -> list[str]:
    found = []
    skipped_dirs = 0
    for drive in drives:
        log.info(f"🔍 Scanning drive: {drive}")
        for root, dirs, files in os.walk(drive):
            # Skip hidden directories and system folders
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for f in files:
                if f.startswith("."):
                    continue
                if Path(f).suffix.lower() in AUDIO_EXTENSIONS:
                    found.append(os.path.join(root, f))
    log.info(f"🎵 Total audio files found: {len(found):,}")
    return found

# ── Summary report ────────────────────────────────────────────
def print_report(conn: sqlite3.Connection):
    """Print a post-scan intelligence summary."""
    log.info("")
    log.info("📊 AQUARIUM INTELLIGENCE SUMMARY")
    log.info("─" * 50)

    total = conn.execute("SELECT COUNT(*) FROM catalog").fetchone()[0]
    hvs_count = conn.execute("SELECT COUNT(*) FROM catalog WHERE hvs_flag=1").fetchone()[0]
    dup_count = conn.execute("SELECT COUNT(*) FROM duplicates").fetchone()[0]

    log.info(f"  Total catalogued:  {total:,}")
    log.info(f"  HVS-flagged:       {hvs_count:,} 🔒")
    log.info(f"  Duplicates found:  {dup_count:,}")

    # Format breakdown
    rows = conn.execute(
        "SELECT format, COUNT(*) as c FROM catalog GROUP BY format ORDER BY c DESC LIMIT 10"
    ).fetchall()
    if rows:
        log.info("  Format breakdown:")
        for fmt, cnt in rows:
            log.info(f"    .{fmt:6s} → {cnt:,}")

    # Top artists
    rows = conn.execute(
        "SELECT artist, COUNT(*) as c FROM catalog WHERE artist IS NOT NULL GROUP BY artist ORDER BY c DESC LIMIT 5"
    ).fetchall()
    if rows:
        log.info("  Top artists:")
        for artist, cnt in rows:
            log.info(f"    {artist:30s} → {cnt:,}")

    # Network breakdown
    rows = conn.execute(
        "SELECT network, COUNT(*) as c FROM catalog WHERE network IS NOT NULL GROUP BY network ORDER BY c DESC"
    ).fetchall()
    if rows:
        log.info("  Network distribution:")
        for net, cnt in rows:
            log.info(f"    {net:12s} → {cnt:,}")

    # Year range
    year_range = conn.execute(
        "SELECT MIN(year), MAX(year) FROM catalog WHERE year IS NOT NULL"
    ).fetchone()
    if year_range and year_range[0]:
        log.info(f"  Year range:        {year_range[0]} — {year_range[1]}")

    log.info("─" * 50)

# ── Main ──────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="ENGR METABEAST v2 — AQUARIUM Intelligence Scanner",
        epilog="Constitutional: AQUARIUM = external storage ONLY. GOD system drive is prohibited."
    )
    parser.add_argument("--drive", action="append", required=True, help="Drive path(s) to scan")
    parser.add_argument("--workers", type=int, default=10, help="Parallel hunters (default: 10 = Decuple)")
    parser.add_argument("--db", default=DB_PATH, help="SQLite database path")
    parser.add_argument("--no-gemma", action="store_true", help="Skip Gemma AI summaries")
    parser.add_argument("--dry-run", action="store_true", help="Discover files only, don't scan")
    args = parser.parse_args()

    if args.no_gemma:
        global _gemma_available
        _gemma_available = False

    # Constitutional check — never scan GOD system drive
    for d in args.drive:
        resolved = os.path.realpath(d)
        if resolved in PROHIBITED_PATHS or any(resolved.startswith(p + "/") for p in PROHIBITED_PATHS if p != "/"):
            log.error(f"🚫 CONSTITUTIONAL VIOLATION: Cannot scan {d} → {resolved}")
            log.error("   THE AQUARIUM lives on external storage ONLY.")
            sys.exit(1)
        if not os.path.isdir(resolved):
            log.error(f"Drive not found or not a directory: {d}")
            sys.exit(1)

    log.info("=" * 60)
    log.info("🐟 ENGR METABEAST v2 — DECUPLE HUNTER INITIALIZING")
    log.info(f"   Drives:   {args.drive}")
    log.info(f"   Workers:  {args.workers} (Decuple Hunter mode)")
    log.info(f"   Model:    {GEMMA_MODEL} via {OLLAMA_URL}")
    log.info(f"   Database: {args.db}")
    log.info("=" * 60)

    conn = init_db(args.db)

    # Register scan run
    cursor = conn.execute(
        "INSERT INTO scan_runs (drive_path, started_at) VALUES (?, ?)",
        (json.dumps(args.drive), datetime.now().isoformat())
    )
    run_id = cursor.lastrowid
    conn.commit()

    files = find_audio_files(args.drive)
    total = len(files)

    if args.dry_run:
        log.info(f"DRY RUN — {total:,} audio files discovered. No scanning performed.")
        conn.close()
        return

    if total == 0:
        log.warning("No audio files found on specified drives.")
        conn.close()
        return

    counts = {"new": 0, "dup": 0, "error": 0}
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.workers, thread_name_prefix="Hunter") as pool:
        futures = {pool.submit(scan_file, f, conn, run_id): f for f in files}
        done = 0
        for future in as_completed(futures):
            result = future.result()
            counts[result] += 1
            done += 1
            if done % 50 == 0 or done == total:
                elapsed = time.time() - start
                rate = done / elapsed if elapsed > 0 else 0
                eta = (total - done) / rate if rate > 0 else 0
                pct = (done / total) * 100
                log.info(
                    f"⏳ {done:,}/{total:,} ({pct:.0f}%) | "
                    f"New: {counts['new']:,} | Dup: {counts['dup']:,} | "
                    f"Err: {counts['error']} | "
                    f"{rate:.1f} files/s | ETA: {eta:.0f}s"
                )

    elapsed = time.time() - start

    # Update scan run
    conn.execute("""
        UPDATE scan_runs SET ended_at=?, files_found=?, files_new=?, files_dup=?, errors=?
        WHERE id=?
    """, (datetime.now().isoformat(), total, counts["new"], counts["dup"], counts["error"], run_id))
    conn.commit()

    # FTS rebuild — once at end, not per-file
    log.info("Rebuilding full-text search index...")
    conn.execute("INSERT INTO catalog_fts(catalog_fts) VALUES('rebuild')")
    conn.commit()

    log.info("=" * 60)
    log.info("🐟 METABEAST SCAN COMPLETE")
    log.info(f"   Total files:  {total:,}")
    log.info(f"   New entries:  {counts['new']:,}")
    log.info(f"   Duplicates:   {counts['dup']:,}")
    log.info(f"   Errors:       {counts['error']:,}")
    log.info(f"   Time:         {elapsed:.1f}s")
    log.info(f"   Rate:         {total/elapsed:.1f} files/sec" if elapsed > 0 else "")
    log.info(f"   Database:     {args.db}")
    log.info("=" * 60)

    # Intelligence summary
    print_report(conn)

    conn.close()
    log.info("GORUNFREE. 🐟")

if __name__ == "__main__":
    main()
