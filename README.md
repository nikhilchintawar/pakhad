# pakhad

**pakhad** (pronounced "paa-khud") — Marathi for the act of winnowing grain: tossing it in
a sup so the wind carries away the chaff and only the real grain remains.
This package does the same for text -- separating real names, words, and
inputs from the keyboard-mashed, bot-generated, and fake. Built for
fintech signups, KYC, and anywhere else you need to tell the grain from
the chaff.

## Quick Start

```bash
npm install @pakhad/core @pakhad/locale-en
```

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({ locales: [en] });

// Real name -> clean
const result = detector.detect('Sarah Johnson', { fieldType: 'name' });
console.log(result.label); // "clean"
console.log(result.score); // ~0.05

// Keyboard mash -> gibberish
const gibberish = detector.detect('asdfgh qwerty', { fieldType: 'name' });
console.log(gibberish.label); // "gibberish"
console.log(gibberish.score); // ~0.8
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
- `@pakhad/locale-en` — English (US Census + UK ONS names)

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

## Requirements

- Node.js >= 20
- TypeScript >= 5.0 (for type definitions)

## License

MIT
