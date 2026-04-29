# 🧠 M2 Ultra AI Cheatsheet — NO PAYWALL

## Quick Commands

```bash
# General AI
ai "your question"              # Uses Qwen 72B (best general)
ai -c "code question"           # Uses DeepSeek V2 (best coder)
ai -r "reasoning question"      # Uses Llama 3.3 70B

# NOIZY Family Router (auto-selects best model)
noizy-ai "your question"        # Smart routing

# Hybrid (Claude Max + Local)
ask "question"                  # Prefers local (free)
ask -c "question"               # Force Claude Max
ask -code "question"            # Force local coder
```

## Web Interfaces

| Service | URL | Purpose |
|---------|-----|---------|
| Open WebUI | http://localhost:3080 | ChatGPT-like interface |
| Qdrant | http://localhost:6333/dashboard | Vector search |
| Grafana | http://localhost:3000 | Monitoring |
| n8n | http://localhost:5678 | Automation |

## Model Lineup (192GB RAM)

### Powerhouse Models
| Model | Size | Best For |
|-------|------|----------|
| qwen2.5:72b | 47GB | General (rivals GPT-4) |
| llama3.3:70b | 43GB | Reasoning |
| deepseek-coder-v2 | 8.9GB | Coding (rivals Claude) |
| mixtral:8x22b | 79GB | Complex tasks |
| llava:34b | 20GB | Vision/Images |

### NOIZY Custom Models
| Model | Purpose |
|-------|---------|
| noizy-consent-guardian | Consent & licensing |
| noizy-gabriel-mind | Execution & building |
| noizy-dream-weaver | Creative & vision |
| noizy-vox-architect | Voice & audio |
| noizy-wisdom-scribe | Philosophy & wisdom |
| noizy-mission-control | Strategy & planning |
| noizy-family-keeper | Safety & protection |
| noizy-fish-cataloguer | Music & catalog |
| noizy-kidz-worldbuilder | Education & kids |

## API Access

```bash
# Direct Ollama API
curl http://localhost:11434/api/generate \
  -d '{"model": "qwen2.5:72b", "prompt": "Hello"}'

# List models
curl http://localhost:11434/api/tags

# Model info
curl http://localhost:11434/api/show -d '{"name": "qwen2.5:72b"}'
```

## Memory Usage (192GB Available)

- Keep up to 4 large models loaded simultaneously
- Example combo: qwen2.5:72b + llama3.3:70b + deepseek-coder-v2 + llava:34b
- ~140GB models + ~50GB system = perfect fit

## When to Use What

| Task | Use This |
|------|----------|
| General questions | Local (qwen2.5:72b) |
| Coding | Local (deepseek-coder-v2) |
| Complex reasoning | Claude Max or llama3.3:70b |
| Image analysis | Local (llava:34b) |
| Bulk processing | Local (save Claude quota) |
| Nuanced analysis | Claude Max |
| Consent/licensing | noizy-consent-guardian |
| Creative writing | noizy-dream-weaver |

## Cost Comparison

| Usage | Claude Max | Local |
|-------|------------|-------|
| 1000 queries/day | Uses quota | FREE |
| Bulk processing | Expensive | FREE |
| Offline | Not available | WORKS |
| Privacy | Cloud | 100% LOCAL |

**Strategy: Use local for 90% of tasks, Claude Max for complex 10%**
