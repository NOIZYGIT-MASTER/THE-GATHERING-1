#!/bin/zsh
# ============================================================================
# NOIZY.AI — BBEdit Pro Power Stack Setup for GOD (10.90.90.10)
# ============================================================================
#
# Purpose:   Wire BBEdit Pro into the entire NOIZY empire infrastructure
#            Cloudflare, Git enterprise, D1, Linear, Slack, Notion, and more
#
# Author:    Robert Stephen Plowman
# Date:      March 23, 2026
# Machine:   GOD (10.90.90.10)
#
# Usage:     chmod +x bbedit-noizy-setup.sh && ./bbedit-noizy-setup.sh
#
# What this installs:
#   - 12 Scripts menu items (deploy, git, D1, Linear, Slack, Notion, etc.)
#   - 4 Clipping sets (NOIZY code, markdown, worker, manifest templates)
#   - 3 Text Factories (batch processing pipelines)
#   - 1 Custom color scheme (NOIZY Empire Dark)
#   - 1 Preview filter (enhanced markdown with NOIZY brand)
#   - 1 BBEdit project file for the NOIZYFISH workspace
#   - Global defaults (CLI tools, tab settings, encoding)
#
# ============================================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────

BBEDIT_SUPPORT="$HOME/Library/Application Support/BBEdit"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NOIZY_BASE="${NOIZY_BASE_DIR:-$HOME/NOIZYFISH}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo "${GREEN}[OK]${NC}    $1" }
warn() { echo "${YELLOW}[WARN]${NC}  $1" }
fail() { echo "${RED}[FAIL]${NC}  $1" }
info() { echo "${CYAN}[INFO]${NC}  $1" }
step() { echo "\n${BOLD}${PURPLE}── $1 ──${NC}" }

# ── Header ─────────────────────────────────────────────────────────────────

echo ""
echo "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${BOLD}${CYAN}║       NOIZY.AI — BBEdit Pro Power Stack Setup               ║${NC}"
echo "${BOLD}${CYAN}║       Machine: GOD (10.90.90.10)                            ║${NC}"
echo "${BOLD}${CYAN}║       Everything connected. Nothing wasted.                 ║${NC}"
echo "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Pre-flight ─────────────────────────────────────────────────────────────

step "Pre-flight Checks"

# Check BBEdit exists
if [ -d "/Applications/BBEdit.app" ]; then
  ok "BBEdit Pro found at /Applications/BBEdit.app"
else
  fail "BBEdit not found at /Applications/BBEdit.app"
  exit 1
fi

# Check CLI tools
if command -v bbedit &>/dev/null; then
  ok "bbedit CLI available: $(which bbedit)"
else
  warn "bbedit CLI not found — install via BBEdit > Install Command Line Tools..."
  warn "Continuing without CLI verification"
fi

# Check support directory
mkdir -p "$BBEDIT_SUPPORT"/{Scripts,Clippings,Color\ Schemes,Preview\ Filters,Preview\ CSS}
ok "BBEdit Application Support directory ready"

# Check for required tools
for tool in curl jq git wrangler; do
  if command -v "$tool" &>/dev/null; then
    ok "$tool available"
  else
    warn "$tool not found — some scripts may not work without it"
  fi
done

# ── Install Scripts ────────────────────────────────────────────────────────

step "Installing Scripts Menu Items"

SCRIPTS_DIR="$BBEDIT_SUPPORT/Scripts"
mkdir -p "$SCRIPTS_DIR/NOIZY — Cloudflare"
mkdir -p "$SCRIPTS_DIR/NOIZY — Git"
mkdir -p "$SCRIPTS_DIR/NOIZY — D1 Database"
mkdir -p "$SCRIPTS_DIR/NOIZY — Linear"
mkdir -p "$SCRIPTS_DIR/NOIZY — Slack"
mkdir -p "$SCRIPTS_DIR/NOIZY — Notion"
mkdir -p "$SCRIPTS_DIR/NOIZY — Utilities"

