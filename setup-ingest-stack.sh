#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  setup-ingest-stack.sh — local-first ingestion tools for the empire
#    • markitdown  : any file → Markdown (PDF/Office/images/audio) + MCP server
#    • Scrapling   : adaptive web scraping + MCP server
#  Both run LOCAL. Installed via pipx so they're isolated and on your PATH.
#
#  Run:  bash setup-ingest-stack.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
say(){ printf "\n==> %s\n" "$*"; }

# pipx keeps these CLI tools isolated (avoids macOS "externally-managed" errors)
if ! command -v pipx >/dev/null 2>&1; then
  say "Installing pipx (via Homebrew)"
  command -v brew >/dev/null 2>&1 || { echo "Install Homebrew first: https://brew.sh"; exit 1; }
  brew install pipx
  pipx ensurepath
fi

say "Installing markitdown (all formats) + its MCP server"
pipx install 'markitdown[all]' || pipx upgrade 'markitdown[all]' || true
pipx install markitdown-mcp     || pipx upgrade markitdown-mcp     || true

say "Installing Scrapling (all extras incl. MCP)"
pipx install 'scrapling[all]'   || pipx upgrade 'scrapling[all]'   || true

say "Downloading Scrapling's browsers (for stealth/dynamic fetch)"
scrapling install || true

say "Confirming the Scrapling MCP subcommand on your machine"
scrapling --help 2>&1 | grep -i mcp || echo "  (run 'scrapling --help' and look for the 'mcp' command)"

say "DONE — quick tests:"
echo "  markitdown some.pdf -o out.md      # convert a file"
echo "  scrapling shell                    # interactive scraping shell"
echo
echo "Next: add the MCP servers to Claude (see STACK_SETUP.md)."
