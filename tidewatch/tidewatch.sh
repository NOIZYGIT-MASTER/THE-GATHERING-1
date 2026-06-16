#!/usr/bin/env bash
# TIDEWATCH shell integration (bash) — source from ~/.bashrc
# ==========================================================
# Adds a `tw` command so the three archive moves are one word away.
# Owner: RSP_001 (Robert Stephen Plowman)
#
# Place AFTER the Ghostty block. Add this line to ~/.bashrc:
#   [ -f "$HOME/RSPNOIZY/THE-GATHERING/tidewatch/tidewatch.sh" ] && \
#     source "$HOME/RSPNOIZY/THE-GATHERING/tidewatch/tidewatch.sh"
#
# Portable: a safe no-op on any machine where the toolkit isn't present,
# so the same bashrc works in Ghostty, Warp, and iTerm alike.

export TIDEWATCH_HOME="${TIDEWATCH_HOME:-$HOME/RSPNOIZY/THE-GATHERING/tidewatch}"
export ARCHIVE_ROOT="${ARCHIVE_ROOT:-/Volumes/AQUARIUM}"

if [ -d "$TIDEWATCH_HOME" ]; then

  # make the tools callable from anywhere (idempotent)
  case ":$PATH:" in
    *":$TIDEWATCH_HOME:"*) ;;
    *) PATH="$TIDEWATCH_HOME:$PATH" ;;
  esac

  tw() {
    local home="$TIDEWATCH_HOME"
    local root="${ARCHIVE_ROOT:-/Volumes/AQUARIUM}"
    local manifest="$home/aquarium.manifest.jsonl"
    local fixity="$home/tidewatch_fixity.py"
    local sync="$home/aquarium_coldsync.sh"
    local cmd="${1:-help}"; [ $# -gt 0 ] && shift

    case "$cmd" in
      audit|inventory)   python3 "$fixity" inventory "$root" "$@" ;;
      baseline|manifest) python3 "$fixity" manifest "$root" -o "$manifest" --resume "$@" ;;
      verify)            python3 "$fixity" verify "$root" -m "$manifest" -r "$home/last_drift.json" "$@" ;;
      push)              ( cd "$home" && ARCHIVE_ROOT="$root" bash "$sync" push "$@" ) ;;
      run)               ( cd "$home" && ARCHIVE_ROOT="$root" bash "$sync" push --run "$@" ) ;;
      cd)                cd "$home" || return ;;
      where)             printf 'TIDEWATCH_HOME=%s\nARCHIVE_ROOT=%s\n' "$home" "$root" ;;
      help|*)
        cat <<'USAGE'
tw — TIDEWATCH archive control (RSP_001)
  tw audit       size/type/folder breakdown of the archive (the storage audit)
  tw baseline    build / resume the BLAKE3 fixity manifest
  tw verify      re-hash and diff vs manifest (catches bitrot); exit 1 = drift
  tw push        dry-run the offsite cold sync
  tw run         execute the offsite cold sync (add-only copy)
  tw cd          cd into the toolkit directory
  tw where       show resolved TIDEWATCH_HOME / ARCHIVE_ROOT
USAGE
        ;;
    esac
  }

  # tab-completion for the subcommands
  _tw() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    COMPREPLY=( $(compgen -W "audit baseline verify push run cd where help" -- "$cur") )
  }
  complete -F _tw tw

fi
