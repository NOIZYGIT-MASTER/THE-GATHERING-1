#!/usr/bin/env bash
# consolidate.sh — copy every canonical GABRIEL file into DREAMCHAMBER/GABRIEL/
#
# Safe by default:
#   - DRY RUN MODE unless you pass --execute
#   - Skips missing sources with a warning (does not abort)
#   - Skips destinations that already exist (does not overwrite)
#   - Never touches .env / .key / .pem / .db / node_modules / .build
#   - Never modifies any source file
#
# Usage:
#   ./consolidate.sh                  # dry run — prints what would happen
#   ./consolidate.sh --execute        # actually perform the copies
#   ./consolidate.sh --execute --force-overwrite   # overwrite existing dests
#
# After execution, review with:
#   git -C /Users/m2ultra/NOIZYLAB/_consolidation/THE-GATHERING status
#   git -C /Users/m2ultra/NOIZYLAB/_consolidation/THE-GATHERING diff --stat

set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
SRC_ROOT="/Users/m2ultra/NOIZYLAB"
DEST_ROOT="/Users/m2ultra/NOIZYLAB/_consolidation/THE-GATHERING/DREAMCHAMBER/GABRIEL"

EXECUTE=false
FORCE_OVERWRITE=false
for arg in "$@"; do
  case "$arg" in
    --execute)         EXECUTE=true ;;
    --force-overwrite) FORCE_OVERWRITE=true ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ─── Colors ──────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  G=$'\033[0;32m' Y=$'\033[1;33m' R=$'\033[0;31m' B=$'\033[1;34m' N=$'\033[0m'
else
  G='' Y='' R='' B='' N=''
fi

# ─── Counters ────────────────────────────────────────────────────────────────
COPIED=0
SKIPPED_MISSING=0
SKIPPED_EXISTS=0
FAILED=0

# ─── Helpers ─────────────────────────────────────────────────────────────────
# copy_file <src-relative-to-SRC_ROOT> <dest-relative-to-DEST_ROOT>
copy_file() {
  local src_rel="$1"
  local dest_rel="$2"
  local src="$SRC_ROOT/$src_rel"
  local dest="$DEST_ROOT/$dest_rel"

  if [[ ! -e "$src" ]]; then
    echo "  ${Y}skip missing${N}  $src_rel"
    SKIPPED_MISSING=$((SKIPPED_MISSING + 1))
    return 0
  fi

  if [[ -e "$dest" && "$FORCE_OVERWRITE" != "true" ]]; then
    echo "  ${Y}skip exists${N}   $dest_rel"
    SKIPPED_EXISTS=$((SKIPPED_EXISTS + 1))
    return 0
  fi

  if [[ "$EXECUTE" != "true" ]]; then
    echo "  ${B}would copy${N}    $src_rel  →  $dest_rel"
    COPIED=$((COPIED + 1))
    return 0
  fi

  mkdir -p "$(dirname "$dest")"
  if cp -a "$src" "$dest"; then
    echo "  ${G}copied${N}        $dest_rel"
    COPIED=$((COPIED + 1))
  else
    echo "  ${R}FAILED${N}        $src_rel  →  $dest_rel" >&2
    FAILED=$((FAILED + 1))
  fi
}

# copy_glob <src-dir-relative> <dest-dir-relative> <glob>
# Copies every matching file one-by-one so counters stay accurate.
copy_glob() {
  local src_dir="$1"
  local dest_dir="$2"
  local pattern="$3"
  local src_abs="$SRC_ROOT/$src_dir"

  if [[ ! -d "$src_abs" ]]; then
    echo "  ${Y}skip missing dir${N}  $src_dir"
    SKIPPED_MISSING=$((SKIPPED_MISSING + 1))
    return 0
  fi

  # Only globs in $src_abs (not recursive).
  shopt -s nullglob
  local found=0
  for src_file in "$src_abs"/$pattern; do
    [[ -f "$src_file" ]] || continue
    local base
    base=$(basename "$src_file")
    copy_file "$src_dir/$base" "$dest_dir/$base"
    found=$((found + 1))
  done
  shopt -u nullglob

  if [[ $found -eq 0 ]]; then
    echo "  ${Y}no matches${N}    $src_dir/$pattern"
  fi
}

