# AQUARIUM CONSOLIDATION PLAN — 677k files into THE-DREAMCHAMBER

**Date:** 2026-04-27
**Source basis:** `THE-GATHERING/EMPIRE_ENTITY_MAP.md` § 2 (AQUARIUM 677,101 files, 62% data)
**Status:** PLAN ONLY. No files moved. Per Rule 5, every move/delete/overwrite needs explicit RSP yes.

---

## TL;DR

The 677k AQUARIUM file-count is dominated by **one tree**: `/Volumes/4TB_02/07_BACKUPS/Aquarium` (514 GB, 333k files in catalog — the rest of the 677k are mirror references through other mount paths to the same data + the live working slots).

**The actual move is one tree, not 677k disparate files.** The plan below offers three paths with different risk/cost trade-offs.

---

## INVENTORY OF THE AQUARIUM TREE

| Subdir | Size | Likely contents | Live or dead? |
|---|---:|---|---|
| `_projects/` | **506 GB** | The body of the backup. Source code, assets, project trees | Mostly DEAD (snapshot from 2025) |
| `vscode_backup_20250925_010929/` | 6.1 GB | VSCode profile + extensions + workspace state, Sept 2025 | DEAD (one specific point-in-time) |
| `vscode_backup_20250925_011220/` | 2.1 GB | Second VSCode snapshot, ~3 hr later same day | DEAD |
| `_images/` | 360 KB | Mixed images | small — keep |
| `_other_scripts/` | 208 KB | Loose scripts | small — keep |
| `NoizySuperSorter/` | 88 KB | Sorter tool | small — verify still useful |
| `AppStore_Projects/` | 80 KB | App Store-bound project stubs | small — verify |
| `Text_-_Sorted_By_MyQuickMac_Neo/` | 16 KB | MyQuickMac auto-sorted text | small |
| `_misc/`, `_folders/`, `_branding/`, `_documents/`, `_bobbydashboard/`, `Utilities/` | <8 KB ea | tiny stubs | small |

**Two facts that shape the plan:**
1. **`_projects/` is 98.4% of the AQUARIUM by bytes.** Whatever you decide for `_projects/` decides 98% of the operation.
2. **Both vscode_backups contain leaked .env files** (per `SECRET_ROTATION_WALK_2026-04-27.md` Tier 🔴). They are also where THE GATHERING's CRITICAL audit found multiple secrets. Do NOT just mirror them somewhere else — those backups should be either rotated-and-scrubbed or culled entirely.

---

## TARGET SLOTS IN THE-DREAMCHAMBER

`~/THE-DREAMCHAMBER/` is on the boot drive (177 GB per CLAUDE.md, 994 GB free on the 1.8 TB volume). Adding 514 GB would bring the tree to ~691 GB — fits, but eats half the headroom.

Existing target slot already prepared:
- `~/THE-DREAMCHAMBER/4TBL__MASTER_2026/_CODE_FROM_ARCHIVE/The-Aquarium/` (currently empty: just `.git` + `LICENSE`, 112 KB)
- Naming pattern of sibling shelves (`4TBL__M2ULTRA_BACKUP`, `12TB__D0C_MASTER`, `6TB__01_CODE`) implies these labels indicate the SOURCE drive, not the current physical location.

**The slot is ready. The question is which option you pick to populate it.**

---

## THREE OPTIONS

### Option A — FULL CONSOLIDATION onto boot drive (514 GB transfer)

**What:** rsync the entire `/Volumes/4TB_02/07_BACKUPS/Aquarium/` tree into `~/THE-DREAMCHAMBER/4TBL__MASTER_2026/_CODE_FROM_ARCHIVE/The-Aquarium/`. Verify by rsync `--dry-run --itemize-changes`. Then delete the 4TB_02 source.

**Time:** ~2-4 hours rsync (USB-C external → internal SSD), ~5 minutes verify.
**Free-space delta:** boot drive +514 GB used (994→480 GB free), 4TB_02 -514 GB used (frees space for new backups).
**Risk:** Boot drive at ~70% used after. DREAMCHAMBER no longer fits comfortably alongside other large trees if they grow.
**When to choose:** if 4TB_02 is being repurposed/decommissioned and DREAMCHAMBER is the canonical home regardless of disk.
**Approval:** YES — moves AND deletes 514 GB.

### Option B — MOVE ONTO 12TB SHELF, slot under DREAMCHAMBER (514 GB transfer)

**What:** rsync to `/Volumes/12TB/_dreamchamber/aquarium/` (or wherever the 12TB shelf is mounted). Create a symlink at `~/THE-DREAMCHAMBER/4TBL__MASTER_2026/_CODE_FROM_ARCHIVE/The-Aquarium → /Volumes/12TB/_dreamchamber/aquarium/`. Then delete from 4TB_02.

