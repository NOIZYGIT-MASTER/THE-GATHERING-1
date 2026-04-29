#!/bin/bash
# mickey-p-audit.sh
# Portable macOS audit — READ ONLY.
#
# Purpose:
#   Capture a full picture of a macOS machine (apps, plug-ins, launch items,
#   user homes, disks, network) so two user accounts can be safely merged
#   and the machine's maintenance state understood.
#
# Target:
#   Designed to run on OSX Catalina (10.15) and up. Uses bash 3.2 primitives.
#
# Safety:
#   This script does not modify the target system. It only reads.
#   It writes all output into an audit directory in $HOME.
#
# Usage (on Mickey P):
#   1. Copy this file to Mickey P (USB, SCP, or Messages/AirDrop).
#   2. chmod +x mickey-p-audit.sh
#   3. ./mickey-p-audit.sh            # audits current user only
#      ./mickey-p-audit.sh --all-users # also walks every /Users/* home (read-only)
#   4. Bring the resulting .tar.gz back to the M2 Ultra for analysis.
#
# Architect: Robert Stephen Plowman
# Agent:     ENGR
# Repo:      RSP-NOIZY/agents/engr/scripts/

set -u

STAMP="$(date +%Y%m%d-%H%M%S)"
HOST="$(hostname -s 2>/dev/null || echo unknown-host)"
OUT_BASE="$HOME/mickey-p-audit-${HOST}-${STAMP}"
ALL_USERS=0

if [ "${1:-}" = "--all-users" ]; then
  ALL_USERS=1
fi

mkdir -p "$OUT_BASE" || { echo "Cannot create $OUT_BASE"; exit 1; }

log() {
  echo "[$(date +%H:%M:%S)] $*"
}

safe_run() {
  # safe_run <outfile> <command...>
  local outfile="$1"; shift
  echo "# COMMAND: $*"           >  "$OUT_BASE/$outfile"
  echo "# HOST:    $HOST"         >> "$OUT_BASE/$outfile"
  echo "# WHEN:    $(date)"       >> "$OUT_BASE/$outfile"
  echo "# ---"                    >> "$OUT_BASE/$outfile"
  "$@" >> "$OUT_BASE/$outfile" 2>&1 || echo "# (command exited non-zero: $?)" >> "$OUT_BASE/$outfile"
}

log "Starting audit -> $OUT_BASE"

# ---------------------------------------------------------------------------
# 1. System identity
# ---------------------------------------------------------------------------
log "1. System identity"
safe_run 01-system-uname.txt     uname -a
safe_run 01-system-sw_vers.txt   sw_vers
safe_run 01-system-hardware.txt  system_profiler SPHardwareDataType
safe_run 01-system-software.txt  system_profiler SPSoftwareDataType
safe_run 01-system-uptime.txt    uptime
safe_run 01-system-date.txt      date

# ---------------------------------------------------------------------------
# 2. Users on the box
# ---------------------------------------------------------------------------
log "2. Users"
safe_run 02-users-list.txt       dscl . list /Users
safe_run 02-users-nonservice.txt bash -c "dscl . list /Users | grep -v '^_'"
safe_run 02-users-homedirs.txt   bash -c "ls -la /Users"
safe_run 02-users-groups.txt     dscl . list /Groups
safe_run 02-users-admins.txt     dscl . read /Groups/admin GroupMembership

# ---------------------------------------------------------------------------
# 3. Applications
# ---------------------------------------------------------------------------
log "3. Applications"
safe_run 03-apps-profiler.txt        system_profiler SPApplicationsDataType
safe_run 03-apps-applications-dir.txt bash -c "ls -la /Applications"
safe_run 03-apps-applications-utils.txt bash -c "ls -la /Applications/Utilities 2>/dev/null"
safe_run 03-apps-user-applications.txt bash -c "ls -la \"$HOME/Applications\" 2>/dev/null"
safe_run 03-apps-receipts.txt         bash -c "ls -la /Library/Receipts 2>/dev/null; echo '---'; pkgutil --pkgs 2>/dev/null"

