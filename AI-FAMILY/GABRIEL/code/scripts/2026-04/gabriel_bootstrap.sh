#!/bin/bash
set -e
echo "🧠 GABRIEL Bootstrap — Apple M2 Ultra // NOIZY.AI"
echo "=================================================="

# Install Homebrew if missing
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Core deps
brew install python@3.11 git curl wget jq cloudflared || true
pip3 install --upgrade pip

# Install Ollama
if ! command -v ollama &>/dev/null; then
  curl -fsSL https://ollama.ai/install.sh | sh
fi

# Pull GABRIEL model stack
echo "📦 Pulling local model stack..."
ollama pull qwen3:14b
ollama pull deepseek-r1:14b
ollama pull nomic-embed-text
ollama pull llava:13b

# Python packages
pip3 install anthropic fastapi uvicorn discord.py SpeechRecognition \
  chromadb httpx python-dotenv slack_sdk aiohttp websockets \
  openai pyaudio pydub asyncio rich

# n8n via npm
if ! command -v n8n &>/dev/null; then
  brew install node
  npm install -g n8n
fi

# ChromaDB data dir
mkdir -p ~/gabriel/chroma_data ~/gabriel/logs ~/gabriel/memory

echo "✅ GABRIEL Bootstrap complete. Now fill .env and run: bash start_gabriel.sh"
