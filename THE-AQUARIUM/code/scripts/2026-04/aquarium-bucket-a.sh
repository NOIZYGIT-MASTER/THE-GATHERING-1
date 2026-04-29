#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# THE GATHERING — aquarium-bucket-a.sh
# Produce Bucket A migration candidates per MANIFEST_AQUARIUM_CONSOLIDATION.
#
# Filters (cumulative AND):
#   ✓ path contains 'aquarium' (case-insensitive)
#   ✓ extension in {wav, aif, aiff, flac, mp3, m4a, opus}
#   ✗ excludes node_modules / test / tests / fixtures / samples / __pycache__
#   ✗ excludes TV-show patterns (lost season, /Series/, /SEASON N/)
#   ✗ excludes audio-codec test fixtures (test-NNNN(H|h)z- basename pattern)
#   ✗ excludes any path inside .build/checkouts or .build/index-build
#   ✗ excludes /vendor/ paths (third-party)
#
# Outputs:
#   AQUARIUM_BUCKET_A_candidates.txt  — final filtered candidate list
#   AQUARIUM_BUCKET_A_dupes.tsv       — basename collisions (dupe candidates)
#   AQUARIUM_BUCKET_A_unique.txt      — unique-basename candidates only
#   AQUARIUM_BUCKET_A_summary.md      — counts + notes
#
# Output goes to:  ~/THE-GATHERING/AQUARIUM_BUCKET_A/
#
# ⚠️  This script DOES NOT MOVE FILES. It only produces lists for RSP review.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
set +e

GATHERING="${HOME}/THE-GATHERING"
DATA_FILE="$GATHERING/categories/01_data.txt"
OUT_DIR="$GATHERING/AQUARIUM_BUCKET_A"

if [[ ! -f "$DATA_FILE" ]]; then
  echo "ERROR: $DATA_FILE not found — run aggregate.sh first" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

CANDIDATES="$OUT_DIR/AQUARIUM_BUCKET_A_candidates.txt"
DUPES="$OUT_DIR/AQUARIUM_BUCKET_A_dupes.tsv"
UNIQUE="$OUT_DIR/AQUARIUM_BUCKET_A_unique.txt"
SUMMARY="$OUT_DIR/AQUARIUM_BUCKET_A_summary.md"

START_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "═══ AQUARIUM BUCKET A FILTER ═══ $START_TS"
echo "Source: $DATA_FILE"
echo ""

# Apply the cumulative filter
grep -i 'aquarium' "$DATA_FILE" 2>/dev/null \
  | grep -iE '\.(wav|aif|aiff|flac|m4a|mp3|opus)$' \
  | grep -ivE '/(node_modules|test|tests|fixtures|samples|__pycache__|vendor)/' \
  | grep -ivE '/Series/|lost season|/SEASON [0-9]+' \
  | grep -ivE '/test-[0-9]+[Hh]z-' \
  | grep -ivE '/\.build/(checkouts|index-build)/' \
  | grep -ivE '/ ?Music 20(0[0-9]|1[0-9]|2[0-9])/' \
  | grep -ivE '/(Aqua|Tori Amos|Hector Berlioz|Saint-Sa[eë]ns|Beatles|Pink Floyd|Dire Straits|Steely Dan|Miles Davis|Coltrane|Hendrix|Bowie|Madonna|Drake|Kanye|Beyonc[eé]|Taylor Swift|Adele|Eminem|Coldplay|Radiohead)/' \
  | sort -u > "$CANDIDATES"

CAND_N=$(wc -l < "$CANDIDATES" | tr -d ' ')

echo "Candidates after filter: $CAND_N"

# Find basename collisions (likely duplicates across drives)
awk -F'/' '{print $NF "\t" $0}' "$CANDIDATES" \
  | sort -t$'\t' -k1,1 \
  | awk -F'\t' '
    {
      bn = $1
      path = $2
      counts[bn]++
      paths[bn] = (paths[bn] == "" ? path : paths[bn] "\n" path)
    }
    END {
      for (bn in counts) {
        if (counts[bn] > 1) {
          n = counts[bn]
          print n "\t" bn
        }
      }
    }
  ' | sort -rn > "$DUPES"