**Time:** ~2-4 hours rsync, 5 min verify.
**Free-space delta:** 12TB +514 GB used, 4TB_02 -514 GB. Boot drive unchanged.
**Risk:** AQUARIUM only browsable when 12TB is mounted. Acceptable for archive-class data.
**When to choose:** AQUARIUM is cold-archive; you want consolidation under DREAMCHAMBER's logical naming without spending boot SSD.
**Approval:** YES — moves AND deletes 514 GB.

### Option C — IN-PLACE LINK, NO MOVE (0 GB transfer)

**What:** create symlink `~/THE-DREAMCHAMBER/4TBL__MASTER_2026/_CODE_FROM_ARCHIVE/The-Aquarium → /Volumes/4TB_02/07_BACKUPS/Aquarium/`. Update EMPIRE_ENTITY_MAP to reflect the new canonical browse path. Don't touch the actual files.

**Time:** 30 seconds.
**Free-space delta:** zero.
**Risk:** still depends on 4TB_02 being mounted. The "consolidation" is logical, not physical.
**When to choose:** you want the LOGICAL canonicalization GABRIEL recommended — one path to find AQUARIUM under DREAMCHAMBER — without committing to a 514 GB move tonight.
**Approval:** YES — creates a symlink in DREAMCHAMBER (low risk) but no destructive op. Could be done tonight, replaced with A or B later.

---

## RECOMMENDED FIRST MOVE (regardless of A/B/C)

**Cull the two vscode_backups (8.2 GB) BEFORE any consolidation.**

Per the rotation walk, those are the source of the .env leaks in the CRITICAL list. They are point-in-time snapshots of a 7-month-old VSCode profile. Almost certainly nothing in them is uniquely valuable that can't be regenerated by re-running VSCode's settings sync.

Action (needs YES):
```bash
# DRY RUN first
ls -la "/Volumes/4TB_02/07_BACKUPS/Aquarium/vscode_backup_20250925_010929/"
ls -la "/Volumes/4TB_02/07_BACKUPS/Aquarium/vscode_backup_20250925_011220/"
# Then with explicit yes:
rm -rf "/Volumes/4TB_02/07_BACKUPS/Aquarium/vscode_backup_20250925_010929"
rm -rf "/Volumes/4TB_02/07_BACKUPS/Aquarium/vscode_backup_20250925_011220"
```
Result: 8.2 GB freed and 2 of the 11 LIVE-MIRROR .env paths from the CRITICAL list (after rotation) are gone forever.

---

## THE _projects/ INVENTORY — NEEDED BEFORE ANY MOVE

506 GB is too big to move blind. Before A or B, run a one-time inventory of what's IN `_projects/`:

```bash
du -sh "/Volumes/4TB_02/07_BACKUPS/Aquarium/_projects"/*/ 2>/dev/null | sort -rh | head -30 \
  > ~/THE-GATHERING/AQUARIUM_PROJECTS_INVENTORY_2026-04-27.txt
```

This reveals which sub-projects are heavyweights. Likely candidates for MOVE → DREAMCHAMBER vs DELETE entirely.

**Approval needed: NO (read-only inventory).** I can run this on your yes-implicit OK at any point.

---

## CROSS-CUTTING RISKS

1. **Catalog drift:** moving 514 GB invalidates the per-drive `4TB_02` and `THE_DREAMCHAMBER` `.txt` files in THE-GATHERING. You'd need to re-run `scan-drive.sh` on both after the move, then `aggregate.sh`. Add ~30 min.

2. **The 4TB Lacie / DREAMCHAMBER mirror question:** the EMPIRE_ENTITY_MAP showed AQUARIUM mirrored under `4TB Lacie/_MASTER_2026/...` paths. If those are *also* AQUARIUM copies, consolidation should consider deduplicating across both drives, not just the 4TB_02 source.

3. **Time-of-check / time-of-use:** if you start a 4-hour rsync and any agent (GABRIEL, daemons) writes to either side mid-flight, you can corrupt the consolidation. Schedule for an idle window or quiesce daemons (`launchctl bootout` for the duration).

---

## NEXT-STEP MENU

| Letter | Action | Risk | Approval needed |
|---|---|---|---|
| **inv** | Run `_projects/` inventory (read-only) | none | implicit OK |
| **C** | Create the symlink — Option C — to logically consolidate now | low | YES |
| **scrub-vscode** | Delete the two vscode_backups (8.2 GB) | medium (deletes data) | YES |
| **A** | Full move to boot SSD | high (514 GB transfer + delete source) | YES + scheduled |
| **B** | Move to 12TB shelf | high (514 GB transfer + delete source) | YES + scheduled + 12TB mount confirmed |

Say `inv`, `C`, `scrub-vscode`, `A`, or `B` (or any combination). I will not move 1 byte without that signal.

**With every beat of my heart:** RSP_001 — **GORUNFREE.**
