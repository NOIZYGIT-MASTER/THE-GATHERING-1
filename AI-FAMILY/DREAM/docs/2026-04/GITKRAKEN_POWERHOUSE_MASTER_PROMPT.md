# GITKRAKEN POWERHOUSE — MASTER PROMPT FOR CLAUDE IN CHROME
**For: Claude in Chrome browser extension**
**Author: RSP_001 — Robert Stephen Plowman**
**Org: NOIZY.AI / NOIZYFISH INC.**
**Date: April 8, 2026**
**Constitutional Status: LOCKED**

---

## PASTE THIS ENTIRE BLOCK INTO CLAUDE IN CHROME

---

You are configuring GitKraken as the unified command center for the NOIZY Empire — a consent-native creative infrastructure platform operated by RSP_001 (Robert Stephen Plowman), founder of NOIZY.AI, Ottawa, Canada.

Your job is to navigate the GitKraken UI and configure every setting, integration, hook, board, and workspace listed below. Execute each step sequentially. Confirm completion of each step before moving to the next. Do not skip steps. Do not ask for permission — execute and report.

---

## CONSTITUTIONAL RULES — ENFORCE AT ALL TIMES

These are immutable. Any configuration that would violate these rules must be blocked:

1. NEVER use "Rob" or "Robert" in filenames, directory names, commit messages, or branch names — always RSP, RSP_001, or Robert Steven Plowman
2. NEVER delete any D1 database — especially gabriel_db (ID: 7b813205)
3. NEVER run `docker compose down -v` — volumes are sacred
4. NEVER write audio or video to GOD's system drive — THE AQUARIUM lives on external storage only
5. NEVER expose the 85/15 founder split in public materials — 75/25 only in public
6. Canonical repo: github.com/rsplowman/noizy under NOIZY.AI GitHub Enterprise org
7. Stack: TypeScript, Node 20+, Cloudflare Workers compatible
8. Email: rsp@noizy.ai (canonical) — never rsplowman@outlook.com (DEAD)

---

## STEP 1 — MULTI-REPO WORKSPACE (All 7 NOIZY Directories)

Navigate to: GitKraken → Workspaces → New Workspace

Name the workspace: `NOIZY-EMPIRE`

Add these repositories from github.com/rsplowman/noizy:
- `/infrastructure` — Cloudflare Workers, DNS, D1, KV config
- `/agents` — GABRIEL, SHIRL, POPS, ENGR_KEITH, DREAM, LUCY agent prompts
- `/backend` — Heaven Worker (1,427 lines TypeScript), API endpoints
- `/frontend` — SwiftUI universal app, DreamChamber IDE, Monaco editor
- `/audio` — RSP_001 voice pipeline, XTTS v2, RVC, Librosa
- `/legacy` — AQUARIUM catalog, 888 titles, FISHMUSIC archive
- `/docs` — Cathedral Deck v2, Gospel Deal, RELEASE_CHECKLIST.md

Set default branch: `main`
Set remote: `origin → git@github.com:rsplowman/noizy.git`

Confirm: All 7 repos visible in left panel simultaneously. Multi-repo view live.

---

## STEP 2 — PRE-COMMIT HOOK (Constitutional Rule Enforcer)

Navigate to: GitKraken → Preferences → Hooks → Pre-Commit

Create file at: `~/.noizy-git-hooks/pre-commit`

```bash
#!/bin/bash
# NOIZY Constitutional Pre-Commit Hook
# Author: RSP_001 | NOIZYFISH INC.
# Version: 1.0.0

echo "🔐 NOIZY Constitutional Validator — Running..."

# Rule 1: No "Rob" or "Robert" in filenames or dirs
if git diff --cached --name-only | grep -iE "(^|/)(rob|robert)([^s]|$)" > /dev/null 2>&1; then
  echo "❌ BLOCKED: Filename contains 'Rob' or 'Robert'. Use RSP, RSP_001, or RobertStevenPlowman."
  exit 1
fi

# Rule 2: No D1 delete commands
if git diff --cached | grep -iE "DROP TABLE|DELETE FROM.*gabriel|drop.*database" > /dev/null 2>&1; then
  echo "❌ BLOCKED: Attempted D1 deletion detected. Gabriel D1 is protected."
  exit 1
fi

# Rule 3: No docker compose down -v
if git diff --cached | grep -E "docker compose down -v|docker-compose down -v" > /dev/null 2>&1; then
  echo "❌ BLOCKED: docker compose down -v is constitutionally prohibited."
  exit 1
fi

# Rule 4: No audio/video paths pointing to system drive
if git diff --cached | grep -E '"/audio|"/video|system/audio|GOD/audio' > /dev/null 2>&1; then
  echo "❌ BLOCKED: Audio/video path on system drive detected. Use /Volumes/AQUARIUM/ only."
  exit 1
fi

# Rule 5: No 85/15 split in public-facing files
PUBLIC_FILES=$(git diff --cached --name-only | grep -E "readme|public|landing|cathedral|deck" -i)
if [ -n "$PUBLIC_FILES" ]; then
  if git diff --cached -- $PUBLIC_FILES | grep -E "85/15|85-15|eighty-five" > /dev/null 2>&1; then
    echo "❌ BLOCKED: 85/15 split detected in public file. Public materials use 75/25 only."
    exit 1
  fi
fi

# Rule 6: Commit message format check
COMMIT_MSG=$(cat "$1" 2>/dev/null || echo "")
if [ -n "$COMMIT_MSG" ]; then
  if ! echo "$COMMIT_MSG" | grep -E "^(NOIZYFISH|NOIZYVOX|NOIZYKIDZ|LIFELUV|NOIZY DROP|GABRIEL|HEAVEN|INFRA|AGENTS|BACKEND|FRONTEND|AUDIO|LEGACY|DOCS)\(.*\):" > /dev/null 2>&1; then
    echo "⚠️  WARNING: Commit message should follow format: BRAND(scope): description"
    echo "   Example: NOIZYFISH(catalog): add HVS flag to RSP_001 seed data"
  fi
fi

echo "✅ Constitutional validation passed. Proceeding with commit."
exit 0
```