DUPE_BN_N=$(wc -l < "$DUPES" | tr -d ' ')
DUPE_FILES_N=$(awk '{sum+=$1} END {print sum+0}' "$DUPES")

# Unique-basename candidates (each basename appears only once across the empire)
awk -F'/' '{print $NF "\t" $0}' "$CANDIDATES" \
  | sort -t$'\t' -k1,1 \
  | awk -F'\t' '
    BEGIN { prev_bn = ""; prev_path = ""; count = 0 }
    {
      bn = $1
      if (bn != prev_bn) {
        if (count == 1) print prev_path
        prev_bn = bn
        prev_path = $2
        count = 1
      } else {
        count++
      }
    }
    END { if (count == 1) print prev_path }
  ' > "$UNIQUE"

UNIQUE_N=$(wc -l < "$UNIQUE" | tr -d ' ')

# Distribution by drive
DRIVE_DIST=$(awk -F'/' '{print "/" $2 "/" $3 "/" $4}' "$CANDIDATES" | sort | uniq -c | sort -rn | head -10)

# Distribution by extension
EXT_DIST=$(awk -F. '{print tolower($NF)}' "$CANDIDATES" | sort | uniq -c | sort -rn)

# Build summary
{
  echo "# AQUARIUM Bucket A — Migration Candidates"
  echo ""
  echo "**Generated:** $START_TS"
  echo "**Source:** \`$DATA_FILE\` (filter applied via \`aquarium-bucket-a.sh\`)"
  echo "**Action class:** Read-only analysis. No files moved."
  echo ""
  echo "## Counts"
  echo ""
  echo "| Metric | Value |"
  echo "|---|---:|"
  echo "| Total candidates after filter | $CAND_N |"
  echo "| Unique-basename candidates | $UNIQUE_N |"
  echo "| Basenames with collisions | $DUPE_BN_N |"
  echo "| Files involved in basename collisions | $DUPE_FILES_N |"
  echo ""
  echo "## Top drives (where candidates live)"
  echo ""
  echo "\`\`\`"
  echo "$DRIVE_DIST"
  echo "\`\`\`"
  echo ""
  echo "## Extension distribution"
  echo ""
  echo "\`\`\`"
  echo "$EXT_DIST"
  echo "\`\`\`"
  echo ""
  echo "## Files"
  echo ""
  echo "- Full candidate list: \`AQUARIUM_BUCKET_A_candidates.txt\` ($CAND_N lines)"
  echo "- Unique-basename only: \`AQUARIUM_BUCKET_A_unique.txt\` ($UNIQUE_N lines) — safest migration set"
  echo "- Basename collisions: \`AQUARIUM_BUCKET_A_dupes.tsv\` ($DUPE_BN_N basenames, $DUPE_FILES_N files) — needs RSP review"
  echo ""
  echo "## How to review duplicates"
  echo ""
  echo "For each basename in \`AQUARIUM_BUCKET_A_dupes.tsv\`, multiple paths share the name. RSP picks the canonical one:"
  echo ""
  echo "\`\`\`bash"
  echo "head -20 ~/THE-GATHERING/AQUARIUM_BUCKET_A/AQUARIUM_BUCKET_A_dupes.tsv"
  echo "# pick a basename; find all matching paths:"
  echo "grep '/<basename>\$' ~/THE-GATHERING/AQUARIUM_BUCKET_A/AQUARIUM_BUCKET_A_candidates.txt"
  echo "\`\`\`"
  echo ""
  echo "## Safety guarantees (per Rule 5)"
  echo ""
  echo "- ❌ This script never moves, copies, or deletes files."
  echo "- ❌ This script never reads file contents — only paths from the catalog."
  echo "- ✅ All output is plain-text TSV/markdown, safe to inspect or discard."
  echo ""
  echo "**With every beat of my heart:** RSP_001 — **GORUNFREE.**"
} > "$SUMMARY"

echo ""
echo "═══ DONE ═══"
echo "Candidates: $CAND_N"
echo "Unique-basename: $UNIQUE_N"
echo "Dupe basenames: $DUPE_BN_N (involving $DUPE_FILES_N files)"
echo ""
echo "Output: $OUT_DIR/"
echo "Summary: $SUMMARY"