# ---------------------------------------------------------------------------
# 4. Plug-ins (every known macOS plug-in location)
# ---------------------------------------------------------------------------
log "4. Plug-ins"
safe_run 04-plugins-internet-system.txt    bash -c "ls -la /Library/Internet\\ Plug-Ins 2>/dev/null"
safe_run 04-plugins-internet-user.txt      bash -c "ls -la \"$HOME/Library/Internet Plug-Ins\" 2>/dev/null"
safe_run 04-plugins-audio-components.txt   bash -c "ls -la /Library/Audio/Plug-Ins/Components 2>/dev/null"
safe_run 04-plugins-audio-vst.txt          bash -c "ls -la /Library/Audio/Plug-Ins/VST 2>/dev/null; echo '---'; ls -la /Library/Audio/Plug-Ins/VST3 2>/dev/null"
safe_run 04-plugins-audio-user.txt         bash -c "ls -la \"$HOME/Library/Audio/Plug-Ins/Components\" 2>/dev/null; echo '---'; ls -la \"$HOME/Library/Audio/Plug-Ins/VST\" 2>/dev/null"
safe_run 04-plugins-quicklook.txt          bash -c "ls -la /Library/QuickLook 2>/dev/null; echo '---'; ls -la \"$HOME/Library/QuickLook\" 2>/dev/null"
safe_run 04-plugins-spotlight.txt          bash -c "ls -la /Library/Spotlight 2>/dev/null; echo '---'; ls -la \"$HOME/Library/Spotlight\" 2>/dev/null"
safe_run 04-plugins-prefpanes.txt          bash -c "ls -la /Library/PreferencePanes 2>/dev/null; echo '---'; ls -la \"$HOME/Library/PreferencePanes\" 2>/dev/null"
safe_run 04-plugins-screensavers.txt       bash -c "ls -la /Library/Screen\\ Savers 2>/dev/null; echo '---'; ls -la \"$HOME/Library/Screen Savers\" 2>/dev/null"
safe_run 04-plugins-safari-extensions.txt  bash -c "ls -la \"$HOME/Library/Safari/Extensions\" 2>/dev/null"
safe_run 04-plugins-contextual-menu.txt    bash -c "ls -la /Library/Contextual\\ Menu\\ Items 2>/dev/null"
safe_run 04-plugins-kexts.txt              bash -c "kextstat 2>/dev/null"

# ---------------------------------------------------------------------------
# 5. Launch items and background services
# ---------------------------------------------------------------------------
log "5. Launch items"
safe_run 05-launchd-system-agents.txt     bash -c "ls -la /Library/LaunchAgents 2>/dev/null"
safe_run 05-launchd-system-daemons.txt    bash -c "ls -la /Library/LaunchDaemons 2>/dev/null"
safe_run 05-launchd-apple-agents.txt      bash -c "ls -la /System/Library/LaunchAgents 2>/dev/null"
safe_run 05-launchd-apple-daemons.txt     bash -c "ls -la /System/Library/LaunchDaemons 2>/dev/null"
safe_run 05-launchd-user-agents.txt       bash -c "ls -la \"$HOME/Library/LaunchAgents\" 2>/dev/null"
safe_run 05-launchctl-list.txt            launchctl list
safe_run 05-login-items.txt               osascript -e 'tell application "System Events" to get the name of every login item'
safe_run 05-startupitems.txt              bash -c "ls -la /Library/StartupItems 2>/dev/null"

# ---------------------------------------------------------------------------
# 6. Developer / package managers
# ---------------------------------------------------------------------------
log "6. Developer tools"
safe_run 06-dev-brew-list.txt       bash -c "command -v brew >/dev/null && brew list --versions 2>/dev/null"
safe_run 06-dev-brew-cask.txt       bash -c "command -v brew >/dev/null && brew list --cask --versions 2>/dev/null"
safe_run 06-dev-pip-list.txt        bash -c "command -v pip3 >/dev/null && pip3 list 2>/dev/null"
safe_run 06-dev-npm-global.txt      bash -c "command -v npm >/dev/null && npm ls -g --depth=0 2>/dev/null"
safe_run 06-dev-gem-list.txt        bash -c "command -v gem >/dev/null && gem list 2>/dev/null"
safe_run 06-dev-node-version.txt    bash -c "command -v node >/dev/null && node --version 2>/dev/null"
safe_run 06-dev-python-version.txt  bash -c "command -v python3 >/dev/null && python3 --version 2>/dev/null"
safe_run 06-dev-xcode-version.txt   bash -c "xcodebuild -version 2>/dev/null; xcode-select -p 2>/dev/null"

# ---------------------------------------------------------------------------
# 7. Disks and storage
# ---------------------------------------------------------------------------
log "7. Disks"
safe_run 07-disk-list.txt          diskutil list
safe_run 07-disk-info-root.txt     diskutil info /
safe_run 07-disk-df.txt            df -h
safe_run 07-disk-mounts.txt        mount
safe_run 07-disk-apfs.txt          diskutil apfs list
safe_run 07-disk-storage-profiler.txt system_profiler SPStorageDataType
safe_run 07-disk-smart.txt         bash -c "command -v smartctl >/dev/null && smartctl --scan 2>/dev/null && for d in \$(diskutil list | awk '/^\\/dev\\/disk[0-9]+ /{print \$1}'); do echo '=== '\$d; smartctl -a \$d 2>/dev/null; done"
safe_run 07-disk-timemachine.txt   tmutil destinationinfo

