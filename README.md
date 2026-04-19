# pakhad

**pakhad** (pronounced "paa-khud") — Marathi for the act of winnowing grain: tossing it in
a sup so the wind carries away the chaff and only the real grain remains.
This package does the same for text -- separating real names, words, and
inputs from the keyboard-mashed, bot-generated, and fake. Built for
fintech signups, KYC, and anywhere else you need to tell the grain from
the chaff.

## Quick Start

**Zero-config (recommended for most users):**

```bash
npm install @pakhad/default
```

```ts
import { detect } from '@pakhad/default';

detect('Sarah Johnson');   // { label: 'clean', score: 0.05 }
detect('Rahul Sharma');     // { label: 'clean', score: 0.09 }
detect('asdfgh qwerty');   // { label: 'gibberish', score: 0.8 }
```

Includes English + 9 Indian language locales out of the box.

**Custom setup (smaller bundle, pick your locales):**

```bash
npm install @pakhad/core @pakhad/locale-en
```

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({ locales: [en] });
detector.detect('Sarah Johnson', { fieldType: 'name' });
```

## How It Works

Pakhad uses an ensemble of lightweight, pure-computation scorers that analyze text at the character level:

| Scorer | What it detects | Example |
|--------|----------------|---------|
| **markov** | Unlikely character sequences via n-gram model | `xkqzvb` (no real language has this trigram pattern) |
| **entropy** | Abnormal character distribution | `aaaa` (too repetitive) |
| **keyboard_walk** | QWERTY/AZERTY adjacency walks | `asdfgh`, `qwerty` |
| **repetition** | Run-length and pattern repetition | `abcabc`, `zzzzz` |
| **vowel_consonant** | Impossible vowel/consonant ratios | `bcdfgh` (no vowels) |
| **name_list** | Known name lookup via bloom filter | `Sarah` (known name = clean) |
| **numeric_pattern** | Sequential/repeated digit patterns | `123456`, `99999` |
| **length_anomaly** | Extremely short or long tokens | Single chars, 50+ char tokens |

Each scorer returns a **score** (0-1, how gibberish-like) and a **confidence** (0-1, how sure it is). The ensemble combines them via confidence-weighted average per token, then length-weighted mean across tokens.

## API

See [docs/api.md](docs/api.md) for the full API reference.

### `create(config)`

Create a detector instance with locale packs and defaults.

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({
  locales: [en],
  defaults: { fieldType: undefined, locale: 'auto' },
});
```

### `detector.detect(input, options?)`

Analyze a string and return a `DetectResult`.

```ts
const result = detector.detect('rahul xyzqwe', { fieldType: 'name' });
```

**Options:**
- `fieldType` — `"name"`, `"email"`, `"username"`, `"sentence"`, `"address"`, `"freetext"`
- `locale` — `"auto"`, a locale ID, or an array of locale IDs
- `thresholds` — `{ suspicious?: number, gibberish?: number }`
- `scorers` — per-scorer overrides: `{ scorer_name: { enabled?: boolean, weight?: number } }`

### `detector.registerScorer(scorer)`

Register a custom scorer or replace a built-in one.

```ts
detector.registerScorer({
  name: 'my_custom_scorer',
  defaultWeight: 0.2,
  score(token, ctx) {
    return { score: 0, confidence: 0.5 };
  },
});
```

## Locale Packs

Pakhad separates the detection engine from language-specific data. Each locale pack provides:

- **Markov model** — character n-gram transition probabilities
- **Name list** — bloom filter of known names
- **Dictionary** — (optional) bloom filter of known words

Available packs:
- `@pakhad/default` — zero-config bundle (core + English + all Indian locales)
- `@pakhad/locale-en` — English (165k names from US Census + SSA baby names)
- `@pakhad/locale-in` — Indian languages: Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi (9k+ names per language)

```ts
import en from '@pakhad/locale-en';
import indiaLocales, { hi, mr } from '@pakhad/locale-in';

// Use all locales
const detector = create({ locales: [en, ...indiaLocales] });

// Or pick specific ones
const detector2 = create({ locales: [en, hi, mr] });
```

See [docs/locale-guide.md](docs/locale-guide.md) for how to build custom locale packs from your own data.

## Building Custom Models

Use `@pakhad/train` to build models from your own corpora:

```bash
npm install @pakhad/train

# Build a trigram Markov model from a names file
pakhad-train markov --input your-names.txt --order 3 --output markov.bin

# Build a bloom filter name list
pakhad-train namelist --input your-names.txt --false-positive-rate 0.001 --output names.bloom
```

Or use the programmatic API:

```ts
import { MarkovModel, BloomFilter } from '@pakhad/train';

const markov = MarkovModel.train(namesArray, 3);
const bloom = BloomFilter.fromItems(namesArray, 0.001);
```

## Result Shape

```ts
interface DetectResult {
  score: number;              // 0 = clean, 1 = gibberish
  label: "clean" | "suspicious" | "gibberish";
  fieldType: { provided: FieldType | null; inferred: FieldType };
  locale: { mode: LocaleMode; script: string; candidates: string[]; matched: Record<string, string> };
  tokens: TokenResult[];      // per-token breakdown with per-scorer details
  warnings: string[];
  durationMs: number;
  version: string;
}
```

## Benchmarks

Tested against **1,000 real names** (500 English + 500 Indian) and **1,000 gibberish strings**:

### Classification Accuracy

| Library | Precision | Recall | F1 | Accuracy | FP (real flagged) | FN (gibberish missed) |
|---------|-----------|--------|-----|----------|-------------------|------------------------|
| **pakhad** | **100.0%** | **98.8%** | **99.4%** | **99.4%** | **0 / 1000** | 12 / 1000 |
| gibberish-detector | 50.0% | 100.0% | 66.7% | 50.0% | 1000 / 1000 | 0 / 1000 |
| gibberish-detective | 79.0% | 83.5% | 81.2% | 80.7% | 222 / 1000 | 165 / 1000 |

### False Positives on Real Names

| Library | English Names | Indian Names |
|---------|---------------|--------------|
| **pakhad** | **0 / 500 (0.0%)** | **0 / 500 (0.0%)** |
| gibberish-detector | 500 / 500 (100.0%) | 500 / 500 (100.0%) |
| gibberish-detective | 75 / 500 (15.0%) | 147 / 500 (29.4%) |

### Latency

| Library | p50 | p95 | p99 |
|---------|-----|-----|-----|
| pakhad | 0.007ms | 0.015ms | 0.018ms |
| gibberish-detector | 0.001ms | 0.004ms | 0.005ms |
| gibberish-detective | 0.010ms | 0.012ms | 0.018ms |

Run benchmarks yourself: `pnpm bench`

## Documentation

- [Getting Started](docs/getting-started.md) -- progressive guide from basic to advanced
- [API Reference](docs/api.md) -- full API documentation
- [Scorer Reference](docs/scorer-reference.md) -- how each scorer works
- [Locale Guide](docs/locale-guide.md) -- using and building locale packs
- [Train CLI Reference](docs/train-cli.md) -- CLI command reference
- [Training Pipeline](docs/training-pipeline.md) -- corpus to production models
- [Troubleshooting](docs/troubleshooting.md) -- common issues and FAQ

## Requirements

- Node.js >= 20
- TypeScript >= 5.0 (for type definitions)

## License

MIT
