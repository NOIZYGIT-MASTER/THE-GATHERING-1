#!/usr/bin/env bash
# ============================================================
# FISHNET → DREAMCHAMBER
# Gather all MC96ECOUNIVERSE code & associated files into one
# clean monorepo, ready to push to:
#   git@github.com:RSPNOIZY/DREAMCHAMBER.git
#
# Run this on GOD.local (your M2 Ultra). It does NOT touch the
# system drive any more than absolutely necessary — staging goes
# to an external volume if available, otherwise ~/Downloads.
#
# Author: Robert Stephen Plowman (RSP_001) — rsp@noizyfish.com
# Date:   2026-04-06
# ============================================================
set -euo pipefail

# ---------- CONFIG ----------
GIT_USER_NAME="Robert Stephen Plowman"
GIT_USER_EMAIL="rsp@noizyfish.com"
REMOTE_URL="git@github.com:RSPNOIZY/DREAMCHAMBER.git"
BRANCH="main"

# Stage on external volume if mounted, else ~/Downloads
if [ -d "/Volumes/NOIZYWIN" ] && [ -w "/Volumes/NOIZYWIN" ]; then
  STAGE="/Volumes/NOIZYWIN/DREAMCHAMBER-stage"
elif [ -d "/Volumes/4TBSG" ] && [ -w "/Volumes/4TBSG" ]; then
  STAGE="/Volumes/4TBSG/DREAMCHAMBER-stage"
elif [ -d "/Volumes/FISH" ] && [ -w "/Volumes/FISH" ]; then
  STAGE="/Volumes/FISH/DREAMCHAMBER-stage"
else
  STAGE="$HOME/Downloads/DREAMCHAMBER-stage"
fi

echo "→ Stage directory: $STAGE"
mkdir -p "$STAGE"

# ---------- SOURCE PATHS ----------
# All known reachable roots inside MC96ECOUNIVERSE.
# Add to this list as new mounts come online (Mickey P, PC, etc.)
SOURCES=(
  "$HOME/NOIZYANTHROPIC"
  "$HOME/NOIZYLAB"
  "$HOME/Desktop/CLAUDE TODAY"
  "$HOME/Desktop/HEAVEN"
  "$HOME/Documents/Playground"
  "$HOME/Documents/NOIZYLAB_TEXT_VAULT"
  "$HOME/Documents/Claude"
  "$HOME/Projects/MC96"
  "$HOME/Scripts"
  "$HOME/swift-library"
  "$HOME/GORUNFREE"
)

# ---------- HARD EXCLUDES ----------
# Secrets, credentials, junk, giant binaries — never enter the repo.
EXCLUDES=(
  # Secrets / credentials
  "--exclude=.env"
  "--exclude=.env.*"
  "--exclude=*.env.secrets"
  "--exclude=.ssh/"
  "--exclude=.aws/"
  "--exclude=.azure/"
  "--exclude=.cloudflared/"
  "--exclude=.docker/"
  "--exclude=.gemini/"
  "--exclude=*.key"
  "--exclude=*.pem"
  "--exclude=*.p12"
  "--exclude=id_rsa*"
  "--exclude=id_ed25519*"
  "--exclude=credentials.json"
  "--exclude=*service-account*.json"
  # Build / dependency junk
  "--exclude=node_modules/"
  "--exclude=.venv*/"
  "--exclude=venv/"
  "--exclude=__pycache__/"
  "--exclude=*.pyc"
  "--exclude=.next/"
  "--exclude=.nuxt/"
  "--exclude=dist/"
  "--exclude=build/"
  "--exclude=.cache/"
  "--exclude=.parcel-cache/"
  "--exclude=.wrangler/"
  "--exclude=.vercel/"
  # OS junk
  "--exclude=.DS_Store"
  "--exclude=Thumbs.db"
  "--exclude=*.swp"
  # Big binary types — handle via R2 or LFS later
  "--exclude=*.dylib"
  "--exclude=*.so"
  "--exclude=*.dll"
  "--exclude=*.exe"
  "--exclude=*.dmg"
  "--exclude=*.pkg"
  "--exclude=*.iso"
  "--exclude=*.tar.gz"
  "--exclude=*.tar"
  "--exclude=*.zip"
  "--exclude=*.7z"
  # Large media — keep small samples, exclude masters
  "--exclude=*.wav"
  "--exclude=*.aiff"
  "--exclude=*.flac"
  "--exclude=*.mov"
  "--exclude=*.mp4"
  "--exclude=*.mkv"
  # Existing nested .git dirs (we are making ONE repo)
  "--exclude=.git/"
)

# ---------- GATHER ----------
# Each source is mirrored into STAGE/<basename>/ to preserve provenance.
for SRC in "${SOURCES[@]}"; do
  if [ -d "$SRC" ]; then
    BASE=$(basename "$SRC" | tr ' ' '_')
    DEST="$STAGE/$BASE"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  $SRC  →  $DEST"
    echo "═══════════════════════════════════════════════════════════"
    mkdir -p "$DEST"
    rsync -ah --info=stats1,progress2 "${EXCLUDES[@]}" "$SRC/" "$DEST/"
  else
    echo "  SKIP (not found): $SRC"
  fi
