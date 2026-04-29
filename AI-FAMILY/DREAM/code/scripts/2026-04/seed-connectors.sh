#!/bin/bash

# NOIZY Integration Hub - KV Connector Configuration Seeder
# Author: Robert Stephen Plowman
# Date: 2026-04-13
#
# Seeds the KV_CONFIG namespace with connector configurations for the NOIZY Integration Hub.
# Each connector is stored as a JSON value with key pattern "connector:{name}".

set -e

# Configuration
KV_NAMESPACE_ID="2a5acde115a54c8c806d0d7780556d73"
KV_NAMESPACE_BINDING="KV_CONFIG"
DRY_RUN=false
VERBOSE=false

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Counters
SUCCESS_COUNT=0
FAIL_COUNT=0

# Help message
show_help() {
  cat << EOF
NOIZY Integration Hub - Connector Configuration Seeder

Usage: $0 [OPTIONS]

Options:
  --dry-run       Show commands without executing them
  --verbose       Show detailed output
  --help          Display this help message

Environment Variables:
  KV_NAMESPACE_ID  Override the KV namespace ID (default: $KV_NAMESPACE_ID)

Description:
  Seeds the KV_CONFIG namespace with connector configurations. Each connector
  is stored as a JSON value with the key pattern "connector:{name}".

Examples:
  # Dry run to see what would be executed
  $0 --dry-run

  # Verbose output with actual execution
  $0 --verbose

  # Override KV namespace ID
  KV_NAMESPACE_ID=your-custom-id $0

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo -e "${RED}✗ Error: wrangler is not installed${NC}"
  echo "Please install wrangler: npm install -g @cloudflare/wrangler"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}NOIZY Integration Hub - Connector Seeder${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}[DRY RUN MODE] - Commands will be shown but not executed${NC}"
  echo ""
fi

# Define connector configurations
declare -A connectors

# 1. Linear
connectors["linear"]='{
  "name": "linear",
  "enabled": true,
  "auth_type": "api_key",
  "status": "active",
  "mcp_available": false,
  "capabilities": ["list_issues", "create_issue", "update_issue", "list_projects"],
  "notes": "Connected via API key. Webhook configured for issue events (created, updated, closed)."
}'

# 2. GitHub
connectors["github"]='{
  "name": "github",
  "enabled": true,
  "auth_type": "bearer",
  "status": "active",
  "mcp_available": false,
  "capabilities": ["list_repos", "push_events", "pull_requests", "create_webhook"],
  "notes": "Bearer token authentication. Webhook configured for push and PR events."
}'

# 3. Zapier
connectors["zapier"]='{
  "name": "zapier",
  "enabled": true,
  "auth_type": "webhook",
  "status": "active",
  "mcp_available": false,
  "capabilities": ["cloud_execution", "workflow_integration", "third_party_apps"],
  "notes": "Cloud-based workflow automation engine. Executes tasks via Zapier cloud."
}'

# 4. n8n
connectors["n8n"]='{
  "name": "n8n",
  "enabled": true,
  "auth_type": "api_key",
  "status": "active",
  "mcp_available": false,
  "capabilities": ["local_execution", "workflow_automation", "self_hosted"],
  "notes": "Local execution engine running on GOD.local (M2 Ultra). Self-hosted workflow automation."
}'

# 5. Stripe
connectors["stripe"]='{
  "name": "stripe",
  "enabled": false,
  "auth_type": "api_key",
  "status": "disabled",
  "mcp_available": false,
  "capabilities": ["payments", "subscriptions", "billing"],
  "notes": "Not yet configured. Pending API key setup and webhook configuration."
}'

# 6. Google
connectors["google"]='{
  "name": "google",
  "enabled": false,
  "auth_type": "oauth2",
  "status": "pending_setup",
  "mcp_available": false,
  "capabilities": ["docs", "sheets", "drive", "calendar"],
  "notes": "Pending OAuth2 setup. Requires client credentials and redirect URI configuration."
}'