# ─── Banner ──────────────────────────────────────────────────────────────────
echo ""
echo "🜂 GABRIEL consolidate — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ "$EXECUTE" == "true" ]]; then
  echo "   mode: ${G}EXECUTE${N}  (overwrite=$FORCE_OVERWRITE)"
else
  echo "   mode: ${B}DRY RUN${N}  (pass --execute to perform copies)"
fi
echo "   src:  $SRC_ROOT"
echo "   dest: $DEST_ROOT"
echo ""

# ─── Sanity check ────────────────────────────────────────────────────────────
if [[ ! -d "$DEST_ROOT" ]]; then
  echo "${R}✗ destination does not exist: $DEST_ROOT${N}"
  echo "  create it first (or run this from the DREAMCHAMBER/GABRIEL/ dir)."
  exit 1
fi

if [[ ! -f "$DEST_ROOT/MASTER_GABRIEL.md" ]]; then
  echo "${R}✗ MASTER_GABRIEL.md not found in destination. Aborting.${N}"
  echo "  Write the master doctrine first — otherwise this is copying without a source of truth."
  exit 1
fi

# ─── Daemon + iOS + scripts ─────────────────────────────────────────────────
echo "${B}daemon/${N}"
copy_file "apps/GABRIEL/daemon/gabriel-daemon.js"            "daemon/gabriel-daemon.js"
copy_file "apps/GABRIEL/scripts/ai.noizy.gabriel.plist"      "daemon/ai.noizy.gabriel.plist"

echo "${B}ios/${N}"
copy_file "apps/GABRIEL/ios/LUCY/LUCY/Services/GabrielClient.swift" "ios/GabrielClient.swift"

echo "${B}prompts/${N}"
copy_file "apps/GABRIEL/prompts/GABRIEL_MASTER.md"                      "prompts/GABRIEL_MASTER_legacy.md"
copy_file "mc96/eco/wisdom/prompts/GABRIEL_PROMPT.md"                   "prompts/GABRIEL_PROMPT.md"
copy_file ".claude/prompts/gabriel-boot.md"                             "prompts/gabriel-boot.md"
copy_file ".claude/prompts/gabriel-release-commander.md"                "prompts/gabriel-release-commander.md"
copy_file ".claude/worktrees/youthful-edison/github-consolidation/agents/prompts/GABRIEL-v4.md" \
          "prompts/GABRIEL-v4.md"

echo "${B}scripts/${N}"
copy_file "scripts/gabriel-dispatch.sh"                                 "scripts/gabriel-dispatch.sh"
copy_file "scripts/gabriel-merge.sh"                                    "scripts/gabriel-merge.sh"
copy_file "_archive/claude-today/scripts/gabriel-recording-setup.sh"    "scripts/gabriel-recording-setup.sh"

# ─── Turbo scripts ──────────────────────────────────────────────────────────
echo "${B}turbo-scripts/shell/${N}"
copy_glob "tools/CODEMASTER/turbo-scripts"      "turbo-scripts/shell"  "*.sh"

echo "${B}turbo-scripts/python/${N}"
copy_glob "tools/CODEMASTER/turbo-scripts/turbo-python"  "turbo-scripts/python"  "*.py"
copy_glob "tools/CODEMASTER/turbo-scripts/turbo-python"  "turbo-scripts/python"  "*.sh"

echo "${B}turbo-omega/${N}"
copy_file "mc96/app/turbo_gabriel_omega.py"     "turbo-omega/turbo_gabriel_omega.py"
copy_file "mc96/app/turbo_memcell.py"           "turbo-omega/turbo_memcell.py"
copy_file "mc96/app/turbo_prompts.py"           "turbo-omega/turbo_prompts.py"
copy_file "mc96/app/turbo_telemetry.py"         "turbo-omega/turbo_telemetry.py"
copy_file "mc96/app/turbo_video_ai.py"          "turbo-omega/turbo_video_ai.py"
copy_file "mc96/app/turbo_audio_ai.py"          "turbo-omega/turbo_audio_ai.py"
copy_file "mc96/app/turbo-pro-upgrade.js"       "turbo-omega/turbo-pro-upgrade.js"

# ─── Modelfiles + Voice + VPN + MCP ─────────────────────────────────────────
echo "${B}modelfiles/${N}"
copy_file "_archive/NOIZYEMPIRE/codemaster/HEAVEN/modelfiles/Modelfile.GABRIEL" \
          "modelfiles/Modelfile.GABRIEL"