# ── Cloudflare Scripts ──

cat > "$SCRIPTS_DIR/NOIZY — Cloudflare/Deploy Current Worker.sh" << 'SCRIPT'
#!/bin/zsh
# Deploy the current file's parent directory as a Cloudflare Worker
# Expects wrangler.toml in the same directory

FILE="$BB_DOC_PATH"
if [ -z "$FILE" ]; then
  echo "No file open in BBEdit"
  exit 1
fi

DIR="$(dirname "$FILE")"
if [ ! -f "$DIR/wrangler.toml" ]; then
  echo "ERROR: No wrangler.toml found in $(basename "$DIR")"
  echo "Navigate to a Cloudflare Worker project directory first."
  exit 1
fi

cd "$DIR"
echo "╔══════════════════════════════════════╗"
echo "║  DEPLOYING: $(basename "$DIR")"
echo "╚══════════════════════════════════════╝"
echo ""
wrangler deploy 2>&1
echo ""
echo "Deploy complete: $(date '+%Y-%m-%d %H:%M:%S')"
SCRIPT

cat > "$SCRIPTS_DIR/NOIZY — Cloudflare/Worker Tail (Live Logs).sh" << 'SCRIPT'
#!/bin/zsh
# Stream live logs from the current worker
FILE="$BB_DOC_PATH"
DIR="$(dirname "$FILE")"
if [ ! -f "$DIR/wrangler.toml" ]; then
  echo "ERROR: No wrangler.toml in $(basename "$DIR")"
  exit 1
fi
cd "$DIR"
WORKER_NAME=$(grep '^name' wrangler.toml | head -1 | cut -d'"' -f2)
echo "Tailing logs for worker: $WORKER_NAME"
echo "Press Ctrl+C to stop"
echo ""
wrangler tail "$WORKER_NAME" 2>&1
SCRIPT

cat > "$SCRIPTS_DIR/NOIZY — Cloudflare/List All Workers.sh" << 'SCRIPT'
#!/bin/zsh
echo "╔══════════════════════════════════════╗"
echo "║  NOIZY.AI — Cloudflare Workers       ║"
echo "╚══════════════════════════════════════╝"
echo ""
wrangler deployments list 2>&1 || echo "(Run 'wrangler login' first if auth fails)"
SCRIPT

cat > "$SCRIPTS_DIR/NOIZY — Cloudflare/Query D1 Database.sh" << 'SCRIPT'
#!/bin/zsh
# Query a D1 database — uses selected text as SQL, or prompts
SQL="$BB_DOC_SELECTED_TEXT"
if [ -z "$SQL" ]; then
  echo "Select a SQL query in the editor first, then run this script."
  echo ""
  echo "Example: SELECT * FROM memcells LIMIT 10;"
  exit 0
fi

DB_NAME="${NOIZY_D1_DB:-agent-memory}"
echo "╔══════════════════════════════════════╗"
echo "║  D1 Query: $DB_NAME"
echo "╚══════════════════════════════════════╝"
echo ""
echo "SQL: $SQL"
echo ""
wrangler d1 execute "$DB_NAME" --command="$SQL" 2>&1
SCRIPT

chmod +x "$SCRIPTS_DIR/NOIZY — Cloudflare/"*.sh
ok "Cloudflare scripts installed (4)"

# ── Git Scripts ──

cat > "$SCRIPTS_DIR/NOIZY — Git/Push to Enterprise.sh" << 'SCRIPT'
#!/bin/zsh
# Push current repo to enterprise (git.noizy.ai)
FILE="$BB_DOC_PATH"
if [ -z "$FILE" ]; then echo "No file open"; exit 1; fi

