#!/bin/bash
# MC96 ECO UNIVERSE — DEEP DRIVE AUDITOR
# Run this from your live terminal session (with Full Disk Access)
# Usage: bash ~/Desktop/CLAUDE\ TODAY/mc96_deep_audit.sh

OUTPUT="/Users/m2ultra/Desktop/CLAUDE TODAY/MC96_DRIVE_AUDIT_$(date +%Y%m%d_%H%M).md"

echo "# MC96 ECO — FULL DRIVE AUDIT" > "$OUTPUT"
echo "### Generated: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Function to audit a volume
audit_volume() {
    local vol="$1"
    local name="$2"
    
    echo "## 📀 $name ($vol)" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    if [ ! -d "$vol" ]; then
        echo "❌ Volume not mounted" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
        return
    fi
    
    # Capacity
    echo "### Storage" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    df -h "$vol" 2>/dev/null >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    # Top-level contents
    echo "### Top-Level Contents" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    ls -la "$vol/" 2>/dev/null >> "$OUTPUT" || echo "⚠️ Permission denied" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    # Directory tree (2 levels deep, no hidden)
    echo "### Directory Tree (depth 2)" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    find "$vol" -maxdepth 2 -type d -not -name '.*' 2>/dev/null | head -100 >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    # Largest dirs at root
    echo "### Largest Root Directories" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    du -sh "$vol"/*/ 2>/dev/null | sort -rh | head -20 >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    # File type breakdown
    echo "### File Type Breakdown (top 20)" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    find "$vol" -maxdepth 4 -type f 2>/dev/null | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20 >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    echo "---" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
}

echo "🔍 Starting MC96 Eco Deep Audit..."
echo ""

# Direct-Attached Drives
audit_volume "/Volumes/SIDNEY" "SIDNEY (3TB HFS+)"
echo "✅ SIDNEY done"

audit_volume "/Volumes/MAG 4TB" "MAG 4TB (HFS+)"
echo "✅ MAG 4TB done"

audit_volume "/Volumes/NOIZYWIN" "NOIZYWIN (FAT32)"
echo "✅ NOIZYWIN done"

audit_volume "/Volumes/6TB" "6TB (HFS+)"
echo "✅ 6TB done"

audit_volume "/Volumes/4TBSG" "4TBSG (HFS+)"
echo "✅ 4TBSG done"

audit_volume "/Volumes/4TB Lacie" "4TB Lacie (HFS+)"
echo "✅ 4TB Lacie done"

audit_volume "/Volumes/2TB_SGW" "2TB_SGW (APFS)"
echo "✅ 2TB_SGW done"

# Mac Pro Network Shares
audit_volume "/Volumes/4TB Big Fish" "4TB Big Fish (SMB)"
echo "✅ 4TB Big Fish done"

audit_volume "/Volumes/4TB Blue Fish" "4TB Blue Fish (SMB)"
echo "✅ 4TB Blue Fish done"

audit_volume "/Volumes/4TB FISH SG" "4TB FISH SG (SMB)"
echo "✅ 4TB FISH SG done"

audit_volume "/Volumes/FISH" "FISH (SMB)"
echo "✅ FISH done"

audit_volume "/Volumes/RSP" "RSP (SMB)"
echo "✅ RSP done"

audit_volume "/Volumes/RSP_GOFISH" "RSP_GOFISH (SMB)"
echo "✅ RSP_GOFISH done"

echo ""
echo "🎉 AUDIT COMPLETE — Results saved to:"
echo "$OUTPUT"
echo ""
echo "File size: $(wc -c < "$OUTPUT") bytes"