done

# ---------- MANIFEST ----------
echo ""
echo "→ Generating MANIFEST.md"
cd "$STAGE"
{
  echo "# DREAMCHAMBER — FISHNET MANIFEST"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Founder:   $GIT_USER_NAME <$GIT_USER_EMAIL>"
  echo "Remote:    $REMOTE_URL"
  echo ""
  echo "## Top-level directories"
  echo ""
  for d in */; do
    SIZE=$(du -sh "$d" 2>/dev/null | cut -f1)
    COUNT=$(find "$d" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "- \`$d\` — $SIZE — $COUNT files"
  done
  echo ""
  echo "## Total"
  echo ""
  echo "- Size: $(du -sh . 2>/dev/null | cut -f1)"
  echo "- Files: $(find . -type f 2>/dev/null | wc -l | tr -d ' ')"
  echo ""
  echo "## Sacred Invariants"
  echo ""
  echo "- 75/25 founding member royalty split — never lower"
  echo "- GORUNFREE Trust Clause — 1% to NOIZYKIDZ — irremovable"
  echo "- Kill Switch is absolute — no override"
  echo "- consent_audit_trail — append-only"
  echo "- hvs_id — immutable after creation"
} > MANIFEST.md

# ---------- ROOT README ----------
cat > README.md <<'EOF'
# DREAMCHAMBER

> *"Consent as executable code. Provenance as default. Revocation as sacred. Compensation as automatic."*

The canonical monorepo for the **NOIZY Empire / MC96ECOUNIVERSE** —
18 months of work by **Robert Stephen Plowman (RSP_001)** gathered into one source of truth.

## What lives here

Each top-level directory preserves the provenance of its source location on
GOD.local at the time of FISHNET. See `MANIFEST.md` for the full inventory.

## Sacred Invariants (NEVER violate)

- Founding member royalty split = **75%** — never lower
- GORUNFREE Trust Clause — **1% to NOIZYKIDZ** — irremovable
- Kill Switch is absolute — no override, no lawyer required
- `consent_audit_trail` — append-only, no UPDATE or DELETE ever permitted
- `hvs_id` — immutable after creation

## Contact

**Robert Stephen Plowman** — `rsp@noizyfish.com` — Canada
EOF

# ---------- GITIGNORE ----------
cat > .gitignore <<'EOF'
# Secrets — never commit
.env
.env.*
*.env.secrets
.ssh/
.aws/
.azure/
.cloudflared/
.docker/
*.key
*.pem
*.p12
id_rsa*
id_ed25519*
credentials.json
*service-account*.json

# Build / deps
node_modules/
.venv*/
venv/
__pycache__/
*.pyc
.next/
.nuxt/
dist/
build/
.cache/
.wrangler/
.vercel/

# OS
.DS_Store
Thumbs.db
*.swp

# Big binaries — use R2 or LFS
*.dylib
*.so
*.dll
*.exe
*.dmg
*.pkg
*.iso
*.tar.gz
*.tar
*.zip
*.7z
*.wav
*.aiff
*.flac
*.mov
*.mp4
*.mkv
EOF

# ---------- INIT GIT ----------
echo ""
echo "→ Initializing git repo"
git init -b "$BRANCH" >/dev/null
git config user.name  "$GIT_USER_NAME"
git config user.email "$GIT_USER_EMAIL"
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

# ---------- STAGE & COMMIT ----------
echo "→ Staging files (this can take a minute on a big tree)"
git add -A
echo "→ Creating commit"
git commit -m "FISHNET: gather MC96ECOUNIVERSE → DREAMCHAMBER

18 months of NOIZY Empire work consolidated into a single monorepo.
Sources: NOIZYANTHROPIC, NOIZYLAB, CLAUDE TODAY, HEAVEN, Playground,
NOIZYLAB_TEXT_VAULT, Claude scheduled tasks, Projects/MC96, Scripts,
swift-library, GORUNFREE.

Sacred invariants intact:
- 75/25 royalty split
- GORUNFREE clause
- Kill Switch absolute
- consent_audit_trail append-only
- hvs_id immutable

Founder: Robert Stephen Plowman (RSP_001) <rsp@noizyfish.com>" >/dev/null

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  FISHNET COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Stage:  $STAGE"
echo "Remote: $REMOTE_URL"
echo ""
echo "Next steps:"
echo "  1. Review:   cd \"$STAGE\" && git log --stat | head -50"
echo "  2. Verify:   cat MANIFEST.md"
echo "  3. Push:     git push -u origin $BRANCH"
echo ""
echo "If push fails with auth error, ensure you're logged in:"
echo "  ssh -T git@github.com   # should greet you as RSPNOIZY"
echo ""
