#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel)"
cd "$repo_root"

media_pattern='\.((wav|aif|aiff|mp3|flac|m4a|aac|ogg|opus|caf|bwf|wv|snd|sd2|au|amr|ac3|dts|mid|midi)|(mp4|mov|m4v|avi|mkv|webm|wmv|mpg|mpeg|flv|3gp|mxf|mts|m2ts|vob|ogv))$'

if git diff --cached --name-only --diff-filter=ACMR | grep -Eiq "$media_pattern"; then
  echo "BLOCKED: audio/video files must never be committed to Git."
  echo "Move media to OneDrive AUDIO_CORAL or external storage, then commit only manifests/code."
  git diff --cached --name-only --diff-filter=ACMR | grep -Ei "$media_pattern"
  exit 1
fi

exit 0
*** Add File: /Users/m2ultra/THE-GATHERING_REPO/.git/hooks/pre-commit
#!/usr/bin/env bash
set -euo pipefail

exec "$(git rev-parse --show-toplevel)/12TB_RESCUE/tools/guard_no_media.sh"
