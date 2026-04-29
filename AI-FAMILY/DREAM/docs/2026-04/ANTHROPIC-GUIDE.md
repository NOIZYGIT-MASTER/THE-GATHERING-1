# ANTHROPIC COMPLETE GUIDE
## Everything from Anthropic for MC96ECO Universe

Last updated: 2026-04-06

---

## YOUR ANTHROPIC STACK

### 1. Claude Max Subscription
- **Status**: ACTIVE
- **Features**: Extended context, priority access, unlimited usage
- **Access**: Via Claude Code CLI (`claude`) or claude.ai

### 2. Claude Code CLI (v2.1.92)
- **Location**: `~/.npm-global/bin/claude`
- **Usage**: `claude` (interactive) or `claude -p "prompt"` (one-shot)
- **Config**: `~/.claude/settings.json`

### 3. Anthropic Python SDK (v0.75.0)
- **Install**: `pip3 install anthropic`
- **Import**: `from anthropic import Anthropic`

### 4. Anthropic TypeScript SDK
- **Install**: `npm install @anthropic-ai/sdk`
- **Import**: `import Anthropic from '@anthropic-ai/sdk'`

---

## CLAUDE MODEL LINEUP

| Model | ID | Best For |
|-------|-----|----------|
| **Opus 4.5** | `claude-opus-4-5-20251101` | Complex reasoning, deep analysis, creative work |
| **Sonnet 4.5** | `claude-sonnet-4-5-20250929` | Balanced performance, coding, general tasks |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Fast responses, simple tasks, cost-efficient |
| Sonnet 3.5 | `claude-3-5-sonnet-20241022` | Legacy, still excellent |
| Haiku 3.5 | `claude-3-5-haiku-20241022` | Legacy, very fast |

---

## QUICK START COMMANDS

```bash
# Interactive Claude Code session
claude

# One-shot query
claude -p "explain quantum computing"

# Continue previous conversation
claude --continue

# Use specific model in Claude Code
# (Claude Code auto-selects but you can configure in settings)

# Local hybrid routing (Claude + Local AI)
claude-hybrid "your prompt"
claude-hybrid -c "force Claude Max"
claude-hybrid -l "force Local AI"

# Python SDK (requires API key)
python3 ~/MC96ECO/NOIZY.AI/anthropic-tools/claude-api.py "prompt"

# Vision analysis
python3 ~/MC96ECO/NOIZY.AI/anthropic-tools/claude-vision.py image.png "describe this"
```

---

## ANTHROPIC TOOLS CREATED

### Location: `~/MC96ECO/NOIZY.AI/anthropic-tools/`

| Tool | Description |
|------|-------------|
| `claude-api.py` | Direct Claude API access with streaming |
| `claude-batch.py` | Batch processing for bulk prompts |
| `claude-vision.py` | Image analysis and comparison |
| `claude-tools.py` | Tool use / function calling examples |
| `mcp-claude-server.py` | MCP server for NOIZY.AI tools |

### Location: `~/bin/`

| Tool | Description |
|------|-------------|
| `claude-hybrid` | Smart router: Claude Max + Local AI |
| `ask` | Quick hybrid query tool |
| `ai` | Local AI CLI |
| `noizy-ai` | NOIZY custom model router |

---

## API KEY SETUP (Optional)

Claude Max users don't need an API key for Claude Code (uses OAuth).
But for building applications with the SDK:

```bash
# 1. Get API key from console.anthropic.com

# 2. Add to environment
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
source ~/.zshrc

# 3. Test
python3 -c "from anthropic import Anthropic; print(Anthropic().messages.create(model='claude-sonnet-4-5-20250929', max_tokens=100, messages=[{'role':'user','content':'Hi'}]).content[0].text)"
```

---

## CLAUDE CODE FEATURES

### Context Window
- **200K tokens** - can process entire codebases
- Auto-compresses long conversations

### Tools Available
- File reading/writing/editing
- Bash command execution
- Web search and fetch
- Glob and Grep for codebase search
- Task management
- MCP integrations (Cloudflare, Linear, Notion, etc.)