# 7. Microsoft
connectors["microsoft"]='{
  "name": "microsoft",
  "enabled": false,
  "auth_type": "oauth2",
  "status": "pending_setup",
  "mcp_available": false,
  "capabilities": ["office365", "sharepoint", "teams", "onedrive"],
  "notes": "Pending OAuth2 setup. Requires Azure AD application registration."
}'

# 8. Apple
connectors["apple"]='{
  "name": "apple",
  "enabled": false,
  "auth_type": "jwt",
  "status": "pending_setup",
  "mcp_available": false,
  "capabilities": ["app_store_connect", "icloud", "sign_in_with_apple"],
  "notes": "Pending JWT setup. Requires signing certificate and team credentials."
}'

# 9. Notion
connectors["notion"]='{
  "name": "notion",
  "enabled": true,
  "auth_type": "bearer",
  "status": "active",
  "mcp_available": true,
  "capabilities": ["databases", "pages", "blocks", "users"],
  "notes": "MCP server connected in Cowork. Full Notion workspace integration available."
}'

# 10. Slack
connectors["slack"]='{
  "name": "slack",
  "enabled": true,
  "auth_type": "bot_token",
  "status": "active",
  "mcp_available": true,
  "capabilities": ["messages", "channels", "users", "files"],
  "notes": "MCP server connected in Cowork. Bot token authentication with required scopes."
}'

# 11. Anthropic
connectors["anthropic"]='{
  "name": "anthropic",
  "enabled": true,
  "auth_type": "api_key",
  "status": "active",
  "mcp_available": false,
  "capabilities": ["claude_api", "messages", "files", "embeddings"],
  "notes": "API-only integration. Not a subscription service. Uses standard Anthropic API key."
}'

# 12. Postman
connectors["postman"]='{
  "name": "postman",
  "enabled": true,
  "auth_type": "api_key",
  "status": "active",
  "mcp_available": false,
  "capabilities": ["collections", "environments", "monitoring", "ci_runner"],
  "notes": "Newman CLI integration for CI/CD. Executes Postman collections in pipelines."
}'

# Function to put a key-value pair
put_connector() {
  local connector_name="$1"
  local connector_config="$2"
  local key="connector:${connector_name}"

  # Build the wrangler command
  local cmd="wrangler kv:key put --namespace-id ${KV_NAMESPACE_ID} \"${key}\" '${connector_config}'"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${NC} Would execute:"
    echo "  $cmd"
    echo ""
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    if [ "$VERBOSE" = true ]; then
      echo -e "${BLUE}Seeding:${NC} $connector_name"
      echo "  Key: $key"
    fi

    # Execute the command
    if wrangler kv:key put --namespace-id "${KV_NAMESPACE_ID}" "${key}" "${connector_config}" 2>/dev/null; then
      echo -e "${GREEN}✓ Success:${NC} $connector_name"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
      echo -e "${RED}✗ Failed:${NC} $connector_name"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  fi
}

# Seed all connectors
echo "Seeding connectors..."
echo ""

for connector_name in linear github zapier n8n stripe google microsoft apple notion slack anthropic postman; do
  put_connector "$connector_name" "${connectors[$connector_name]}"
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo "Seeding complete!"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verification step
if [ "$DRY_RUN" = false ]; then
  echo "Verifying seeded connectors..."
  echo ""

  if command -v wrangler &> /dev/null; then
    echo -e "${BLUE}All keys in namespace:${NC}"
    if wrangler kv:key list --namespace-id "${KV_NAMESPACE_ID}" --limit 100 2>/dev/null | grep -q "connector:"; then
      wrangler kv:key list --namespace-id "${KV_NAMESPACE_ID}" --limit 100 2>/dev/null | grep "connector:" | head -20
      echo ""
      echo -e "${GREEN}✓ Verification successful!${NC}"
    else
      echo -e "${YELLOW}⚠ No connector keys found. Check namespace ID.${NC}"
    fi
  fi
else
  echo -e "${YELLOW}[DRY RUN MODE]${NC} Skipping verification step"
fi

echo ""
echo -e "Summary: ${GREEN}$SUCCESS_COUNT succeeded${NC}, ${RED}$FAIL_COUNT failed${NC}"
echo ""

# Exit with appropriate code
if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
else
  exit 0
fi