# ---------------------------------------------------------------------------
# 8. Network
# ---------------------------------------------------------------------------
log "8. Network"
safe_run 08-net-ifconfig.txt       ifconfig
safe_run 08-net-route.txt          netstat -rn
safe_run 08-net-arp.txt            arp -a
safe_run 08-net-services.txt       bash -c "networksetup -listallnetworkservices 2>/dev/null"
safe_run 08-net-wifi.txt           bash -c "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null"
safe_run 08-net-dns.txt            scutil --dns
safe_run 08-net-listening.txt      bash -c "lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | head -200"

# ---------------------------------------------------------------------------
# 9. Sharing and remote access status
# ---------------------------------------------------------------------------
log "9. Sharing"
safe_run 09-sharing-profiler.txt   bash -c "system_profiler SPFirewallDataType 2>/dev/null; echo '---'; sudo -n launchctl list 2>/dev/null | grep -i -E 'screen|ssh|smb|afp' 2>/dev/null"
safe_run 09-sharing-smb.txt        bash -c "sharing -l 2>/dev/null"
safe_run 09-sharing-remotelogin.txt bash -c "sudo -n systemsetup -getremotelogin 2>/dev/null || echo 'needs sudo'"
safe_run 09-sharing-computername.txt bash -c "scutil --get ComputerName 2>/dev/null; scutil --get LocalHostName 2>/dev/null; scutil --get HostName 2>/dev/null"

# ---------------------------------------------------------------------------
# 10. Security posture
# ---------------------------------------------------------------------------
log "10. Security"
safe_run 10-security-gatekeeper.txt    spctl --status
safe_run 10-security-sip.txt           csrutil status
safe_run 10-security-filevault.txt     fdesetup status
safe_run 10-security-firewall.txt      bash -c "/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null"

# ---------------------------------------------------------------------------
# 11. File manifests
# ---------------------------------------------------------------------------
log "11. File manifests (this can take a while)"

manifest_home() {
  local user="$1"
  local home="$2"
  local tag="$3"
  log "   ... scanning $home"
  safe_run "11-manifest-${tag}-du.txt"       bash -c "du -sh \"$home\"/* 2>/dev/null"
  safe_run "11-manifest-${tag}-desktop.txt"  bash -c "find \"$home/Desktop\" -maxdepth 3 -type f 2>/dev/null | head -2000"
  safe_run "11-manifest-${tag}-documents.txt" bash -c "find \"$home/Documents\" -type f 2>/dev/null | head -5000"
  safe_run "11-manifest-${tag}-downloads.txt" bash -c "find \"$home/Downloads\" -type f 2>/dev/null | head -2000"
  safe_run "11-manifest-${tag}-library-top.txt" bash -c "ls -la \"$home/Library\" 2>/dev/null"
  safe_run "11-manifest-${tag}-appsupport.txt"  bash -c "ls -la \"$home/Library/Application Support\" 2>/dev/null"
  safe_run "11-manifest-${tag}-prefs.txt"       bash -c "ls \"$home/Library/Preferences\" 2>/dev/null | head -500"
  safe_run "11-manifest-${tag}-all-files.txt" bash -c "find \"$home\" -type f -not -path '*/\\.Trash/*' -not -path '*/Library/Caches/*' 2>/dev/null | head -50000"
}

# Current user always
manifest_home "$(whoami)" "$HOME" "current-$(whoami)"

# All users if requested
if [ "$ALL_USERS" -eq 1 ]; then
  for uh in /Users/*; do
    uname="$(basename "$uh")"
    case "$uname" in
      Shared|Guest|.localized) continue ;;
    esac
    # Skip service users (start with _)
    case "$uname" in _*) continue ;; esac
    if [ -d "$uh" ] && [ -r "$uh" ]; then
      manifest_home "$uname" "$uh" "user-$uname"
    else
      echo "# unreadable: $uh" > "$OUT_BASE/11-manifest-user-${uname}-UNREADABLE.txt"
    fi
  done
fi

# ---------------------------------------------------------------------------
# 12. Bundle
# ---------------------------------------------------------------------------
log "12. Bundling"
cd "$HOME" || exit 1
TARBALL="mickey-p-audit-${HOST}-${STAMP}.tar.gz"
tar -czf "$TARBALL" -C "$HOME" "$(basename "$OUT_BASE")" 2>/dev/null
log "Done."
log "Directory: $OUT_BASE"
log "Tarball:   $HOME/$TARBALL"
log ""
log "Bring the tarball to the M2 Ultra and drop it in RSP-NOIZY/agents/engr/audits/"