### Keyboard Shortcuts
- `Tab` - Accept suggestion
- `Esc` - Cancel/interrupt
- `Ctrl+C` - Stop current operation
- `Ctrl+L` - Clear screen
- `/help` - Show commands

### Slash Commands
- `/commit` - Create git commit
- `/pr` - Create pull request
- `/review` - Code review
- `/help` - Get help

---

## MCP (Model Context Protocol)

### Available Remote MCPs (via claude.ai)
- **Cloudflare** - Workers, D1, KV, R2
- **Linear** - Issues, projects, documentation
- **Notion** - Pages, databases, search
- **Slack** - Messages, channels, search
- **Gmail** - Read emails, drafts
- **Google Calendar** - Events, scheduling
- **Figma** - Design access
- **GitHub** (via `gh` CLI)

### NOIZY Custom MCP Server
```bash
# Start the NOIZY MCP server
python3 ~/MC96ECO/NOIZY.AI/anthropic-tools/mcp-claude-server.py
```

Exposes:
- `noizy_consent_check` - Verify consent status
- `noizy_voice_verify` - Voice DNA verification
- `noizy_royalty_calc` - 75/25 split calculation
- `fish_catalog_search` - Music catalog search
- `dreamchamber_codex` - 500-Year Codex queries

---

## HYBRID AI STRATEGY

```
┌─────────────────────────────────────────────────┐
│              NOIZY AI ROUTING                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐       ┌─────────────────────┐ │
│  │   Claude    │       │     Local AI         │ │
│  │    Max      │       │    (Ollama)          │ │
│  │             │       │                      │ │
│  │ • Complex   │       │ • Private data       │ │
│  │ • Long ctx  │       │ • Offline            │ │
│  │ • Current   │       │ • Bulk process       │ │
│  │ • Review    │       │ • Simple tasks       │ │
│  │ • Coding    │       │ • Fast iterations    │ │
│  └──────┬──────┘       └──────────┬───────────┘ │
│         │                         │             │
│         └──────────┬──────────────┘             │
│                    │                            │
│            ┌───────▼───────┐                    │
│            │ claude-hybrid │                    │
│            │   ~/bin/      │                    │
│            └───────────────┘                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## BEST PRACTICES

### 1. Use Claude Code for Development
```bash
# Start in your project directory
cd ~/MC96ECO/NOIZY.AI
claude

# Claude has full codebase context
```

### 2. Use Local AI for Privacy
```bash
# Process sensitive data locally
claude-hybrid -l "analyze private: $(cat ~/secret.txt)"
```

### 3. Use Batch for Bulk Processing
```bash
# Create prompts file
echo '["prompt 1", "prompt 2", "prompt 3"]' > prompts.json

# Process with batch API (requires API key)
python3 ~/MC96ECO/NOIZY.AI/anthropic-tools/claude-batch.py create prompts.json
```

### 4. Use Vision for Image Analysis
```bash
python3 ~/MC96ECO/NOIZY.AI/anthropic-tools/claude-vision.py \
  screenshot.png \
  "Extract all text and describe the UI"
```

---

## RESOURCE LINKS

- **Claude Code Docs**: https://docs.anthropic.com/claude-code
- **API Reference**: https://docs.anthropic.com/en/api
- **SDK Python**: https://github.com/anthropics/anthropic-sdk-python
- **SDK TypeScript**: https://github.com/anthropics/anthropic-sdk-typescript
- **MCP Protocol**: https://github.com/anthropics/mcp
- **Console**: https://console.anthropic.com

---

## YOUR CURRENT SETUP SUMMARY

```
✅ Claude Max Subscription - ACTIVE
✅ Claude Code CLI v2.1.92 - INSTALLED
✅ Python SDK v0.75.0 - INSTALLED
✅ TypeScript SDK - INSTALLED
✅ MCP Integrations - CONFIGURED
✅ Hybrid AI Router - CREATED
✅ NOIZY Tools - CREATED
⚠️  API Key - NOT SET (optional for Claude Max users)
```

---

*NOIZY.AI - Where Consent Meets Intelligence*
*MC96ECO Universe - Powered by Anthropic*
