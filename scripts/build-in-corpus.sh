#!/usr/bin/env bash
# Build the Indian pan-language name corpus from downloaded datasets.
# Output: corpora/in-names.txt (one lowercase name per line, deduplicated)
#
# Sources:
# - laxmimerit/indian-names-dataset (male + female CSVs, ~30k total)
# - skannan-maf/Indian-names (full names, ~7k)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CORPORA_DIR="$ROOT_DIR/corpora"
OUTPUT="$CORPORA_DIR/in-names.txt"

mkdir -p "$CORPORA_DIR"

echo "Processing laxmimerit Indian male names..."
# CSV format: name,gender,race
# Extract column 1, skip header, split on spaces (full names -> individual tokens)
MALE=$(tail -n +2 /tmp/indian-male.csv | cut -d',' -f1 | tr '[:upper:]' '[:lower:]' | tr -s ' ' '\n')

echo "Processing laxmimerit Indian female names..."
FEMALE=$(tail -n +2 /tmp/indian-female.csv | cut -d',' -f1 | tr '[:upper:]' '[:lower:]' | tr -s ' ' '\n')

echo "Processing skannan-maf Indian full names..."
# Text file: one full name per line (e.g. "Samarth Waykos")
FULL=$(cat /tmp/indian-full.txt | tr '[:upper:]' '[:lower:]' | tr -s ' ' '\n')

echo "Merging, filtering, deduplicating..."
{
  echo "$MALE"
  echo "$FEMALE"
  echo "$FULL"
} | sort -u | grep -E '^[a-z]{2,}$' > "$OUTPUT"

TOTAL=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Written $TOTAL unique names to $OUTPUT"
