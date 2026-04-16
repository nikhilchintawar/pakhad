#!/usr/bin/env bash
# Build the English name corpus from US Census surnames + SSA baby names.
# Output: corpora/en-names.txt (one lowercase name per line, deduplicated)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CORPORA_DIR="$ROOT_DIR/corpora"
OUTPUT="$CORPORA_DIR/en-names.txt"

echo "Processing US Census 2010 surnames..."
# Skip header, extract name column, lowercase
SURNAMES=$(tail -n +2 /tmp/census-surnames/Names_2010Census.csv | cut -d',' -f1 | tr '[:upper:]' '[:lower:]')
SURNAME_COUNT=$(echo "$SURNAMES" | wc -l | tr -d ' ')
echo "  $SURNAME_COUNT surnames"

echo "Processing SSA baby names..."
# Skip header, extract name column, lowercase, deduplicate
FIRST_NAMES=$(tail -n +2 /tmp/ssa-baby-names.csv | cut -d',' -f2 | tr -d '"' | tr '[:upper:]' '[:lower:]' | sort -u)
FIRST_COUNT=$(echo "$FIRST_NAMES" | wc -l | tr -d ' ')
echo "  $FIRST_COUNT unique first names"

echo "Merging and deduplicating..."
{
  echo "$SURNAMES"
  echo "$FIRST_NAMES"
} | sort -u | grep -E '^[a-z]{2,}$' > "$OUTPUT"

TOTAL=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Written $TOTAL unique names to $OUTPUT"