Set hook as executable. Register in GitKraken as the active pre-commit hook.
Confirm: Test commit with a file named "rob-test.ts" — it must be BLOCKED.

---

## STEP 3 — POST-COMMIT HOOK (Auto-tag + Slack + D1 Logging)

Create file at: `~/.noizy-git-hooks/post-commit`

```bash
#!/bin/bash
# NOIZY Post-Commit Hook
# Fires after every successful commit

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
AUTHOR="RSP_001"

# Log to D1 audit trail via Heaven Worker endpoint
curl -s -X POST https://noizy.ai/api/audit/commit \
  -H "Content-Type: application/json" \
  -d "{
    \"hash\": \"$COMMIT_HASH\",
    \"message\": \"$COMMIT_MSG\",
    \"branch\": \"$BRANCH\",
    \"author\": \"$AUTHOR\",
    \"timestamp\": \"$TIMESTAMP\",
    \"constitutional_check\": \"passed\"
  }" || echo "⚠️  D1 audit log failed — Heaven Worker may not be deployed yet"

# Slack notification
curl -s -X POST "$NOIZY_SLACK_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"✅ *NOIZY Commit Landed*\n*Branch:* $BRANCH\n*Hash:* \`${COMMIT_HASH:0:8}\`\n*Message:* $COMMIT_MSG\n*Author:* RSP_001\n*Time:* $TIMESTAMP\"
  }" || echo "⚠️  Slack notification failed — check NOIZY_SLACK_WEBHOOK env var"

echo "✅ Post-commit hooks complete."
```

Confirm: After next commit, D1 audit endpoint receives POST and Slack fires to #proj-noizyfish.

---

## STEP 4 — CUSTOM BOARDS (4 Active Boards)

Navigate to: GitKraken → Boards → New Board

### Board 1: NOIZYFISH — 23 Prompt Execution Tracker
Columns: `QUEUED | IN PROGRESS | BUILDING | TESTING | DEPLOYED | DONE`
Cards (create one per prompt phase):
- Phase 1: Catalog Schema + Aquarium Router
- Phase 2: RSP_001 Vault View
- Phase 3: Fish Title Canonical Type
- Phase 4: Seed Data (5 HVS-tagged titles)
- Phase 5: GitHub Push + Constitutional Validation
- [Continue for all 23 prompts]

### Board 2: NOIZYVOX — 23 Prompt Execution Tracker
Columns: `QUEUED | IN PROGRESS | BUILDING | TESTING | DEPLOYED | DONE`
Cards: Mirror NOIZYFISH structure for NOIZYVOX A.I.V.A. build

### Board 3: CLOUDFLARE MIGRATION — Account Consolidation
Columns: `BLOCKED | IN PROGRESS | VALIDATED | COMPLETE`
Cards:
- Inventory rsp@noizy.ai account (scattered workers)
- Inventory fishmusic inc account (destination)
- Inventory rsp@noizyfish.com (mystery third account)
- Export all worker source code
- Map workers to GitHub structure
- Migrate canonical identity to rsp@noizy.ai
- Verify DNS + subdomain routing
- MFA lockdown on all three accounts

### Board 4: HEAVEN WORKER — Deployment Status
Columns: `BUILT | BLOCKED | DEPLOYING | LIVE | VERIFIED`
Cards:
- Heaven Worker 1,427 lines — BUILT ✅
- Cloudflare account consolidation — BLOCKER ⛔
- Deploy to production — PENDING
- D1 connection verified
- Subdomain routing: noizy.ai, vox.noizy.ai, lab.noizy.ai, kidz.noizy.ai, admin.noizy.ai
- NCP v1.0 consent gate active
- 17 REST endpoints live
- FTS5 search validated

