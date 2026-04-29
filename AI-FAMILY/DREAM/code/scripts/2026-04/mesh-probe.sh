#!/bin/bash
# mesh-probe.sh
# Network reachability probe for a Lucy Mesh node.
#
# Use when a mesh surface (iPhone / iPad / Mickey P / etc.) appears
# unreachable, and you need to know whether it's the network, the port,
# or the auth handshake that's failing.
#
# Usage:
#   ./mesh-probe.sh <ip-or-host>
#   ./mesh-probe.sh 10.90.90.100
#
# Reads only. No writes. Safe to run from any node.

set -u

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "usage: $0 <ip-or-host>"
  exit 2
fi

divider() { printf '\n----- %s -----\n' "$*"; }

divider "target"
echo "$TARGET"
date

divider "1. ICMP ping (is the box alive?)"
ping -c 3 -W 2000 "$TARGET" 2>&1 || echo "(ping failed)"

divider "2. ARP cache (MAC address if on same LAN)"
arp -an 2>/dev/null | grep "$TARGET" || echo "(no arp entry — not on local LAN or not yet resolved)"

divider "3. mDNS / Bonjour name (if applicable)"
dns-sd -q "$TARGET" 2>/dev/null &
DNSPID=$!
sleep 2
kill "$DNSPID" 2>/dev/null

divider "4. Port probes"
probe_port() {
  local port="$1"
  local label="$2"
  if nc -z -G 2 "$TARGET" "$port" 2>/dev/null; then
    echo "OPEN   $port  ($label)"
  else
    echo "closed $port  ($label)"
  fi
}
probe_port 22   "SSH / Remote Login"
probe_port 5900 "Screen Sharing (VNC)"
probe_port 548  "AFP"
probe_port 445  "SMB file sharing"
probe_port 139  "NetBIOS"
probe_port 3283 "Apple Remote Desktop"
probe_port 88   "Kerberos"
probe_port 80   "HTTP"
probe_port 443  "HTTPS"

divider "5. SSH handshake (just the banner, no login)"
nc -w 3 "$TARGET" 22 </dev/null 2>&1 | head -3 || echo "(no SSH banner)"

divider "6. VNC handshake (protocol version)"
# A bare VNC server will announce "RFB 003.00X\n" on connect.
(echo "" | nc -w 3 "$TARGET" 5900 2>&1 | head -1) || echo "(no VNC banner)"

divider "Interpretation guide"
cat <<'EOF'
  - ping fails, arp empty  : routing/network issue (VPN? subnet? cable?)
  - ping ok, all ports closed : firewall on the target
  - ping ok, 5900 closed   : Screen Sharing not enabled — enable in System Preferences -> Sharing
  - ping ok, 22 closed     : Remote Login not enabled
  - 5900 open but client won't auth : Catalina/Sonoma handshake drift.
       Workaround: on Mickey P, enable "VNC viewers may control screen with password"
       and connect from a plain VNC client (RealVNC Viewer, Jump Desktop).
  - 22 open  : you have a command channel. Use it.
EOF
