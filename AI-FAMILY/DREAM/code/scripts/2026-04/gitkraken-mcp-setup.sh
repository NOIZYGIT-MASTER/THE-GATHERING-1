# NOIZY GitKraken MCP Setup + Post-Migration Verification
# Author: RSP_001 — Robert Stephen Plowman | NOIZYFISH INC.
# Run these after migrate-repos-to-noizy-ai.sh completes

## ── 1. GitKraken CLI install + auth (run on GOD terminal) ──────────────────

# Install GitKraken CLI
brew install gitkraken/tap/gk

# Authenticate (opens browser — log in as RSPNOIZY)
gk auth login

# Verify auth
gk auth status

# Test: list repos in NOIZY-ai org
gk repo list --org NOIZY-ai


## ── 2. VS Code Insiders MCP config ─────────────────────────────────────────
# File: ~/.config/Code - Insiders/User/settings.json
# OR via Command Palette → "MCP: Add Server"

# Paste this JSON block:
{
  "mcpServers": {
    "gitkraken": {
      "command": "gk",
      "args": ["mcp"],
      "env": {}
    }
  }
}


## ── 3. Post-migration verification commands (GOD terminal) ─────────────────

# Confirm all repos now live in NOIZY-ai org
curl -s "https://api.github.com/orgs/NOIZY-ai/repos?per_page=100" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  | python3 -c "
import json,sys
repos = json.load(sys.stdin)
print(f'NOIZY-ai org repos: {len(repos)}')
for r in repos:
    print(f'  {r[\"name\"]} — {r[\"updated_at\"][:10]}')
"

# Verify local remotes all point to NOIZY-ai
for repo in NOIZYFISH NOIZYLAB NOIZYKIDZ THE-DREAMCHAMBER DREAMCHAMBER; do
  echo "--- $repo"
  git -C ~/Code/$repo remote -v 2>/dev/null || echo "  (no local clone)"
done

# Test GitKraken MCP can see the org (paste into VS Code agent panel)
# "List all repos in the NOIZY-ai GitHub org with their last commit and default branch"


## ── 4. Repos NOT transferred (documented) ──────────────────────────────────

# RSPNOIZY/RSPNOIZY
#   → GitHub profile README repo. GitHub does not allow transfer of
#     the special <username>/<username> profile repo. Stays on personal account.

# RSPNOIZY/THE-GATHERING  
#   → 421MB fork. GitHub forks can be transferred but the destination org
#     must not already have a repo with the same name.
#     Decision needed: transfer, delete, or leave on personal account?
#     To transfer: add "THE-GATHERING" to the REPOS_TO_TRANSFER array
#     in migrate-repos-to-noizy-ai.sh and re-run just that repo.

# NOIZYLAB-io org (NOIZY.ai, NOIZYLAB, docs.github)
#   → These are under a separate org (NOIZYLAB-io), not RSPNOIZY personal.
#     Separate migration decision needed — not covered by this script.


## ── 5. THE-GATHERING fork decision ─────────────────────────────────────────

# Option A: Transfer it to NOIZY-ai org
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/RSPNOIZY/THE-GATHERING/transfer" \
  -d '{"new_owner":"NOIZY-ai"}'

# Option B: Delete it from personal account (if content lives upstream)
# curl -s -X DELETE \
#   -H "Authorization: Bearer ${GITHUB_TOKEN}" \
#   "https://api.github.com/repos/RSPNOIZY/THE-GATHERING"

# Option C: Leave it on RSPNOIZY personal account (no action needed)
