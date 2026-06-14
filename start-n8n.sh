#!/usr/bin/env bash
# Bring the n8n automation spine up on :5678 (Docker). Idempotent.
# Data persists in ~/.n8n so your workflows survive restarts.
set -euo pipefail

PORT=5678
VOL="$HOME/.n8n"

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker not found. Install Docker Desktop, then re-run."
  exit 1
fi

mkdir -p "$VOL"

if docker ps --format '{{.Names}}' | grep -q '^n8n$'; then
  echo "✓ n8n already running → http://localhost:$PORT"
  exit 0
fi

# Remove a stopped container of the same name, if any.
docker rm -f n8n >/dev/null 2>&1 || true

echo "Starting n8n…"
docker run -d --name n8n --restart unless-stopped \
  -p ${PORT}:5678 \
  -v "$VOL:/home/node/.n8n" \
  -e GENERIC_TIMEZONE="America/Toronto" \
  -e N8N_DIAGNOSTICS_ENABLED=false \
  docker.n8n.io/n8nio/n8n >/dev/null

echo "✓ n8n up → http://localhost:$PORT"
echo "  Next: open it, then Import → 'n8n-domain-sentinel.workflow.json',"
echo "        set your Slack/webhook URL in the 'Alert (down)' node, and Activate."
