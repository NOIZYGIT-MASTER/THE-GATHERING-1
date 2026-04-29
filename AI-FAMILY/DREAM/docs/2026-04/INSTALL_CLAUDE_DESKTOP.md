# NOIZY MCP — Claude Desktop install

Three steps. Five minutes.

---

## 1. Create a Cloudflare API token

1. Open [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens).
2. Click **Create Token**.
3. Pick the **Custom token** template (more scoped than "Edit D1").
4. Permissions:
    - **Account** → **D1** → **Edit**
5. Account Resources: **Include → Fishmusicinc**.
6. Name: `noizy-mcp-local` (so you can audit / revoke by name later).
7. TTL: leave open, or set a year out.
8. Click **Continue to summary** → **Create Token**.
9. **Copy the token immediately** — Cloudflare shows it once.

---

## 2. Install the server

From the folder containing `package.json`:

```bash
cd /path/to/noizy-mcp
npm install
```

Verify:

```bash
node --check src/index.js && echo OK
```

Then resolve the absolute path — you'll paste it in the Claude Desktop config:

```bash
pwd
# e.g. /Users/m2ultra/Desktop/CLAUDE TODAY/10_INFRASTRUCTURE/noizy-mcp
```

---

## 3. Add to Claude Desktop config

Claude Desktop reads MCP servers from `claude_desktop_config.json`. Platform paths:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Open (or create) that file and add the `noizy` entry inside `mcpServers`:

```json
{
  "mcpServers": {
    "noizy": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/noizy-mcp/src/index.js"
      ],
      "env": {
        "CLOUDFLARE_ACCOUNT_ID": "2446d788cc4280f5ea22a9948410c355",
        "CLOUDFLARE_API_TOKEN": "PASTE_YOUR_TOKEN_HERE",
        "CLOUDFLARE_D1_DATABASE_ID": "b5b58cc9-1f37-4000-adc5-12f9e419662f"
      }
    }
  }
}
```

If `mcpServers` already exists with other entries, just add `noizy` as another key alongside them. Don't overwrite.

**Quit Claude Desktop fully and relaunch.** (Menu bar → Claude → Quit Claude, not just close window.)

---

## 4. Verify

In a new Claude Desktop conversation, ask:

> "What tools do you have from the noizy MCP?"

You should see all 12 `noizy_*` tools. Then:

> "Use noizy_empire_status."

You should see a JSON response with your real counts — roughly 9 brands, 8 agents, 12 principles, 24 doctrine lines, 25 memcells.

> "Show me Gospel principle 5."

Returns *Infrastructure IS Policy*.

If any of those fail, the most common causes:

| Symptom | Likely cause | Fix |
|---|---|---|
| No `noizy_*` tools appear | Path wrong, or JSON malformed | Check absolute path; lint JSON |
| "Cloudflare D1 HTTP 401" | Token wrong or missing scope | Recreate with D1:Edit on Fishmusicinc |
| "Cloudflare D1 HTTP 404" | Database UUID wrong | Confirm it's `b5b58cc9-1f37-4000-adc5-12f9e419662f` |
| Tools appear but hang forever | Node version too old | Upgrade to Node 20+ |

---

## 5. Security — what to do after install

1. **Revoke the token when you stop using it** on this machine. Cloudflare Dashboard → My Profile → API Tokens → pick → Delete.
2. **Never commit** the `claude_desktop_config.json` content with the real token to any repo. The `.gitignore` in this project already excludes `.env`; the Claude Desktop config is outside the project so it's your job to treat it like a credential.
3. If you ever paste the config into a doc/slack/anywhere public, **rotate the token first**.

---

## Uninstall

1. Remove the `noizy` entry from `claude_desktop_config.json`.
2. Restart Claude Desktop.
3. Optionally revoke the token in Cloudflare.

No data in the agent-memory D1 is touched by uninstall. The server is purely a proxy.
