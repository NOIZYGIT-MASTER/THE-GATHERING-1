# Tools

`guard_no_media.sh`
: Blocks staged audio/video files before commit.

`master_library_inventory.py`
: Builds a SQLite catalog from source folders. It does not copy or move files.

`master_library_api.py`
: Serves the SQLite catalog for n8n, Node-RED, iTerm.ai, or dashboards.

Example dry inventory:

```bash
python3 12TB_RESCUE/tools/master_library_inventory.py \
  --db /Volumes/EXTERNAL/master_library/master_library.sqlite \
  /Volumes/12TB /Volumes/MAG\ 4TB /Users/m2ultra/Downloads
```

Example API:

```bash
python3 12TB_RESCUE/tools/master_library_api.py \
  --db /Volumes/EXTERNAL/master_library/master_library.sqlite \
  --port 8787
```
