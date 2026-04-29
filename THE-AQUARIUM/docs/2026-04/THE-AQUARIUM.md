# 🐟 THE-AQUARIUM
## The Master Catalog of the MC96ECOUNIVERSE

Every file across every drive, cloud, and device — indexed, queryable, current.
Daily incremental updates. The map you walk by.

**Founder:** Robert Stephen Plowman (RSP_001)
**Born:** 2026-04-26
**Database:** /Users/m2ultra/MC96/inventory.db
**Indexer:** /Users/m2ultra/MC96/everything_finder.py
**Voice asset hunter:** /Users/m2ultra/MC96/voice_asset_finder.py

## Tables

- `mc96_files` — every file (path, name, ext, kind, size, mtime, drive)
- `voice_assets` — voice-keyword-matched audio files
- `volumes` — every mounted drive with capacity
- `devices` — every device in the empire (Macs, TVs, mics, interfaces)
- `media_index` — scoped-by-volume media lookups

## Daily query examples

```sql
-- where are all my Logic projects?
SELECT path FROM mc96_files WHERE ext IN ('.logic', '.logicx') ORDER BY size DESC;

-- biggest files anywhere
SELECT path, size FROM mc96_files ORDER BY size DESC LIMIT 50;

-- by drive
SELECT drive, COUNT(*), printf('%.1f GB', SUM(size)/1024.0/1024/1024)
FROM mc96_files GROUP BY drive;

-- search filename
SELECT path FROM mc96_files WHERE name LIKE '%talespin%' COLLATE NOCASE;

-- voice acting hits
SELECT path FROM voice_assets WHERE category != 'audio' ORDER BY size_mb DESC;
```
