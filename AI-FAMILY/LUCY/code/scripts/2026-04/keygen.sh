#!/bin/bash
# ============================================
# Generate SSH Keys for Lucy Stack
# ============================================
echo "🔑 Generating ED25519 SSH keypair for Lucy..."
ssh-keygen -t ed25519 -C "lucy-stack@$(date +%Y%m%d)" -f ~/.ssh/lucy_id_ed25519

echo ""
echo "✅ Keys generated:"
echo "   Private: ~/.ssh/lucy_id_ed25519"
echo "   Public:  ~/.ssh/lucy_id_ed25519.pub"
echo ""
echo "📋 Your public key (add to each device):"
cat ~/.ssh/lucy_id_ed25519.pub
