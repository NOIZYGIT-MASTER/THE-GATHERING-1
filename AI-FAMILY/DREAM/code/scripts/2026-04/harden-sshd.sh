#!/bin/bash
# =============================================================
# harden-sshd.sh — SSH hardening for the deploy host
# Run once, as root, AFTER server-setup.sh has completed and
# AFTER you have successfully tested pubkey login as the deploy user.
#
# What it does:
#   - Disables password authentication
#   - Disables root SSH login
#   - Disables keyboard-interactive / challenge-response
#   - Leaves pubkey auth intact
#   - Writes a drop-in at /etc/ssh/sshd_config.d/99-deploy.conf
#     (original /etc/ssh/sshd_config is not modified)
#   - Validates config with `sshd -t` BEFORE reloading the service
#   - Reloads (not restarts) so existing sessions stay alive
#
# Revert: delete /etc/ssh/sshd_config.d/99-deploy.conf and reload ssh.
#
# Safety: keep this terminal session open until you have verified
# key-based login works in a NEW terminal. If it doesn't, revert here.
# =============================================================

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "✖ Must be run as root."
  exit 1
fi

CONF_DIR="/etc/ssh/sshd_config.d"
CONF_FILE="${CONF_DIR}/99-deploy.conf"

# Some older Debian/Ubuntu installs don't pre-create the drop-in dir,
# and/or don't 'Include' it. Check and bail with guidance if not.
if ! grep -q '^Include .*sshd_config\.d' /etc/ssh/sshd_config 2>/dev/null; then
  echo "⚠  /etc/ssh/sshd_config does not Include sshd_config.d/*.conf"
  echo "   On most modern distros it does. If yours doesn't, either:"
  echo "     a) add   Include /etc/ssh/sshd_config.d/*.conf   to sshd_config, or"
  echo "     b) paste the settings below directly into sshd_config."
  echo "   Not proceeding automatically."
  exit 1
fi

install -d -m 755 "${CONF_DIR}"

if [[ -f "${CONF_FILE}" ]]; then
  cp "${CONF_FILE}" "${CONF_FILE}.bak.$(date +%s)"
  echo "✓ Existing drop-in backed up."
fi

cat > "${CONF_FILE}" <<'EOF'
# Deploy-host SSH hardening — drop-in overrides.
# Review before enabling on a host you cannot physically access.
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
UsePAM yes
# Optional: restrict who can connect over SSH at all.
# Uncomment once you are confident the deploy user's key works.
# AllowUsers deploy
EOF

chmod 644 "${CONF_FILE}"

# Validate BEFORE reload. A broken sshd config can lock you out.
if ! sshd -t; then
  echo "✖ sshd config failed validation. Reverting drop-in."
  rm -f "${CONF_FILE}"
  exit 1
fi

# Reload — not restart — to preserve current sessions.
if systemctl list-unit-files | grep -q '^ssh\.service'; then
  systemctl reload ssh
elif systemctl list-unit-files | grep -q '^sshd\.service'; then
  systemctl reload sshd
else
  echo "⚠ Could not find ssh.service or sshd.service. Reload manually."
  exit 1
fi

echo ""
echo "✅ SSH hardened."
echo "   Password login: disabled"
echo "   Root SSH login: disabled"
echo ""
echo "   ▶ Open a NEW terminal and run:"
echo "       ssh -i <your_key> ${SUDO_USER:-deploy}@<this_host>"
echo "     Confirm login works BEFORE closing this session."
echo ""
