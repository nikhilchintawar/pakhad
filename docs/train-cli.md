# Train CLI Reference

`pakhad-train` is the CLI for building Markov models and bloom filter name lists from your own corpora.

## Installation

The CLI ships with `@pakhad/train`:

```bash
npm install @pakhad/train
npx pakhad-train --help
```

Or in a monorepo workspace:

```bash
node packages/train/dist/cli.js --help
```

## Commands

### `pakhad-train markov`

Build a character n-gram Markov model from a text corpus.

```bash
pakhad-train markov --input <file> [options] --output <file>
```

**Options:**

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--input` | `-i` | required | Input corpus file (one entry per line) |
| `--output` | `-o` | required | Output binary model file (.bin) |
| `--order` | | `3` | N-gram order (2 = bigram, 3 = trigram) |
| `--min-length` | | `2` | Minimum entry length to include |
| `--max-length` | | `50` | Maximum entry length to include |

**Example:**

```bash
pakhad-train markov --input corpora/en-names.txt --order 3 --output models/markov.bin
```

**Output:**

```
Loading corpus from corpora/en-names.txt...
  165326 unique entries loaded
Training 3-gram Markov model...
  8650 n-grams, alphabet size: 26
  Written to models/markov.bin (77870 bytes)

Sanity check (corpus samples):
  "smith" -> score: 0.231
  "johnson" -> score: 0.198
Sanity check (gibberish):
  "xkqzvb" -> score: 0.931
  "asdfgh" -> score: 0.741
```

The CLI automatically runs a sanity check after training, showing scores for a few corpus entries (should be low) and known gibberish strings (should be high).

---

### `pakhad-train namelist`

Build a bloom filter from a list of names or words.

```bash
pakhad-train namelist --input <file> [options] --output <file>
```

**Options:**

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--input` | `-i` | required | Input corpus file (one entry per line) |
| `--output` | `-o` | required | Output binary bloom filter file (.bloom) |
| `--false-positive-rate` | `--fpr` | `0.001` | Target false positive rate (0.001 = 0.1%) |
| `--min-length` | | `2` | Minimum entry length to include |
| `--max-length` | | `50` | Maximum entry length to include |

**Example:**

```bash
pakhad-train namelist --input corpora/en-names.txt --fpr 0.001 --output models/names.bloom
```

**Output:**

```
Loading corpus from corpora/en-names.txt...
  165326 unique entries loaded
Building bloom filter (target FPR: 0.1000%)...
  165326 items, 2376990 bits, 10 hashes
  Estimated FPR: 0.1000%
  Written to models/names.bloom (297144 bytes)
```

---

### `pakhad-train dictionary`

Build a bloom filter from a dictionary/word list. Identical to `namelist` but exists as a separate command for clarity when building dictionary-type bloom filters (used for sentence-mode scoring).

```bash
pakhad-train dictionary --input words.txt --fpr 0.001 --output dict.bloom
```

---

### `pakhad-train info`

Inspect a binary model file to see its type and metadata.

```bash
pakhad-train info <file>
```

**Example (Markov model):**

```bash
pakhad-train info models/markov.bin
```

```
Type:           Markov model
Order:          3
N-grams:        8650
Alphabet size:  26
File size:      77870 bytes
```

**Example (Bloom filter):**

```bash
pakhad-train info models/names.bloom
```

```
Type:           Bloom filter
Bits:           2376990
Hash functions: 10
Items inserted: 165326
Estimated FPR:  0.1000%
File size:      297144 bytes
```

## Input Format

The input corpus is a plain text file with one entry per line:

```
john
sarah
michael
jessica
# Lines starting with # are comments
william
```

The CLI automatically:
- Trims whitespace
- Converts to lowercase
- Removes blank lines and comments (`#`)
- Deduplicates entries
- Filters by `--min-length` and `--max-length`

## Choosing Parameters

### Markov Order

| Order | Name | Pros | Cons |
|-------|------|------|------|
| 2 | Bigram | Works with very short tokens (2+ chars), faster | Less discriminative |
| 3 | Trigram | Good balance of accuracy and coverage | Needs 3+ char tokens |
| 4 | 4-gram | More discriminative for long tokens | Sparse for small corpora |

**Recommendation:** Use order 3 (trigram) for most Latin-script languages. Use order 2 for languages with very short tokens.

### False Positive Rate

| FPR | Bloom Size (10k items) | Bloom Size (100k items) | Use Case |
|-----|----------------------|------------------------|----------|
| 0.01 (1%) | ~12 KB | ~120 KB | Low-memory environments |
| 0.001 (0.1%) | ~18 KB | ~180 KB | General purpose (recommended) |
| 0.0001 (0.01%) | ~24 KB | ~240 KB | High-accuracy requirements |

**Recommendation:** 0.001 (0.1%) is the sweet spot. Lower FPR means larger bloom filter files but fewer false matches.

### Corpus Size

| Corpus Size | Markov Quality | Name List Coverage |
|------------|---------------|-------------------|
| 100 names | Minimal | Low |
| 1,000 names | Decent | Moderate |
| 10,000 names | Good | Good |
| 100,000+ names | Excellent | Excellent |

**Recommendation:** Aim for 10,000+ names for production quality. The English locale ships with 165,000+ names.
