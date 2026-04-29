#!/usr/bin/env bash
# m2-ultra-cleanup.sh
#
# Interactive, confirmed-only cleanup driven by:
#   agents/engr/audits/M2-ULTRA-MOVE-OFF-2026-04-15.md
#
# Modes:
#   --tier1          Delete the safe-delete list (duplicates + node_modules)
#   --tier2          Move installers out to an external drive
#   --apps           Move Postman.app / eim.app into /Applications
#   --dry-run        Print what would happen, do nothing
#   --external PATH  Required for --tier2. Must be a writable mount.
#
# Safety rails:
#   - Nothing runs without --i-have-read-the-audit
#   - Nothing runs without a Pops review stub confirmed on the CLI
#   - Every rm / mv is y/n confirmed individually
#   - A tarball snapshot of _TOSORTOUT/ is taken before any destructive action
#   - External drive must be mounted and writable; script refuses otherwise
#
# This script does NOT talk to the network. It does NOT rotate keys.
# It does NOT modify anything under RSP-NOIZY/ or memory-sealed/.

set -euo pipefail

WORKSPACE="${WORKSPACE:-$HOME/CLAUDE TODAY}"
TIER1=0
TIER2=0
APPS=0
DRY_RUN=0
READ_AUDIT=0
EXTERNAL=""

usage() {
  sed -n '2,25p' "$0"
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --tier1) TIER1=1 ;;
    --tier2) TIER2=1 ;;
    --apps)  APPS=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --external) shift; EXTERNAL="${1:-}" ;;
    --i-have-read-the-audit) READ_AUDIT=1 ;;
    --workspace) shift; WORKSPACE="${1:-}" ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
  shift
done

if [ "$READ_AUDIT" -ne 1 ]; then
  cat <<EOF
Refusing to run. Re-run with --i-have-read-the-audit after reading:
  agents/engr/audits/M2-ULTRA-MOVE-OFF-2026-04-15.md
EOF
  exit 3
fi

if [ ! -d "$WORKSPACE" ]; then
  echo "Workspace not found: $WORKSPACE"
  exit 4
fi
cd "$WORKSPACE"
echo "Workspace: $(pwd)"
echo "Dry run:   $DRY_RUN"

# ----------------------------------------------------------------------
# Pops review stub
# ----------------------------------------------------------------------
pops_review() {
  cat <<EOF

POPS REVIEW GATE
================
This action touches the filesystem. Per VETO-PROTOCOL.md, Pops reviews
any deletion or move that could affect identity-bearing material.

Confirm each of the following:

  1. You have a current backup of $WORKSPACE (Time Machine or equivalent).
  2. Nothing in RSP-NOIZY/ is being touched by this run.
  3. Nothing in memory-sealed/ is being touched by this run.
  4. You understand node_modules deletes require re-running npm install.

EOF
  printf "Type 'pops clear' exactly to proceed: "
  read -r REPLY
  if [ "$REPLY" != "pops clear" ]; then
    echo "Pops did not clear. Halting."
    exit 5
  fi
  echo "Pops cleared. Continuing."
}

# ----------------------------------------------------------------------
# Snapshot helper — cheap insurance for _TOSORTOUT/
# ----------------------------------------------------------------------
snapshot_tosortout() {
  if [ ! -d "_TOSORTOUT" ]; then
    echo "No _TOSORTOUT/ to snapshot."
    return 0
  fi
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local out="$HOME/_TOSORTOUT-snapshot-$stamp.tar.gz"
  echo
  echo "Creating snapshot of _TOSORTOUT/ at:"
  echo "  $out"
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  (dry-run: skipping)"
    return 0
  fi
  tar -czf "$out" _TOSORTOUT
  echo "Snapshot complete. Size:"
  du -sh "$out"
}

# ----------------------------------------------------------------------
# Confirmed remove
# ----------------------------------------------------------------------
confirm_rm() {
  local target="$1"
  if [ ! -e "$target" ]; then
    echo "  skip (not present): $target"
    return 0
  fi
  local size
  size="$(du -sh "$target" 2>/dev/null | awk '{print $1}')"
  printf "  rm  [%s] %s  (y/n): " "$size" "$target"
  read -r r
  if [ "$r" != "y" ]; then
    echo "    skipped."
    return 0
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "    (dry-run) would rm"
    return 0
  fi
  if [ -d "$target" ]; then
    rm -rf "$target"
  else
    rm "$target"
  fi
  echo "    removed."
}

