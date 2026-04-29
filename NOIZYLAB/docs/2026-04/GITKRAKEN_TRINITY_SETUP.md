# GitKraken + Claude + Copilot Pro+ — The Trinity

**GitKraken is the boss. Claude is the brain. Copilot is the hands.**

---

## The Stack

| Tool | Role | Where |
|---|---|---|
| **GitKraken Desktop** | Git visual boss — branches, PRs, conflicts, graph | `/Applications/GitKraken.app` |
| **GitKraken CLI (gk)** | Terminal git ops — workspaces, focus, cloud patches | `/opt/homebrew/bin/gk` |
| **Claude Code** | AI reasoning, architecture, deployment | VS Code extension + CLI |
| **Copilot Pro+** | Code completion, chat, inline suggestions | VS Code extension |
| **GitLens** | Git blame, history, AI commit messages | VS Code extension |

---

## Step 1: Sign into GitKraken

```bash
# Open GitKraken
open /Applications/GitKraken.app
# Sign in with GitHub account
# Connect to NOIZY-AI org
```

## Step 2: Open NOIZYLAB in GitKraken

```bash
# From terminal
open -a GitKraken ~/NOIZYLAB
```

Or: GitKraken → File → Open Repo → `~/NOIZYLAB`

## Step 3: GitKraken CLI Auth

```bash
/opt/homebrew/bin/gk auth login
# Follow browser flow
# Then:
/opt/homebrew/bin/gk workspace list
```

## Step 4: Connect Linear Integration

GitKraken → Preferences → Integrations → Linear
- Authorize with your Linear account
- Issues from NOIZYLAB team will appear in GitKraken sidebar

## Step 5: The Daily Workflow

```
Morning:
1. Open GitKraken → see the graph, PRs, branches
2. Check Linear issues in sidebar → pick today's work
3. Create branch from Linear issue (right-click → Create Branch)
4. Open VS Code from GitKraken (right-click repo → Open in VS Code)

Building:
5. Claude Code handles architecture + complex builds
6. Copilot Pro+ handles inline completions + chat
7. GitLens shows git blame + AI commit messages

Shipping:
8. Stage changes in GitKraken (visual diff)
9. Commit with AI-assisted message (GitLens + Copilot)
10. Push + create PR in GitKraken
11. CI runs (preflight gates, 73 tests)
12. Merge in GitKraken when green
```

## Step 6: GitKraken Cloud Patches (collaboration)

```bash
# Share code changes before pushing
/opt/homebrew/bin/gk patch create --message "consent-gateway fix"
# Share the link with collaborators
# They can review without cloning
```

## VS Code Extensions (all installed)

- `anthropic.claude-code` — Claude Code
- `github.copilot-chat` — Copilot Pro+ Chat
- `eamodio.gitlens` — GitLens (AI: claude-sonnet-4-6)
- `github.remotehub` — GitHub Remote
- Plus 8 Claude community extensions

---

## Key Bindings

| Action | Shortcut |
|---|---|
| Copilot inline suggestion | `Tab` to accept |
| Copilot chat | `Cmd+I` |
| Claude Code panel | `Cmd+Shift+P` → Claude |
| GitLens blame | hover any line |
| GitKraken graph | `Cmd+Shift+G` in GitKraken |

---

*GitKraken sees the forest. Claude designs the trees. Copilot writes the leaves. GORUNFREE.*
