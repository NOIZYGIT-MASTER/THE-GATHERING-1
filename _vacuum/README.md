# _vacuum — VACUUM-AND-SORT STAGING

**Authority:** RSP_001 · 2026-04-28 ("VACCUM ALL FROM /Users/m2ultra · SAFELY SORT & DISTRIBUTE")
**Engine:** `ops/vacuum-and-sort.py` (in NOIZYANTHROPIC repo)

## Flow

```
/Users/m2ultra/<anywhere>
        │
        ▼  (1. SCAN)
   manifest.json     ← classification + target paths, no moves yet
        │
        ▼  (2. RSP review)
        │
        ▼  (3. EXECUTE)
   THE-GATHERING/<brand-or-family>/<subject>/<YYYY-MM>/<file>
        │
        ▼  (4. VERIFY hash)
        │
        ▼  (5. RETIRE source)
   only after all 4 above pass
```

## Files

- `manifest.json` — current dry-run output (what would move, where)
- `executed.log` — append-only log of completed moves with hash verification
- `quarantine/` — files that need human classification (ambiguous / mixed / unclassifiable)

