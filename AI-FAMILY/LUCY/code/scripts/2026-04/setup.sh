#!/bin/bash
# ============================================
# LUCY STACK — Master Setup Script
# Run this on your Mac to bootstrap everything
# ============================================

set -e
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Lucy Stack — Full Setup Starting...${NC}"
echo ""

# 1. Check Homebrew
echo -e "${YELLOW}[1/7] Checking Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
echo -e "${GREEN}✅ Homebrew ready${NC}"

# 2. WireGuard
echo -e "${YELLOW}[2/7] Installing WireGuard...${NC}"
brew install wireguard-tools
echo -e "${GREEN}✅ WireGuard installed${NC}"

# 3. Generate WireGuard keys
echo -e "${YELLOW}[3/7] Generating WireGuard keys...${NC}"
mkdir -p ~/.wireguard
wg genkey | tee ~/.wireguard/server_private.key | wg pubkey > ~/.wireguard/server_public.key
chmod 600 ~/.wireguard/server_private.key
echo -e "${GREEN}✅ WireGuard keys generated${NC}"
echo "   📋 Server Public Key: $(cat ~/.wireguard/server_public.key)"

# 4. SSH Key
echo -e "${YELLOW}[4/7] Generating SSH keypair for Lucy...${NC}"
if [ ! -f ~/.ssh/lucy_id_ed25519 ]; then
  ssh-keygen -t ed25519 -C "lucy-stack-$(date +%Y%m%d)" -f ~/.ssh/lucy_id_ed25519 -N ""
fi
echo -e "${GREEN}✅ SSH key ready: ~/.ssh/lucy_id_ed25519${NC}"

# 5. Enable SSH on Mac
echo -e "${YELLOW}[5/7] Enabling SSH (Remote Login)...${NC}"
sudo systemsetup -setremotelogin on 2>/dev/null || echo "  ⚠️  Run manually: System Settings → General → Sharing → Remote Login ON"
echo -e "${GREEN}✅ SSH enabled${NC}"

# 6. Node + n8n
echo -e "${YELLOW}[6/7] Installing n8n...${NC}"
if ! command -v node &> /dev/null; then
  brew install node
fi
npm install -g n8n
echo -e "${GREEN}✅ n8n installed — run with: n8n start${NC}"

# 7. Copy configs
echo -e "${YELLOW}[7/7] Installing configs...${NC}"
cp -n vpn/wireguard-server.conf /etc/wireguard/wg0.conf 2>/dev/null || echo "  ⚠️  Copy vpn/wireguard-server.conf to /etc/wireguard/wg0.conf manually"
cp -n ssh/ssh_config ~/.ssh/config.lucy 2>/dev/null

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}✅ LUCY STACK SETUP COMPLETE${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "📋 NEXT STEPS:"
echo "  1. Edit vpn/wireguard-server.conf — add peer public keys"
echo "  2. Import wireguard-iphone.conf & wireguard-ipad.conf via WireGuard app QR"
echo "  3. Install Airfoil Satellite on iPhone & iPad"
echo "  4. Start n8n: n8n start"
echo "  5. Import postman/lucy-collection.json into Postman"
echo "  6. Add your API keys to config/.env"
echo ""
echo "🌐 Network Map:"
echo "  Mac  (Server) → 10.0.0.1"
echo "  iPhone 15 PM  → 10.0.0.2"
echo "  iPad Pro Lucy → 10.0.0.3"
