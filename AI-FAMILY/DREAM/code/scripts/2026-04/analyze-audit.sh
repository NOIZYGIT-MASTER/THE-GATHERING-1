#!/bin/bash
# analyze-audit.sh
# Takes a Mickey P audit tarball and produces a merge-diff report.
#
# Input:
#   ./analyze-audit.sh <path-to-audit.tar.gz>
#
# Output:
#   ./merge-report-<host>-<stamp>/
#     apps-both.txt         apps installed for BOTH users / system-wide
#     apps-fish-only.txt    apps specific to fish home
#     apps-rsp-only.txt     apps specific to RSP home
#     plugins-diff.txt      every plug-in, per user, with owner flag
#     launchitems-diff.txt  launch agents per user
#     desktop-fish.txt      desktop inventory for fish
#     desktop-rsp.txt       desktop inventory for RSP
#     summary.md            human-readable merge-plan skeleton
#
# Safe: reads only. Writes only to the output directory.

set -u

TARBALL="${1:-}"
if [ -z "$TARBALL" ] || [ ! -f "$TARBALL" ]; then
  echo "usage: $0 <path-to-mickey-p-audit-*.tar.gz>"
  exit 2
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[analyze] unpacking $TARBALL"
tar -xzf "$TARBALL" -C "$TMP"

# The audit tarball contains a single top-level dir like
# mickey-p-audit-<host>-<stamp>/ — find it.
AUDIT_DIR="$(find "$TMP" -maxdepth 2 -type d -name 'mickey-p-audit-*' | head -1)"
if [ -z "$AUDIT_DIR" ]; then
  echo "[analyze] could not locate audit directory inside tarball"
  exit 3
fi

HOST="$(basename "$AUDIT_DIR" | sed 's/^mickey-p-audit-//' | sed 's/-[0-9]\{8\}-[0-9]\{6\}$//')"
OUT="./merge-report-${HOST}-${STAMP}"
mkdir -p "$OUT"
echo "[analyze] output -> $OUT"

# -------- helpers --------
section() { echo; echo "## $*"; echo; }

# Extract app names from system_profiler SPApplicationsDataType
# That file has lines like:   App Name:
extract_apps_systemwide() {
  local file="$AUDIT_DIR/03-apps-profiler.txt"
  [ -f "$file" ] || return
  awk '/^    [A-Za-z0-9].*:$/ && !/Location|Version|Obtained|Last|Kind|Signed/ { sub(/:$/,""); sub(/^    /,""); print }' "$file" | sort -u
}

# Extract app names from a user-specific applications listing
extract_apps_user() {
  local tag="$1"   # e.g. user-fish, user-RSP, current-rsp
  local file="$AUDIT_DIR/11-manifest-${tag}-all-files.txt"
  [ -f "$file" ] || { echo "(no manifest for $tag)"; return; }
  grep -E '\.app($|/Contents/Info.plist$)' "$file" \
    | sed -E 's#(/[^/]+\.app)(/.*)?$#\1#' \
    | sort -u
}

# -------- 1. App diff --------
section "1. App diff"
SYSTEM_APPS="$OUT/apps-system.txt"
extract_apps_systemwide > "$SYSTEM_APPS"
echo "system-wide apps: $(wc -l <"$SYSTEM_APPS")"

for user_tag_file in "$AUDIT_DIR"/11-manifest-user-*-all-files.txt "$AUDIT_DIR"/11-manifest-current-*-all-files.txt; do
  [ -f "$user_tag_file" ] || continue
  tag="$(basename "$user_tag_file" | sed 's/^11-manifest-//' | sed 's/-all-files\.txt$//')"
  out="$OUT/apps-${tag}.txt"
  extract_apps_user "$tag" > "$out"
  echo "${tag}: $(wc -l <"$out") user-scope apps"
done

# If both fish and RSP homes were audited, diff them
FISH_APPS="$OUT/apps-user-fish.txt"
RSP_APPS="$OUT/apps-user-RSP.txt"
[ ! -f "$FISH_APPS" ] && FISH_APPS="$(ls "$OUT"/apps-*fish* 2>/dev/null | head -1)"
[ ! -f "$RSP_APPS" ]  && RSP_APPS="$(ls "$OUT"/apps-*RSP*  2>/dev/null | head -1)"

if [ -n "$FISH_APPS" ] && [ -n "$RSP_APPS" ] && [ -f "$FISH_APPS" ] && [ -f "$RSP_APPS" ]; then
  comm -12 <(sort "$FISH_APPS") <(sort "$RSP_APPS") > "$OUT/apps-both.txt"
  comm -23 <(sort "$FISH_APPS") <(sort "$RSP_APPS") > "$OUT/apps-fish-only.txt"
  comm -13 <(sort "$FISH_APPS") <(sort "$RSP_APPS") > "$OUT/apps-rsp-only.txt"
  echo "  both:      $(wc -l <"$OUT/apps-both.txt")"
  echo "  fish only: $(wc -l <"$OUT/apps-fish-only.txt")"
  echo "  RSP only:  $(wc -l <"$OUT/apps-rsp-only.txt")"
else
  echo "  (no fish+RSP manifests found — run audit with --all-users on Mickey P)"
fi

# -------- 2. Plug-in inventory --------
section "2. Plug-ins"
PLUG_OUT="$OUT/plugins-diff.txt"
: > "$PLUG_OUT"
for pfile in "$AUDIT_DIR"/04-plugins-*.txt; do
  [ -f "$pfile" ] || continue
  echo "=== $(basename "$pfile")" >> "$PLUG_OUT"
  cat "$pfile"                    >> "$PLUG_OUT"
  echo                             >> "$PLUG_OUT"
