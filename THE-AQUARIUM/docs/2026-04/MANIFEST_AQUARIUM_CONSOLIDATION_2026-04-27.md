# MANIFEST — AQUARIUM Consolidation Analysis

**Date:** 2026-04-27
**Authority:** RSP_001
**Triggered by:** GABRIEL recommendation through NOIZYBEAST + RSP "do all three"
**Action class:** **PLAN ONLY — NO FILES MOVED.** Per Rule 5 (no destruction without explicit RSP approval), this manifest is the receipt RSP approves before any migration begins.

---

## TL;DR — the recommendation needs a course correction

GABRIEL recommended "AQUARIUM → DREAMCHAMBER consolidation, 677k files." After analysis, **a blanket move would import 245,848 screenshots and 6 seasons of LOST onto the canonical creative archive.** This is not the right approach.

**Revised recommendation:** selective migration of audio masters only, after dedup. Estimated real candidates: **a few hundred to a few thousand** unique audio masters, not 677k.

---

## What "AQUARIUM" actually contains (path-pattern catalog match)

**Total tagged paths in catalog: 612,331** (across categories 01_data, 02_code, 03_docs, 04_research, 05_aiml, 07_security)

### File-type breakdown (01_data only, 423,210 paths)

| Type | Count | What it is |
|---|---:|---|
| `.jpg` | 245,848 | Screenshots/photos — auto-sorted backup output |
| `.txt` | 133,984 | Text logs, notes, auto-generated reports |
| `.wav` | 15,592 | **Audio (real candidate)** |
| `.png` | 13,885 | More screenshots/images |
| `.json` | 5,910 | Configs, metadata, project files |
| `.svg` | 2,786 | Vector graphics (icons, logos) |
| `.jpeg` | 2,603 | Photos |
| `.gz` | 518 | Compressed archives |
| `.toml` | 481 | Config files |
| `.aif` | 427 | **Audio (real candidate)** |
| `.webp` | 184 | Images |
| `.db` | 161 | SQLite databases |
| `.gif` | 146 | Animated images |
| `.csv` | 146 | Data exports |
| `.mp3` | 114 | **Audio (real candidate)** |

**Real audio master pool: ~16,133 files (.wav/.aif/.aiff/.flac/.mp3/.m4a). 2.6% of AQUARIUM tagged paths.**

### Top AQUARIUM clusters (where the files live)

| Cluster | Files | What it is |
|---|---:|---|
| `/Volumes/4TB_02/07_BACKUPS/Aquarium/` | 333,377 | **Auto-sorted full backup** of an old Aquarium project state. Subfolders `_branding`, `_images`, `_misc`, `_other_scripts` come from a "MyQuickMac Neo" auto-organizer. |
| `/Volumes/SOUND_DESIGN/_2026_MASTER/06_GITHUB/NOIZYLAB-io/...` | 112,533 | Code/docs related to AQUARIUM as a project under NOIZYLAB |
| `/Volumes/JOE/00.CODE & DOCS 2026/...` | 112,491 | Code/docs cluster |
| `/Volumes/MAG 4TB/NOIZYFISH_THE_AQAURIUM/` | 23,999 | **Misspelled folder. Contains downloaded LOST TV series episodes.** Not NOIZY content. |
| `/Volumes/JOE/_D0C MASTER/` | 23,997 | Doc master cluster |
| `/Users/m2ultra/THE-DREAMCHAMBER/...` | 2,927 | **Already canonical** — imported under `6TB__NOIZYLAB_ARCHIVES/docs_20260406/` |
| `/Volumes/6TB/NOIZYLAB_ARCHIVES/...` | 2,848 | NOIZYLAB archive cluster |

---

## Critical finding: **16k "audio masters" includes test fixtures and 4x duplication**

Sample basenames of WAV files in AQUARIUM, sorted by frequency:

```text
4x  test-8000Hz-le-2ch-1byteu.wav
4x  test-8000Hz-le-1ch-1byte-ulaw.wav
4x  test-8000Hz-be-3ch-5S-24bit.wav
4x  test-48000Hz-2ch-64bit-float-le-wavex.wav
4x  test-44100Hz-le-1ch-4bytes.wav
4x  test-44100Hz-le-1ch-4bytes-rf64.wav
... (many more)
```

