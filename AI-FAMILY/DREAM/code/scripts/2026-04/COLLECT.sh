#!/bin/bash
# NOIZY DREAMCHAMBER COLLECTOR — grab everything non-AV into ~/THE-DREAMCHAMBER
# Run: bash ~/THE-DREAMCHAMBER/COLLECT.sh
set -uo pipefail

DEST="$HOME/THE-DREAMCHAMBER"
EXCL=(
  --exclude='*.wav' --exclude='*.mp3' --exclude='*.flac' --exclude='*.aif'
  --exclude='*.aiff' --exclude='*.m4a' --exclude='*.ogg' --exclude='*.wma'
  --exclude='*.opus' --exclude='*.ac3' --exclude='*.mid' --exclude='*.midi'
  --exclude='*.rex' --exclude='*.rx2' --exclude='*.nki' --exclude='*.nkm'
  --exclude='*.nkc' --exclude='*.nkx' --exclude='*.ncw' --exclude='*.exs'
  --exclude='*.sf2' --exclude='*.sfz' --exclude='*.tci' --exclude='*.bfd'
  --exclude='*.bwf' --exclude='*.mp4' --exclude='*.mov' --exclude='*.avi'
  --exclude='*.mkv' --exclude='*.wmv' --exclude='*.flv' --exclude='*.webm'
  --exclude='*.m4v' --exclude='*.mpg' --exclude='*.mpeg' --exclude='*.vob'
  --exclude='*.mts' --exclude='*.iso' --exclude='*.dmg' --exclude='*.pkg'
  --exclude='*.app' --exclude='.DS_Store' --exclude='.Trashes'
  --exclude='.Spotlight*' --exclude='.fseventsd' --exclude='.DocumentRevisions*'
  --exclude='.TemporaryItems' --exclude='node_modules' --exclude='__pycache__'
  --exclude='site-packages' --exclude='.git/objects'
)
ROPTS=(-avh --no-perms --no-owner --no-group)

collect() {
  local src="$1" tag="$2"
  if [ -d "$src" ]; then
    echo "▶ COLLECTING: $tag"
    rsync "${ROPTS[@]}" "${EXCL[@]}" "$src/" "$DEST/$tag/" 2>&1 | tail -1
    echo ""
  else
    echo "⛔ SKIP (not mounted): $src"
  fi
}

echo "═══════════════════════════════════════════════"
echo "  NOIZY DREAMCHAMBER COLLECTOR"
echo "  Target: $DEST"
echo "  Started: $(date)"
echo "═══════════════════════════════════════════════"
echo ""

# ── 12TB (if mounted) ──
collect "/Volumes/12TB/_D0C MASTER"                                          "12TB__D0C_MASTER"
collect "/Volumes/12TB/CODEMASTER"                                           "12TB__CODEMASTER"
collect "/Volumes/12TB/GitHub"                                               "12TB__GitHub"
collect "/Volumes/12TB/_NOIZYLAB"                                            "12TB___NOIZYLAB"
collect "/Volumes/12TB/NOIZYLAB_ARCHIVES"                                    "12TB__NOIZYLAB_ARCHIVES"
collect "/Volumes/12TB/MissionControl96"                                     "12TB__MissionControl96"
collect "/Volumes/12TB/reports"                                              "12TB__reports"
collect "/Volumes/12TB/scripts"                                              "12TB__scripts"
collect "/Volumes/12TB/Volume_Inventory"                                     "12TB__Volume_Inventory"
collect "/Volumes/12TB/2025 FISH WDC"                                        "12TB__2025_FISH_WDC"
collect "/Volumes/12TB/_ORGANIZED/07_DOCS"                                   "12TB__07_DOCS"
collect "/Volumes/12TB/_ORGANIZED/06_RESCUE/_CLAUDE_NEEDS/MC96_DOCUMENTATION" "12TB__RESCUE_MC96_DOCS"
collect "/Volumes/12TB/_ORGANIZED/06_RESCUE/_CLAUDE_NEEDS/NOIZYLAB"          "12TB__RESCUE_NOIZYLAB"
collect "/Volumes/12TB/_ORGANIZED/06_RESCUE/_CLAUDE_NEEDS/NOIZYLAB_WORKSPACE" "12TB__RESCUE_WORKSPACE"
collect "/Volumes/12TB/_ORGANIZED/06_RESCUE/_CLAUDE_NEEDS/NoizyFish_Fishnet" "12TB__RESCUE_Fishnet"
collect "/Volumes/12TB/_ORGANIZED/06_RESCUE/_CLAUDE_NEEDS/NOIZYVOX"          "12TB__RESCUE_NOIZYVOX"
collect "/Volumes/12TB/_ORGANIZED/06_RESCUE/_CLAUDE_NEEDS/LOGS"              "12TB__RESCUE_LOGS"
collect "/Volumes/12TB/_ORGANIZED/06_RESCUE/_CLAUDE_NEEDS/MUSIC DOCS"        "12TB__RESCUE_MUSIC_DOCS"

# ── 6TB ──
collect "/Volumes/6TB/ARCHIVE"                                               "6TB__ARCHIVE"
collect "/Volumes/6TB/NOIZYLAB_ARCHIVES"                                     "6TB__NOIZYLAB_ARCHIVES"
collect "/Volumes/6TB/_ORGANIZED/01_CODE"                                    "6TB__01_CODE"

# ── 4TB Lacie ──
collect "/Volumes/4TB Lacie/_MASTER_2026"                                    "4TBL__MASTER_2026"
collect "/Volumes/4TB Lacie/M2ULTRA_BACKUP_20260417"                         "4TBL__M2ULTRA_BACKUP"

# ── MAG 4TB (if mounted) ──
collect "/Volumes/MAG 4TB"                                                   "MAG4TB__FULL"

# ── 2TB_SGW ──
collect "/Volumes/2TB_SGW/Current Screenshots"                               "2TBSGW__Screenshots"
collect "/Volumes/2TB_SGW/VoiceTrigger"                                      "2TBSGW__VoiceTrigger"
collect "/Volumes/2TB_SGW/RapidCopy"                                         "2TBSGW__RapidCopy"
collect "/Volumes/2TB_SGW/2025 HEALTH"                                       "2TBSGW__2025_HEALTH"
collect "/Volumes/2TB_SGW/FISHMUSIC_2026_MASTER"                             "2TBSGW__FISHMUSIC_MASTER"
collect "/Volumes/2TB_SGW/rsp_deux"                                          "2TBSGW__rsp_deux"

# ── System ──
collect "$HOME/NOIZYANTHROPIC"                                               "SYS__NOIZYANTHROPIC"
collect "$HOME/Desktop"                                                      "SYS__Desktop"
collect "$HOME/Documents"                                                    "SYS__Documents"
collect "$HOME/NOIZYLAB"                                                     "SYS__NOIZYLAB"

echo "═══════════════════════════════════════════════"
echo "  DONE: $(date)"
echo "  Location: $DEST"
du -sh "$DEST"
echo "═══════════════════════════════════════════════"