done
echo "wrote $PLUG_OUT"

# -------- 3. Launch items --------
section "3. Launch items"
LAUNCH_OUT="$OUT/launchitems-diff.txt"
: > "$LAUNCH_OUT"
for lfile in "$AUDIT_DIR"/05-launchd-*.txt "$AUDIT_DIR"/05-login-items.txt; do
  [ -f "$lfile" ] || continue
  echo "=== $(basename "$lfile")" >> "$LAUNCH_OUT"
  cat "$lfile"                    >> "$LAUNCH_OUT"
  echo                             >> "$LAUNCH_OUT"
done
echo "wrote $LAUNCH_OUT"

# -------- 4. Desktop snapshots --------
section "4. Desktops"
for dfile in "$AUDIT_DIR"/11-manifest-*-desktop.txt; do
  [ -f "$dfile" ] || continue
  tag="$(basename "$dfile" | sed 's/^11-manifest-//' | sed 's/-desktop\.txt$//')"
  cp "$dfile" "$OUT/desktop-${tag}.txt"
  echo "desktop-${tag}: $(grep -c . "$OUT/desktop-${tag}.txt") entries"
done

# -------- 5. Disk health flag --------
section "5. Disk health flag"
if grep -q "SMART support is:" "$AUDIT_DIR/07-disk-smart.txt" 2>/dev/null; then
  if grep -q "FAILED\|Pre-fail.*--.*[0-9]\{1,\}[[:space:]]*$\|Reallocated_Sector_Ct.*[1-9]" "$AUDIT_DIR/07-disk-smart.txt"; then
    FLAG="RED"
  else
    FLAG="GREEN"
  fi
else
  FLAG="UNKNOWN (install smartmontools via Homebrew for SMART coverage)"
fi
echo "disk health: $FLAG"

# -------- 6. Summary markdown (merge-plan skeleton) --------
section "6. Writing summary.md"
{
  echo "# Merge report — ${HOST}"
  echo
  echo "Generated: $(date)"
  echo "Source:    $TARBALL"
  echo "Architect: Robert Stephen Plowman"
  echo
  echo "## At a glance"
  echo
  echo "| Metric | Count |"
  echo "|---|---|"
  if [ -f "$OUT/apps-both.txt" ];      then echo "| Apps on both users      | $(wc -l <"$OUT/apps-both.txt") |"; fi
  if [ -f "$OUT/apps-fish-only.txt" ]; then echo "| Apps only in fish home  | $(wc -l <"$OUT/apps-fish-only.txt") |"; fi
  if [ -f "$OUT/apps-rsp-only.txt" ];  then echo "| Apps only in RSP home   | $(wc -l <"$OUT/apps-rsp-only.txt") |"; fi
  if [ -f "$SYSTEM_APPS" ];            then echo "| System-wide apps        | $(wc -l <"$SYSTEM_APPS") |"; fi
  echo "| SMART / disk health     | $FLAG |"
  echo
  echo "## Proposed merge approach"
  echo
  echo "For each category below, the architect chooses one of:"
  echo "**KEEP** (leave where it is) /"
  echo "**MOVE_TO_RSP** (move fish → RSP) /"
  echo "**MOVE_TO_FISH** (move RSP → fish) /"
  echo "**ARCHIVE** (neither user needs it daily) /"
  echo "**DELETE_AFTER_BACKUP** (remove, but only after a verified backup)."
  echo
  echo "### Apps in both homes (likely safe to dedupe)"
  if [ -f "$OUT/apps-both.txt" ]; then
    echo '```'
    head -40 "$OUT/apps-both.txt"
    [ "$(wc -l <"$OUT/apps-both.txt")" -gt 40 ] && echo "… see apps-both.txt for full list"
    echo '```'
  fi
  echo
  echo "### Apps only in fish"
  if [ -f "$OUT/apps-fish-only.txt" ]; then
    echo '```'
    head -40 "$OUT/apps-fish-only.txt"
    [ "$(wc -l <"$OUT/apps-fish-only.txt")" -gt 40 ] && echo "… see apps-fish-only.txt for full list"
    echo '```'
  fi
  echo
  echo "### Apps only in RSP"
  if [ -f "$OUT/apps-rsp-only.txt" ]; then
    echo '```'
    head -40 "$OUT/apps-rsp-only.txt"
    [ "$(wc -l <"$OUT/apps-rsp-only.txt")" -gt 40 ] && echo "… see apps-rsp-only.txt for full list"
    echo '```'
  fi
  echo
  echo "## Non-negotiables in this merge"
  echo
  echo "- Nothing is deleted until a verified backup exists."
  echo "- Nothing is deleted until Pops reviews the plan."
  echo "- Identity-bearing files (keychains, PGP keys, SSH keys, licenses,"
  echo "  certificates) never move silently. They are enumerated, the"
  echo "  architect chooses, and the move is logged to \`events\` with"
  echo "  \`kind = 'merge_op'\`."
  echo "- No credentials are exposed in this report."
  echo
  echo "## Next step"
  echo
  echo "Architect reviews this report, fills in per-category decisions,"
  echo "then ENGR generates a scripted plan — no script runs destructively"
  echo "without explicit confirmation."
} > "$OUT/summary.md"

echo "[analyze] done."
echo "Report:  $OUT/summary.md"