# ----------------------------------------------------------------------
# Confirmed move
# ----------------------------------------------------------------------
confirm_mv() {
  local src="$1"
  local dst="$2"
  if [ ! -e "$src" ]; then
    echo "  skip (not present): $src"
    return 0
  fi
  local size
  size="$(du -sh "$src" 2>/dev/null | awk '{print $1}')"
  printf "  mv  [%s] %s  ->  %s  (y/n): " "$size" "$src" "$dst"
  read -r r
  if [ "$r" != "y" ]; then
    echo "    skipped."
    return 0
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "    (dry-run) would mv"
    return 0
  fi
  mv "$src" "$dst"
  echo "    moved."
}

# ----------------------------------------------------------------------
# TIER 1 — safe deletes
# ----------------------------------------------------------------------
do_tier1() {
  echo
  echo "=== TIER 1 — SAFE DELETES ==="
  pops_review
  snapshot_tosortout

  echo
  echo "Duplicate installers:"
  confirm_rm "_TOSORTOUT/Microsoft_365_and_Office_16.107.26040410_Installer (1).pkg"
  confirm_rm "_TOSORTOUT/Claude.dmg"
  confirm_rm "./OpenJDK25U-jdk_aarch64_mac_hotspot_25.0.2_10 (1).pkg"
  for n in 1 2 3 4; do
    confirm_rm "_TOSORTOUT/files ($n).zip"
  done

  echo
  echo "Re-installable node_modules (restore with 'npm install'):"
  confirm_rm "heaven/node_modules"
  confirm_rm "landing/node_modules"
  confirm_rm "_TOSORTOUT/HEAVEN_DEPLOY/node_modules"

  echo
  echo "Tier 1 pass complete."
}

# ----------------------------------------------------------------------
# APPS — move app bundles into /Applications
# ----------------------------------------------------------------------
do_apps() {
  echo
  echo "=== APPS — relocate bundles to /Applications ==="
  pops_review
  confirm_mv "_TOSORTOUT/Postman.app" "/Applications/"
  confirm_mv "_TOSORTOUT/eim.app"     "/Applications/"
  echo "App relocation pass complete."
}

# ----------------------------------------------------------------------
# TIER 2 — move installers to an external drive
# ----------------------------------------------------------------------
do_tier2() {
  echo
  echo "=== TIER 2 — MOVE INSTALLERS TO EXTERNAL ==="
  if [ -z "$EXTERNAL" ]; then
    echo "Refusing: --tier2 requires --external PATH"
    exit 6
  fi
  if [ ! -d "$EXTERNAL" ]; then
    echo "Refusing: external path does not exist: $EXTERNAL"
    exit 7
  fi
  if [ ! -w "$EXTERNAL" ]; then
    echo "Refusing: external path is not writable: $EXTERNAL"
    exit 8
  fi

  local stamp
  stamp="$(date +%Y-%m)"
  local dst="$EXTERNAL/installers-archive-$stamp"
  mkdir -p "$dst"
  echo "Destination: $dst"
  pops_review
  snapshot_tosortout

  echo
  echo "Installers at workspace root:"
  for f in Claude.dmg Codex.dmg node-v24.14.1.pkg \
           OpenJDK25U-jdk_aarch64_mac_hotspot_25.0.2_10.pkg; do
    confirm_mv "./$f" "$dst/"
  done

  echo
  echo "Installers in _TOSORTOUT/:"
  for f in "_TOSORTOUT/Microsoft_365_and_Office_16.107.26040410_Installer.pkg" \
           "_TOSORTOUT/sourcery-1.43.0.zip" \
           "_TOSORTOUT/Linear-1.29.5-universal.dmg" \
           "_TOSORTOUT/installGitKraken.dmg" \
           "_TOSORTOUT/Antigravity.dmg" \
           "_TOSORTOUT/Postman for macOS (arm64).zip" \
           "_TOSORTOUT/chromeremotedesktop.dmg"; do
    confirm_mv "$f" "$dst/"
  done

  echo
  echo "Older HEAVEN_DEPLOY tree (superseded by heaven/):"
  confirm_mv "_TOSORTOUT/HEAVEN_DEPLOY" "$dst/"

  echo
  echo "Tier 2 pass complete. Destination contents:"
  ls -lh "$dst" || true
}

# ----------------------------------------------------------------------
# Run what was asked
# ----------------------------------------------------------------------
ran_anything=0
if [ "$TIER1" -eq 1 ]; then do_tier1; ran_anything=1; fi
if [ "$APPS"  -eq 1 ]; then do_apps;  ran_anything=1; fi
if [ "$TIER2" -eq 1 ]; then do_tier2; ran_anything=1; fi

if [ "$ran_anything" -eq 0 ]; then
  echo
  echo "Nothing selected. Pass one or more of: --tier1 --apps --tier2"
  exit 0
fi

echo
echo "Done. Current workspace size:"
du -sh "$WORKSPACE"