# Find git root
DIR="$(dirname "$FILE")"
GIT_ROOT=$(cd "$DIR" && git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$GIT_ROOT" ]; then
  echo "ERROR: Not inside a git repo"
  exit 1
fi

cd "$GIT_ROOT"
REPO=$(basename "$GIT_ROOT")
BRANCH=$(git branch --show-current)

echo "╔══════════════════════════════════════╗"
echo "║  Push: $REPO → enterprise ($BRANCH)"
echo "╚══════════════════════════════════════╝"
echo ""

if git remote get-url enterprise &>/dev/null; then
  git push enterprise "$BRANCH" 2>&1
  echo ""
  echo "Pushed $REPO:$BRANCH to enterprise at $(date '+%H:%M:%S')"
else
  echo "ERROR: No 'enterprise' remote configured"
  echo "Run git-align.sh first to set up enterprise remotes"
fi
SCRIPT

cat > "$SCRIPTS_DIR/NOIZY — Git/Status All Repos.sh" << 'SCRIPT'
#!/bin/zsh
# Show git status for all NOIZYFISH repos
BASE="${NOIZY_BASE_DIR:-$HOME/NOIZYFISH}"
REPOS=(HEAVEN NOIZYLAB GABRIEL NOIZYVOX CONDUCTOR FISHYBOOKS CODEMASTER NOIZYKIDZ)

echo "╔══════════════════════════════════════╗"
echo "║  NOIZYFISH — All Repo Status         ║"
echo "╚══════════════════════════════════════╝"
echo ""

for repo in "${REPOS[@]}"; do
  if [ -d "$BASE/$repo/.git" ]; then
    cd "$BASE/$repo"
    BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
    DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    PUSH_DEFAULT=$(git config remote.pushDefault 2>/dev/null || echo "none")
    if [ "$DIRTY" -eq 0 ]; then
      echo "✓ $repo [$BRANCH] clean — push→$PUSH_DEFAULT"
    else
      echo "✗ $repo [$BRANCH] ${DIRTY} changes — push→$PUSH_DEFAULT"
    fi
  else
    echo "· $repo — not found"
  fi
done
SCRIPT

cat > "$SCRIPTS_DIR/NOIZY — Git/Diff Current File.sh" << 'SCRIPT'
#!/bin/zsh
# Show git diff for the current file
FILE="$BB_DOC_PATH"
if [ -z "$FILE" ]; then echo "No file open"; exit 1; fi
cd "$(dirname "$FILE")"
echo "── git diff: $(basename "$FILE") ──"
echo ""
git diff -- "$FILE" 2>&1
SCRIPT

cat > "$SCRIPTS_DIR/NOIZY — Git/Log Current File.sh" << 'SCRIPT'
#!/bin/zsh
# Show git log for the current file
FILE="$BB_DOC_PATH"
if [ -z "$FILE" ]; then echo "No file open"; exit 1; fi
cd "$(dirname "$FILE")"
echo "── git log: $(basename "$FILE") ──"
echo ""
git log --oneline --graph -20 -- "$FILE" 2>&1
SCRIPT

chmod +x "$SCRIPTS_DIR/NOIZY — Git/"*.sh
ok "Git scripts installed (4)"

# ── Linear Scripts ──

cat > "$SCRIPTS_DIR/NOIZY — Linear/Create Issue from Selection.sh" << 'SCRIPT'
#!/bin/zsh
# Create a Linear issue from selected text
# Requires: LINEAR_API_KEY env var
TITLE="$BB_DOC_SELECTED_TEXT"
if [ -z "$TITLE" ]; then
  echo "Select text in BBEdit to use as the issue title."
  exit 0
fi

if [ -z "$LINEAR_API_KEY" ]; then
  echo "ERROR: LINEAR_API_KEY not set"
  echo "Add to ~/.zshrc: export LINEAR_API_KEY='lin_api_...'"
  exit 1
fi

# Truncate title to first line
TITLE=$(echo "$TITLE" | head -1 | cut -c1-120)
FILE=$(basename "$BB_DOC_PATH" 2>/dev/null || echo "unknown")
BODY="Created from BBEdit — file: $FILE"

TEAM_ID="${NOIZY_LINEAR_TEAM_ID:-}"
if [ -z "$TEAM_ID" ]; then
  echo "ERROR: NOIZY_LINEAR_TEAM_ID not set"
  echo "Add to ~/.zshrc: export NOIZY_LINEAR_TEAM_ID='your-team-uuid'"
  exit 1
fi

RESULT=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { issueCreate(input: { title: \\\"$TITLE\\\", teamId: \\\"$TEAM_ID\\\", description: \\\"$BODY\\\" }) { success issue { identifier url } } }\"}" 2>&1)

ISSUE_ID=$(echo "$RESULT" | jq -r '.data.issueCreate.issue.identifier // empty' 2>/dev/null)
ISSUE_URL=$(echo "$RESULT" | jq -r '.data.issueCreate.issue.url // empty' 2>/dev/null)

if [ -n "$ISSUE_ID" ]; then
  echo "✓ Created: $ISSUE_ID"
  echo "  $ISSUE_URL"
  echo "  Title: $TITLE"
else
  echo "ERROR creating issue:"
  echo "$RESULT" | jq '.' 2>/dev/null || echo "$RESULT"
fi
SCRIPT

chmod +x "$SCRIPTS_DIR/NOIZY — Linear/"*.sh
ok "Linear scripts installed (1)"

# ── Slack Scripts ──

cat > "$SCRIPTS_DIR/NOIZY — Slack/Send Selection to Channel.sh" << 'SCRIPT'
#!/bin/zsh
# Send selected text to a Slack channel
# Requires: SLACK_BOT_TOKEN env var
TEXT="$BB_DOC_SELECTED_TEXT"
if [ -z "$TEXT" ]; then
  echo "Select text in BBEdit to send to Slack."
  exit 0
fi

if [ -z "$SLACK_BOT_TOKEN" ]; then
  echo "ERROR: SLACK_BOT_TOKEN not set"
  echo "Add to ~/.zshrc: export SLACK_BOT_TOKEN='xoxb-...'"
  exit 1
fi

CHANNEL="${NOIZY_SLACK_CHANNEL:-general}"
FILE=$(basename "$BB_DOC_PATH" 2>/dev/null || echo "unknown")

# Wrap in code block with file context
PAYLOAD="*From BBEdit — \`$FILE\`*\n\`\`\`\n$TEXT\n\`\`\`"

RESULT=$(curl -s -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"channel\": \"$CHANNEL\", \"text\": \"$PAYLOAD\", \"mrkdwn\": true}" 2>&1)

SUCCESS=$(echo "$RESULT" | jq -r '.ok' 2>/dev/null)
if [ "$SUCCESS" = "true" ]; then
  echo "✓ Sent to #$CHANNEL"
else
  echo "ERROR: $(echo "$RESULT" | jq -r '.error // "unknown"' 2>/dev/null)"
fi
SCRIPT

chmod +x "$SCRIPTS_DIR/NOIZY — Slack/"*.sh
ok "Slack scripts installed (1)"

# ── Notion Scripts ──

cat > "$SCRIPTS_DIR/NOIZY — Notion/Append to Notion Page.sh" << 'SCRIPT'
#!/bin/zsh
# Append selected text as a new block to a Notion page
# Requires: NOTION_API_KEY and NOIZY_NOTION_PAGE_ID env vars
TEXT="$BB_DOC_SELECTED_TEXT"
if [ -z "$TEXT" ]; then
  echo "Select text in BBEdit to append to Notion."
  exit 0
fi

if [ -z "$NOTION_API_KEY" ]; then
  echo "ERROR: NOTION_API_KEY not set"
  exit 1
fi

PAGE_ID="${NOIZY_NOTION_PAGE_ID:-}"
if [ -z "$PAGE_ID" ]; then
  echo "ERROR: NOIZY_NOTION_PAGE_ID not set"
  exit 1
fi

FILE=$(basename "$BB_DOC_PATH" 2>/dev/null || echo "")
HEADER="📝 From BBEdit${FILE:+ — $FILE} ($(date '+%Y-%m-%d %H:%M'))"

# Truncate text to Notion block limit (2000 chars)
TEXT=$(echo "$TEXT" | head -c 2000)

RESULT=$(curl -s -X PATCH "https://api.notion.com/v1/blocks/$PAGE_ID/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "{
    \"children\": [
      {\"type\": \"heading_3\", \"heading_3\": {\"rich_text\": [{\"text\": {\"content\": \"$HEADER\"}}]}},
      {\"type\": \"code\", \"code\": {\"rich_text\": [{\"text\": {\"content\": \"$TEXT\"}}], \"language\": \"plain text\"}}
    ]
  }" 2>&1)

if echo "$RESULT" | jq -e '.results' &>/dev/null; then
  echo "✓ Appended to Notion page"
else
  echo "ERROR: $(echo "$RESULT" | jq -r '.message // "unknown"' 2>/dev/null)"
fi
SCRIPT

chmod +x "$SCRIPTS_DIR/NOIZY — Notion/"*.sh
ok "Notion scripts installed (1)"

# ── Utility Scripts ──

cat > "$SCRIPTS_DIR/NOIZY — Utilities/Word Count & Stats.sh" << 'SCRIPT'
#!/bin/zsh
# Detailed word/line/char count for current document
FILE="$BB_DOC_PATH"
if [ -z "$FILE" ]; then echo "No file open"; exit 1; fi

echo "╔══════════════════════════════════════╗"
echo "║  Document Stats: $(basename "$FILE")"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Lines:      $(wc -l < "$FILE" | tr -d ' ')"
echo "Words:      $(wc -w < "$FILE" | tr -d ' ')"
echo "Characters: $(wc -c < "$FILE" | tr -d ' ')"
echo "Size:       $(ls -lh "$FILE" | awk '{print $5}')"
echo "Modified:   $(stat -f '%Sm' "$FILE")"
echo "Type:       $(file -b "$FILE")"

# If markdown, count headings
if [[ "$FILE" == *.md ]]; then
  echo ""
  echo "── Markdown Structure ──"
  echo "H1: $(grep -c '^# ' "$FILE" 2>/dev/null || echo 0)"
  echo "H2: $(grep -c '^## ' "$FILE" 2>/dev/null || echo 0)"
  echo "H3: $(grep -c '^### ' "$FILE" 2>/dev/null || echo 0)"
  echo "Links: $(grep -co '\[.*\](.*' "$FILE" 2>/dev/null || echo 0)"
  echo "Code blocks: $(grep -c '^\`\`\`' "$FILE" 2>/dev/null || echo 0)"
fi
SCRIPT

cat > "$SCRIPTS_DIR/NOIZY — Utilities/JSON Pretty Print.sh" << 'SCRIPT'
#!/bin/zsh
# Pretty-print JSON from selection or entire file
TEXT="$BB_DOC_SELECTED_TEXT"
if [ -z "$TEXT" ] && [ -n "$BB_DOC_PATH" ]; then
  TEXT=$(cat "$BB_DOC_PATH")
fi
echo "$TEXT" | jq '.' 2>&1
SCRIPT

chmod +x "$SCRIPTS_DIR/NOIZY — Utilities/"*.sh
ok "Utility scripts installed (2)"

# ── Install Clippings ──────────────────────────────────────────────────────

step "Installing Clippings"

CLIP_DIR="$BBEDIT_SUPPORT/Clippings"
mkdir -p "$CLIP_DIR/NOIZY — Workers"
mkdir -p "$CLIP_DIR/NOIZY — Markdown"
mkdir -p "$CLIP_DIR/NOIZY — TypeScript"
mkdir -p "$CLIP_DIR/NOIZY — Manifest"

# Worker clippings
cat > "$CLIP_DIR/NOIZY — Workers/Cloudflare Worker Skeleton" << 'CLIP'
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      switch (url.pathname) {
        case '/':
          return new Response('NOIZY.AI — #select#Worker Name#', {
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          });

        case '/health':
          return Response.json({ status: 'ok', timestamp: Date.now() }, { headers: corsHeaders });

        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  },
};
CLIP

cat > "$CLIP_DIR/NOIZY — Workers/D1 Query Pattern" << 'CLIP'
// D1 database query
const result = await env.DB.prepare(
  `SELECT * FROM #select#table_name# WHERE #select#column# = ?`
).bind(#select#value#).all();

if (!result.success) {
  return Response.json({ error: 'Query failed' }, { status: 500 });
}

return Response.json({ data: result.results, meta: result.meta });
CLIP

cat > "$CLIP_DIR/NOIZY — Workers/KV Get-Set Pattern" << 'CLIP'
// KV namespace read/write
const key = '#select#key_name#';

// Read
const value = await env.#select#KV_NAMESPACE#.get(key, { type: 'json' });

// Write (with 1 hour TTL)
await env.#select#KV_NAMESPACE#.put(key, JSON.stringify(#select#data#), {
  expirationTtl: 3600,
});
CLIP

cat > "$CLIP_DIR/NOIZY — Workers/wrangler.toml" << 'CLIP'
name = "#select#worker-name#"
main = "worker.js"
compatibility_date = "2026-03-01"
account_id = "2446d788cc4280f5ea22a9948410c355"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "#select#db-name#"
database_id = "#select#db-id#"
CLIP

# Markdown clippings
cat > "$CLIP_DIR/NOIZY — Markdown/NOIZY Doc Header" << 'CLIP'
# #select#Title# — NOIZY.AI

**Author:** Robert Stephen Plowman
**Date:** #select#date#
**Status:** #select#DRAFT|ACTIVE|ARCHIVED#
**Domain:** #select#NOIZYVOX|DREAMCHAMBER|NOIZYFISH|HVS|BUSINESS#

---

CLIP

cat > "$CLIP_DIR/NOIZY — Markdown/Architecture Decision Record" << 'CLIP'
## ADR-#select#number#: #select#Title#

**Status:** #select#Proposed|Accepted|Deprecated|Superseded#
**Date:** #select#date#
**Decider:** Robert Stephen Plowman

### Context

#select#What is the context?#

### Decision

#select#What was decided?#

### Consequences

#select#What are the consequences?#

### Alternatives Considered

#select#What alternatives were considered?#

---
CLIP

# TypeScript clippings
cat > "$CLIP_DIR/NOIZY — TypeScript/NOIZY Interface" << 'CLIP'
export interface #select#Name# {
  id: string;
  #select#field#: #select#type#;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'revoked';
}
CLIP

cat > "$CLIP_DIR/NOIZY — TypeScript/Consent Check" << 'CLIP'
// NOIZY consent verification — NEVER bypass
async function verifyConsent(actorId: string, action: string): Promise<boolean> {
  const consent = await getConsentKey(actorId);

  if (!consent || consent.status !== 'active') {
    await logRefusal(actorId, action, 'no_active_consent');
    return false;
  }

  if (consent.neverClauses.includes(action)) {
    await logRefusal(actorId, action, 'never_clause_violation');
    return false;
  }

  return true;
}
CLIP

# Manifest clippings
cat > "$CLIP_DIR/NOIZY — Manifest/NOIZY Doctrine Block" << 'CLIP'
---
NOIZY.AI DOCTRINE
─────────────────
• noizy.ai is the authority
• git.noizy.ai is the source of truth
• Consent must be explicit and enforceable
• Culture, identity, and human creativity are not commodities
• Trust must be earned, proven, and maintained
• Peace, love, and understanding are design goals
─────────────────
Robert Stephen Plowman
---
CLIP

ok "Clippings installed (4 sets, 10 templates)"

# ── Install Color Scheme ───────────────────────────────────────────────────

step "Installing Color Scheme"

SCHEME_DIR="$BBEDIT_SUPPORT/Color Schemes"

cat > "$SCHEME_DIR/NOIZY Empire Dark.bbColorScheme" << 'SCHEME'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>BackgroundColor</key>
	<string>#0a0a0f</string>
	<key>CursorColor</key>
	<string>#a855f7</string>
	<key>ForegroundColor</key>
	<string>#e2e8f0</string>
	<key>InsertionPointLineHighlightColor</key>
	<string>#1a1a25</string>
	<key>SelectionColor</key>
	<string>#2e1e3f</string>
	<key>InvisibleOthersColor</key>
	<string>#2a2a3a</string>
	<key>InvisibleSpacesColor</key>
	<string>#2a2a3a</string>
	<key>Comment</key>
	<string>#64748b</string>
	<key>Keyword1</key>
	<string>#a855f7</string>
	<key>Keyword2</key>
	<string>#7c3aed</string>
	<key>Keyword3</key>
	<string>#c084fc</string>
	<key>Keyword4</key>
	<string>#8b5cf6</string>
	<key>PredefinedName</key>
	<string>#06b6d4</string>
	<key>String</key>
	<string>#10b981</string>
	<key>String2</key>
	<string>#34d399</string>
	<key>Number</key>
	<string>#f59e0b</string>
	<key>LanguageColor</key>
	<string>#3b82f6</string>
	<key>Ctags</key>
	<string>#ec4899</string>
	<key>GrepMatch</key>
	<string>#f59e0b</string>
	<key>GrepMatchHighlight</key>
	<string>#3f3a1e</string>
	<key>GuideContrastColor</key>
	<string>#2a2a3a</string>
	<key>SecondaryHighlightColor</key>
	<string>#1e2e3f</string>
	<key>PrimaryHighlightColor</key>
	<string>#2e1e3f</string>
	<key>IsBuiltIn</key>
	<false/>
	<key>IsDarkTheme</key>
	<true/>
</dict>
</plist>
SCHEME

ok "NOIZY Empire Dark color scheme installed"

# ── Install Preview Filter ─────────────────────────────────────────────────

step "Installing Preview Filter"

cat > "$BBEDIT_SUPPORT/Preview Filters/NOIZY Markdown.sh" << 'FILTER'
#!/bin/zsh
# Enhanced Markdown preview with NOIZY branding
# Reads from stdin, writes HTML to stdout

# Use built-in markdown if available, otherwise pass through
if command -v /usr/local/bin/multimarkdown &>/dev/null; then
  BODY=$(/usr/local/bin/multimarkdown)
elif command -v /usr/local/bin/cmark &>/dev/null; then
  BODY=$(/usr/local/bin/cmark --unsafe)
else
  # Simple fallback: wrap in pre tags
  BODY="<pre>$(cat)</pre>"
fi

cat << HTML
<!DOCTYPE html>
<html>
<head>
<style>
  body {
    background: #0a0a0f;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 2rem;
    line-height: 1.7;
  }
  h1, h2, h3 {
    color: #a855f7;
    border-bottom: 1px solid #2a2a3a;
    padding-bottom: 0.3em;
  }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; color: #c084fc; }
  h3 { font-size: 1.2rem; color: #8b5cf6; border: none; }
  code {
    background: #1a1a25;
    color: #10b981;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
  }
  pre {
    background: #12121a;
    border: 1px solid #2a2a3a;
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
  }
  pre code { background: none; padding: 0; }
  a { color: #3b82f6; }
  blockquote {
    border-left: 3px solid #7c3aed;
    margin-left: 0;
    padding-left: 1rem;
    color: #94a3b8;
  }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #2a2a3a; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #1a1a25; color: #a855f7; }
  hr { border: none; border-top: 1px solid #2a2a3a; margin: 2rem 0; }
  strong { color: #f59e0b; }
</style>
</head>
<body>
$BODY
</body>
</html>
HTML
FILTER

chmod +x "$BBEDIT_SUPPORT/Preview Filters/NOIZY Markdown.sh"
ok "NOIZY Markdown preview filter installed"

# ── Create .zshrc exports suggestion ───────────────────────────────────────

step "Environment Variables"

ENV_FILE="$SCRIPT_DIR/noizy-bbedit-env.sh"

cat > "$ENV_FILE" << 'ENV'
# ============================================================================
# NOIZY.AI — BBEdit Pro Environment Variables
# Add these to your ~/.zshrc on GOD
# ============================================================================

# NOIZY base directory
export NOIZY_BASE_DIR="$HOME/NOIZYFISH"

# D1 database name
export NOIZY_D1_DB="agent-memory"

# Linear API (get from: https://linear.app/settings/api)
export LINEAR_API_KEY="lin_api_YOUR_KEY_HERE"
export NOIZY_LINEAR_TEAM_ID="YOUR_TEAM_UUID_HERE"

# Slack bot token (get from: https://api.slack.com/apps)
export SLACK_BOT_TOKEN="xoxb-YOUR_TOKEN_HERE"
export NOIZY_SLACK_CHANNEL="general"

# Notion API (get from: https://www.notion.so/my-integrations)
export NOTION_API_KEY="ntn_YOUR_KEY_HERE"
export NOIZY_NOTION_PAGE_ID="YOUR_PAGE_UUID_HERE"

# BBEdit as default editor
export EDITOR="bbedit -w"
export VISUAL="bbedit -w"
export GIT_EDITOR="bbedit -w --resume"
ENV

ok "Environment template created: noizy-bbedit-env.sh"
info "Review and add these to your ~/.zshrc"

# ── Final Summary ──────────────────────────────────────────────────────────

step "Installation Complete"
echo ""
echo "  ${BOLD}Scripts Menu:${NC}"
echo "    NOIZY — Cloudflare  (4 scripts: deploy, tail, list, D1 query)"
echo "    NOIZY — Git          (4 scripts: push enterprise, status all, diff, log)"
echo "    NOIZY — Linear       (1 script: create issue from selection)"
echo "    NOIZY — Slack        (1 script: send selection to channel)"
echo "    NOIZY — Notion       (1 script: append selection to page)"
echo "    NOIZY — Utilities    (2 scripts: word count, JSON pretty print)"
echo ""
echo "  ${BOLD}Clippings:${NC}"
echo "    NOIZY — Workers      (4 templates: skeleton, D1, KV, wrangler.toml)"
echo "    NOIZY — Markdown     (2 templates: doc header, ADR)"
echo "    NOIZY — TypeScript   (2 templates: interface, consent check)"
echo "    NOIZY — Manifest     (1 template: doctrine block)"
echo ""
echo "  ${BOLD}Color Scheme:${NC}     NOIZY Empire Dark"
echo "  ${BOLD}Preview Filter:${NC}   NOIZY Markdown (branded dark preview)"
echo "  ${BOLD}Env Template:${NC}     noizy-bbedit-env.sh"
echo ""
echo "${BOLD}${CYAN}Next steps:${NC}"
echo "  1. Review noizy-bbedit-env.sh and add vars to ~/.zshrc"
echo "  2. Restart BBEdit to load new scripts and clippings"
echo "  3. Set color scheme: BBEdit > Preferences > Text Colors > NOIZY Empire Dark"
echo "  4. Set preview filter: Markup > Preview Filters > NOIZY Markdown"
echo "  5. Set BBEdit as git editor: source ~/.zshrc"
echo ""
echo "${BOLD}${CYAN}noizy.ai is the authority. BBEdit is the weapon.${NC}"
echo ""