copy_file ".claude/worktrees/youthful-edison/modelfiles/Modelfile.gabriel-mind" \
          "modelfiles/Modelfile.gabriel-mind"

echo "${B}voice-engine/${N}"
# Source filename has exotic quotes — wrap in a variable.
VOICE_ENGINE_SRC='_archive/claude-today/11_PROMPTS_AND_TOOLS/"""🗣️ GABRIEL VOICE ENGINE - REFACTORED.py'
copy_file "$VOICE_ENGINE_SRC" "voice-engine/GABRIEL_VOICE_ENGINE_REFACTORED.py"

echo "${B}VPN/${N}"
copy_glob "repos/the-gathering/gabriel/VPN"   "VPN"   "*.conf"

echo "${B}mcp/${N}"
copy_file "_archive/root-mcp-originals/gabriel-mcp.mjs" "mcp/gabriel-mcp.mjs"
copy_file "_archive/NOIZYEMPIRE/codemaster/projects/gabriel-core/mcp/gabriel_mcp_config.py" \
          "mcp/gabriel_mcp_config.py"

# ─── Postman + n8n ──────────────────────────────────────────────────────────
echo "${B}postman/${N}"
copy_file "_archive/noizylab-legacy/integrations/postman/Gabriel.postman_collection.json" \
          "postman/Gabriel.postman_collection.json"

echo "${B}n8n/${N}"
copy_file "_archive/noizylab-legacy/integrations/n8n/01_gabriel_heartbeat.json" \
          "n8n/01_gabriel_heartbeat.json"
copy_file "_archive/noizylab-legacy/integrations/n8n/02_gabriel_command_webhook.json" \
          "n8n/02_gabriel_command_webhook.json"
copy_file "tools/n8n_workflows/01_github_to_gabriel.json" \
          "n8n/01_github_to_gabriel.json"
# ZAP workflows — source names include random prefixes, so resolve dynamically.
for zap_src in "$SRC_ROOT"/infra/n8n-docker/sqlite-backup-*/*__ZAP_*_*GABRIEL*.json; do
  [[ -f "$zap_src" ]] || continue
  zap_base=$(basename "$zap_src")
  # Strip the prefix like 547Ap9bqQOK9zwdi__
  zap_clean="${zap_base#*__}"
  rel_path="${zap_src#$SRC_ROOT/}"
  copy_file "$rel_path" "n8n/$zap_clean"
done

# ─── Docs ───────────────────────────────────────────────────────────────────
echo "${B}docs/${N}"
copy_file "apps/dreamchamber/GABRIEL_EXECUTOR_v1.0.txt"         "docs/GABRIEL_EXECUTOR_v1.0.txt"
copy_file "apps/dreamchamber/GABRIEL_UPGRADE_COMPLETE.md"       "docs/GABRIEL_UPGRADE_COMPLETE.md"
copy_file "_archive/claude-today/03_DREAMCHAMBER/GABRIEL_MASTER_ARCHITECTURE.html" \
          "docs/GABRIEL_MASTER_ARCHITECTURE.html"
copy_file "docs/ai-prompts/GABRIEL_MCP_GEMMA3_HABITS.md"        "docs/GABRIEL_MCP_GEMMA3_HABITS.md"
copy_file "repos/the-gathering/gabriel/memory/GABRIEL_IDEAS.md" "docs/GABRIEL_IDEAS.md"
copy_file "registry/agents/GABRIEL.md"                          "docs/GABRIEL_registry.md"
copy_file "_archive/claude-today/Team Canon/00_Agent_Briefings/GABRIEL.md" \
          "docs/GABRIEL_team_canon.md"
copy_file "_archive/claude-today/GABRIEL-RECORDING-PIPELINE.md" "docs/GABRIEL-RECORDING-PIPELINE.md"

# ─── Report ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$EXECUTE" == "true" ]]; then
  echo "🜂 DONE — copied $COPIED, skipped missing $SKIPPED_MISSING, skipped existing $SKIPPED_EXISTS, failed $FAILED"
else
  echo "🜂 DRY RUN COMPLETE — would copy $COPIED, skip missing $SKIPPED_MISSING, skip existing $SKIPPED_EXISTS"
  echo "   run again with:  ./consolidate.sh --execute"
fi

if [[ "$FAILED" -gt 0 ]]; then
  echo "${R}⚠ $FAILED copies failed — see errors above${N}"
  exit 1
fi
