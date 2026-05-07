#!/bin/bash
set -euo pipefail

# NOIZYLAB Media Sync - Audio/Video to active media vault
# Code → GitHub | Media → configurable storage
#
# Preferred override:
#   export NOIZY_MEDIA_DRIVE="/Users/m2ultra/Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive"
#
# Legacy rp@fishmusicinc.com mount is NOT used by default.
# To intentionally allow it for one run:
#   export NOIZY_ALLOW_LEGACY_RP_DRIVE=1

NOIZYLAB="${NOIZYLAB_ROOT:-/Users/m2ultra/NOIZYLAB}"
LOCAL_FALLBACK="${HOME}/NOIZY_AI/_MEDIA_VAULT"

resolve_media_drive() {
  if [[ -n "${NOIZY_MEDIA_DRIVE:-}" ]]; then
    local expanded="${NOIZY_MEDIA_DRIVE/#\~/$HOME}"
    if [[ -d "$expanded" ]]; then
      echo "$expanded"
      return 0
    fi
    echo "⚠️  NOIZY_MEDIA_DRIVE is set but missing: $expanded" >&2
  fi

  local candidates=(
    "$HOME/Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive"
    "$HOME/Library/CloudStorage/GoogleDrive-rsp@fishmusicinc.com/My Drive"
    "$HOME/Library/CloudStorage/GoogleDrive-rsp@noizy.ai/My Drive"
  )

  if [[ "${NOIZY_ALLOW_LEGACY_RP_DRIVE:-}" == "1" ]]; then
    candidates+=(
      "$HOME/Library/CloudStorage/GoogleDrive-rp@fishmusicinc.com/My Drive"
      "$HOME/Library/CloudStorage/GoogleDrive-rp@fishmusicinc.com/Shared Drives"
    )
  fi

  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  echo "$LOCAL_FALLBACK"
}

MEDIA_DRIVE="$(resolve_media_drive)"
GDRIVE="$MEDIA_DRIVE/NOIZYLAB_MEDIA"

mkdir -p "$GDRIVE/Audio" "$GDRIVE/Video" "$NOIZYLAB/media"

echo "🎵 NOIZYLAB Media Sync"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Source: $NOIZYLAB"
echo "Target: $GDRIVE"
echo "Canonical contact: rsp@fishmusicinc.com"
echo "Legacy alias: rp@fishmusicinc.com audit-only"
echo ""

case "${1:-}" in
  push)
    echo "📤 Pushing media to active media vault..."
    rsync -avh --progress --include='*.wav' --include='*.mp3' --include='*.flac' \
          --include='*.aif' --include='*.aiff' --include='*.m4a' --include='*.ogg' \
          --include='*/' --exclude='*' "$NOIZYLAB/" "$GDRIVE/Audio/"
    rsync -avh --progress --include='*.mov' --include='*.mp4' --include='*.avi' \
          --include='*.mkv' --include='*.webm' --include='*/' --exclude='*' \
          "$NOIZYLAB/" "$GDRIVE/Video/"
    echo "✅ Media pushed to active media vault"
    ;;
  pull)
    echo "📥 Pulling media from active media vault..."
    rsync -avh --progress "$GDRIVE/" "$NOIZYLAB/media/"
    echo "✅ Media pulled from active media vault"
    ;;
  status)
    echo "📊 NOIZYLAB_MEDIA:"
    du -sh "$GDRIVE"/* 2>/dev/null || echo "  (empty or not synced)"
    ;;
  *)
    echo "Usage: $0 {push|pull|status}"
    echo ""
    echo "  push   - Send local audio/video to active media vault"
    echo "  pull   - Get audio/video from active media vault"
    echo "  status - Show active media vault stats"
    exit 1
    ;;
esac