These are **WAV codec test fixtures** from some audio library, replicated 4× across drives (probably from `node_modules/<some-audio-lib>/test/`). They are **not** creative content. Need to be filtered out.

**684 paths** contain `lost season` or `/Series/` in path — TV show downloads, not NOIZY assets.

**Estimated real unique audio masters after filtering test fixtures, TV media, and 4x dupes: a few hundred to ~5,000 files, not 16k.**

---

## Three migration buckets (revised plan)

### Bucket A — DEFINITELY MIGRATE (small set)

Selection criteria:
- Extension in `{wav, aif, aiff, flac, m4a, mp3}`
- Path does NOT contain `node_modules`, `test`, `fixtures`, `samples` (lib samples)
- Path does NOT match TV-show patterns (`lost season`, `season \d`, `/Series/`)
- Basename does NOT match `test-\d+Hz-` pattern

**Estimated candidates: a few hundred to a few thousand.** Final count produced when migration is staged.

Destination: `~/THE-DREAMCHAMBER/_imported/AQUARIUM_audio_masters_20260427/` (preserve provenance via subfolder).

### Bucket B — REVIEW BEFORE DECIDING (medium set)

- TXT files containing "MANIFESTO", "VISION", "MISSION", "OATH", "FOUNDER" → likely 08_personal candidates
- AQUARIUM-tagged research/docs in 03_docs and 04_research
- Hand-curated audio-adjacent assets (album art, project files, session metadata)

These need RSP eyes-on. Total estimate: 5,000-20,000 files.

### Bucket C — DO NOT MIGRATE (the bulk)

- 245k JPG screenshots (auto-sorted Mac screenshots)
- 134k TXT logs / auto-generated reports
- 187k code files (belong in NOIZYANTHROPIC, not DREAMCHAMBER)
- 24k LOST TV episodes (not NOIZY)
- All `node_modules`-derived test fixtures
- Anything in `/Volumes/4TB_02/07_BACKUPS/` that duplicates content already organized elsewhere

**These should be left where they are or pruned separately.** They do not belong in the canonical creative archive.

---

## Migration safeguards (when RSP approves)

If RSP approves migration of Bucket A:

1. **Stage to a holding directory first**: `~/THE-DREAMCHAMBER/_imported/AQUARIUM_audio_masters_20260427/` (NOT directly into DREAMCHAMBER's existing structure).
2. **Hash-based dedup**: compute SHA-256 of each candidate file; skip if hash already exists in DREAMCHAMBER.
3. **Preserve original paths in a manifest** alongside the imported files (so we know where each came from on the source drive).
4. **Move, not copy** (if RSP wants to free space on source drives) OR **copy** (if the source archive should remain intact). RSP picks.
5. **Per-file ledger entry** logged to `~/logs/AQUARIUM_MIGRATION_<timestamp>.tsv` for full audit trail.

---

## What I will NOT do without explicit RSP approval

- ❌ Move ANY AQUARIUM file
- ❌ Delete ANY backup
- ❌ Modify the existing DREAMCHAMBER tree structure
- ❌ Touch the `_2026_MASTER`, `_BACKUPS`, or `NOIZYLAB_ARCHIVES` folders
- ❌ Remove TV shows or test fixtures (they're Rob's data — he decides their fate)

## What I CAN do autonomously with this manifest

- ✅ Build the actual filter scripts that produce the Bucket A candidate list (still no moves)
- ✅ Run hash-based dedup analysis to identify duplicates already in DREAMCHAMBER
- ✅ Generate a per-bucket TSV with full path lists for RSP to review

---

## RSP decision points

1. **Approve scope of Bucket A?** (audio masters only, after filtering test fixtures + TV shows)
2. **Stage to `_imported/` subfolder vs. directly into DREAMCHAMBER tree?** Recommend `_imported/` for safety.
3. **Move vs. copy?** Move frees ~16k * avg-master-size of disk. Copy preserves backups.
4. **Address Bucket B selectively?** Hand-pick rather than bulk-process.
5. **Address the misspelled `NOIZYFISH_THE_AQAURIUM` folder separately?** It contains TV shows — likely worth pruning regardless of consolidation decision.

---

**Receipt complete. No files moved. Awaiting RSP directive.**

**With every beat of my heart:** RSP_001 — **GORUNFREE.**