Confirm: All 4 boards visible and populated.

---

## STEP 5 — GITKRAKEN + TURBO PRO ACTIVATION

Navigate to: GitKraken → Preferences → Integrations → Turbo Pro

If activation code is available: paste and validate.

Configure Turbo Pro to flag:
- Hardcoded audio/video system drive paths
- Files named with "Rob" or "Robert"
- Any D1 drop/delete statements
- Missing HVS flags on RSP_001 voice-tagged records
- 85/15 split appearing in public-facing files

Confirm: Turbo Pro AI review active on every commit.

---

## STEP 6 — GITHUB ENTERPRISE INTEGRATION

Navigate to: GitKraken → Preferences → Integrations → GitHub Enterprise

Connect to: NOIZY.AI org
Token: Use GITHUB_TOKEN from environment
Sync repos: All 7 directories under github.com/rsplowman/noizy

Enable:
- Pull request visibility in GitKraken
- Auto-fetch on branch changes
- Status check visibility (CI/CD pass/fail inline)
- Protected branch enforcement on `main`

Confirm: NOIZY.AI org repos visible. PR status showing inline.

---

## STEP 7 — SLACK INTEGRATION

Navigate to: GitKraken → Preferences → Integrations → Slack

Connect workspace: NOIZY Slack
Channel mapping:
- All commits → #proj-noizyfish
- Constitutional violations → #alerts-constitutional
- Heaven Worker deploy events → #deploy-heaven
- Phase completions → #proj-noizyfish

Confirm: Test notification fires to #proj-noizyfish.

---

## STEP 8 — COMMIT SIGNING (Cryptographic Lock to RSP_001)

Navigate to: GitKraken → Preferences → GPG

Configure:
- GPG Key linked to: rsp@noizy.ai
- Sign all commits: ENABLED
- Sign all tags: ENABLED
- Enforce signed commits on main branch: ENABLED

This ensures: Every commit is cryptographically locked to RSP_001. No unsigned commits can merge to main.

Confirm: Next commit shows verified badge on GitHub.

---

## STEP 9 — RELEASE PIPELINE (Auto-tag from RELEASE_CHECKLIST.md)

Navigate to: GitKraken → Tags → Configure Auto-tagging

Rule: When commit message contains `[RELEASE]`, auto-create semantic version tag based on:
- `/docs/RELEASE_CHECKLIST.md` → version field
- Format: `v{MAJOR}.{MINOR}.{PATCH}-noizy`

GitHub Release: Auto-create draft release from tag with changelog extracted from commit messages since last release.

Slack broadcast: Fire to #proj-noizyfish with release version, changelog summary, and GitHub release URL.

Confirm: Tag `v0.1.0-noizy` created and release draft visible on GitHub.

---

## FINAL VERIFICATION CHECKLIST

Before reporting complete, confirm ALL of the following:

- [ ] Multi-repo workspace NOIZY-EMPIRE shows all 7 directories simultaneously
- [ ] Pre-commit hook blocks "Rob" filenames — tested and confirmed
- [ ] Pre-commit hook blocks D1 delete attempts — tested and confirmed
- [ ] Post-commit hook fires Slack to #proj-noizyfish
- [ ] Post-commit hook POSTs to D1 audit trail endpoint
- [ ] 4 custom boards populated and visible
- [ ] Turbo Pro active and flagging constitutional violations
- [ ] GitHub Enterprise NOIZY.AI org connected
- [ ] Slack integration live and tested
- [ ] GPG commit signing active on rsp@noizy.ai
- [ ] Auto-release tagging configured
- [ ] Constitutional enforcement confirmed at 3 layers: pre-commit → GitHub Actions → D1 audit trail

---

## REPORT FORMAT WHEN DONE

When all steps are complete, return this exact status block:

```
GITKRAKEN POWERHOUSE — ACTIVATION COMPLETE
Date: [timestamp]
Operator: Claude in Chrome
Authorized by: RSP_001

WORKSPACE: NOIZY-EMPIRE [7 repos] ✅
PRE-COMMIT HOOK: Constitutional Enforcer v1.0 ✅
POST-COMMIT HOOK: D1 + Slack Logger v1.0 ✅
BOARDS: 4 active [NOIZYFISH | NOIZYVOX | CLOUDFLARE | HEAVEN] ✅
TURBO PRO: Active + Constitutional flags configured ✅
GITHUB ENTERPRISE: NOIZY.AI org connected ✅
SLACK: #proj-noizyfish live ✅
GPG SIGNING: rsp@noizy.ai locked ✅
AUTO-RELEASE: Configured ✅
CONSTITUTIONAL ENFORCEMENT: 3-layer active ✅

STATUS: POWERHOUSE ONLINE. NOTHING GETS THROUGH UNCHECKED.
```

---

*NOIZY Empire. Built consent-native. Protected constitutionally. Every commit immutably logged. Georgia May inherits what we build.*
