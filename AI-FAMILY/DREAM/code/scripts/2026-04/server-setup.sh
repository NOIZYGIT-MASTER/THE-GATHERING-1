#!/bin/bash
# =============================================================
# DSP DB Visualizer — Server Account & Permissions Setup (v2, hardened)
# Run as root on a Debian/Ubuntu deploy server:
#   sudo bash server-setup.sh
#
# Changes from v1:
#   - Removed sudo rules for npm and pm2. npm lifecycle scripts
#     run arbitrary code from the dependency tree; allowing them
#     to execute as root via sudo is the wrong trade. Deploy user
#     now runs npm and pm2 as itself.
#   - Sudoers reduced to a single narrow rule:
#       systemctl reload nginx   (no restart, no wildcard, target=root)
#   - Strict mode: set -euo pipefail
#   - OS guard: Debian/Ubuntu apt only
#   - Idempotent SSH key handling + public-key shape validation
#   - Sudoers backup before overwrite
#   - /etc/${APP_NAME}.env placeholder, 0640 root:deploy
#   - App directory permissions 0750 (was 0755)
# =============================================================

set -euo pipefail

APP_NAME="dsp-db-visualizer"
DEPLOY_USER="deploy"
DEPLOY_PATH="/var/www/${APP_NAME}"
NODE_VERSION="20"
ENV_FILE="/etc/${APP_NAME}.env"
SSH_DIR="/home/${DEPLOY_USER}/.ssh"
SUDOERS_FILE="/etc/sudoers.d/${DEPLOY_USER}"

# ── Guards ────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "✖ Must be run as root. Try: sudo bash $0"
  exit 1
fi
if ! command -v apt-get &>/dev/null; then
  echo "✖ This script targets Debian/Ubuntu (apt-get not found). Aborting."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   DSP DB Visualizer — Server Setup v2    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Deploy service account
echo "▶ [1/7] Deploy service account: ${DEPLOY_USER}"
if id "${DEPLOY_USER}" &>/dev/null; then
  echo "  ✓ User already exists, skipping."
else
  useradd --system --create-home --shell /bin/bash \
          --comment "CI/CD Deploy Service Account" \
          "${DEPLOY_USER}"
  echo "  ✓ User '${DEPLOY_USER}' created."
fi

# 2. Sudoers — single narrow rule, no wildcards, no npm/pm2 escalation
echo "▶ [2/7] Sudo rules (one rule only)"
if [[ -f "${SUDOERS_FILE}" ]]; then
  cp "${SUDOERS_FILE}" "${SUDOERS_FILE}.bak.$(date +%s)"
  echo "  ✓ Existing sudoers file backed up."
fi
cat > "${SUDOERS_FILE}" <<EOF
# ${DEPLOY_USER} — least privilege
# npm and pm2 run as the deploy user (no sudo). Only nginx reload needs root.
# 'reload' is preferred over 'restart' to avoid dropping live connections.
${DEPLOY_USER} ALL=(root) NOPASSWD: /bin/systemctl reload nginx
EOF
chmod 440 "${SUDOERS_FILE}"
visudo -cf "${SUDOERS_FILE}" >/dev/null && echo "  ✓ Sudoers valid and installed."

# 3. SSH key auth for GitHub Actions
echo "▶ [3/7] SSH key auth"
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${SSH_DIR}"
AUTH_KEYS="${SSH_DIR}/authorized_keys"
touch "${AUTH_KEYS}"
chmod 600 "${AUTH_KEYS}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTH_KEYS}"

echo ""
echo "  Paste the GitHub Actions PUBLIC key (ssh-ed25519 / ssh-rsa / ecdsa)."
echo "  Leave empty to skip; you can append to ${AUTH_KEYS} later."
read -rp "  > " PUBKEY || PUBKEY=""
if [[ -n "${PUBKEY}" ]]; then
  if [[ ! "${PUBKEY}" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp[0-9]+)\  ]]; then
    echo "  ✖ That does not look like a public key. Skipping without writing."
  elif grep -qxF "${PUBKEY}" "${AUTH_KEYS}"; then
    echo "  ✓ Key already present, not appending."
  else
    echo "${PUBKEY}" >> "${AUTH_KEYS}"
    echo "  ✓ Public key appended."
  fi
else
  echo "  ⚠ Skipped."
fi

# 4. App directory
echo "▶ [4/7] App directory: ${DEPLOY_PATH}"
install -d -m 750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${DEPLOY_PATH}"
echo "  ✓ Directory ready (0750 ${DEPLOY_USER}:${DEPLOY_USER})."

# 5. Env file placeholder
echo "▶ [5/7] Env file: ${ENV_FILE}"
if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<EOF
# ${APP_NAME} environment — edit before first run.
# Owned root:${DEPLOY_USER}, mode 0640 (readable by deploy, not world).
NODE_ENV=production
PORT=3000
# DATABASE_URL=
# SESSION_SECRET=
EOF
  chown "root:${DEPLOY_USER}" "${ENV_FILE}"
  chmod 640 "${ENV_FILE}"
  echo "  ✓ Placeholder created. Edit secrets before first deploy."
else
  echo "  ✓ Env file exists, leaving untouched."
fi

# 6. Node + PM2 (PM2 runs as the deploy user, not root)
echo "▶ [6/7] Node.js ${NODE_VERSION} + PM2"
if command -v node &>/dev/null; then
  echo "  ✓ Node.js $(node -v) already installed."
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
  echo "  ✓ Node.js $(node -v) installed."
fi

if command -v pm2 &>/dev/null; then
  echo "  ✓ PM2 $(pm2 -v) already installed."
else
  npm install -g pm2
  # Install a systemd unit that runs the PM2 daemon as ${DEPLOY_USER} at boot.
  pm2 startup systemd -u "${DEPLOY_USER}" --hp "/home/${DEPLOY_USER}"
  echo "  ✓ PM2 installed, systemd unit registered for ${DEPLOY_USER}."
fi

# 7. GitHub repo access summary (manual checklist)
echo "▶ [7/7] GitHub repo config — manual (printed for checklist)"
cat <<'EOF'
  ┌─────────────────────────────────────────────────────────┐
  │         GitHub Repo Access Configuration                │
  ├─────────────────────────────────────────────────────────┤
  │ Settings → Branches → Protection (main/master):         │
  │   ✅ Require status checks                              │
  │   ✅ Require 1 approving review                         │
  │   ✅ Dismiss stale reviews on new push                  │
  │   ✅ Restrict who can push                              │
  │                                                         │
  │ Settings → Actions → General:                           │
  │   ✅ Allow Actions to create PRs (if used)              │
  │   ✅ Read/write GITHUB_TOKEN (only if required)         │
  │                                                         │
  │ Secrets → Actions:                                      │
  │   DEPLOY_HOST  = server IP/hostname                     │
  │   DEPLOY_USER  = deploy                                 │
  │   DEPLOY_KEY   = private SSH key (paired with pub above)│
  │   DEPLOY_PATH  = /var/www/dsp-db-visualizer             │
  └─────────────────────────────────────────────────────────┘
EOF

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ Server setup complete.              ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Next: run  sudo bash harden-sshd.sh  to lock down SSH."
echo "        Then push .github/workflows/ and add the 4 GitHub secrets."
echo ""
