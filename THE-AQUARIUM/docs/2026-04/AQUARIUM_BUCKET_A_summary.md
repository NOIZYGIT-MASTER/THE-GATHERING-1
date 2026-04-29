# AQUARIUM Bucket A — Migration Candidates

**Generated:** 2026-04-27T07:33:19Z
**Source:** `/Users/m2ultra/THE-GATHERING/categories/01_data.txt` (filter applied via `aquarium-bucket-a.sh`)
**Action class:** Read-only analysis. No files moved.

## Counts

| Metric | Value |
|---|---:|
| Total candidates after filter | 16029 |
| Unique-basename candidates | 1727 |
| Basenames with collisions | 7105 |
| Files involved in basename collisions | 14302 |

## Top drives (where candidates live)

```
15851 /Volumes/4TB_02/07_BACKUPS
  85 /Volumes/SOUND_DESIGN/_2026_MASTER
  85 /Volumes/JOE/00.CODE & DOCS 2026
   2 /Volumes/JOE/_01.AUDIO FROM ALL
   2 /Volumes/JOE/NOIZYLAB_WORKSPACES
   2 /Volumes/6TB/NOIZYLAB_ARCHIVES
   1 /Volumes/MAG 4TB/NOIZYFISH_THE_AQAURIUM
   1 /Volumes/JOE/_02.Instruments
```

## Extension distribution

```
15512 wav
 427 aif
  90 mp3
```

## Files

- Full candidate list: `AQUARIUM_BUCKET_A_candidates.txt` (16029 lines)
- Unique-basename only: `AQUARIUM_BUCKET_A_unique.txt` (1727 lines) — safest migration set
- Basename collisions: `AQUARIUM_BUCKET_A_dupes.tsv` (7105 basenames, 14302 files) — needs RSP review

## How to review duplicates

For each basename in `AQUARIUM_BUCKET_A_dupes.tsv`, multiple paths share the name. RSP picks the canonical one:

```bash
head -20 ~/THE-GATHERING/AQUARIUM_BUCKET_A/AQUARIUM_BUCKET_A_dupes.tsv
# pick a basename; find all matching paths:
grep '/<basename>$' ~/THE-GATHERING/AQUARIUM_BUCKET_A/AQUARIUM_BUCKET_A_candidates.txt
```

## Safety guarantees (per Rule 5)

- ❌ This script never moves, copies, or deletes files.
- ❌ This script never reads file contents — only paths from the catalog.
- ✅ All output is plain-text TSV/markdown, safe to inspect or discard.

**With every beat of my heart:** RSP_001 — **GORUNFREE.**
