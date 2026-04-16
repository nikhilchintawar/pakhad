# Getting Started

This guide walks you through using pakhad from basic detection to building custom models from your own data.

## Installation

```bash
npm install @pakhad/core @pakhad/locale-en
```

For Indian language support:

```bash
npm install @pakhad/locale-in
```

## Basic Usage

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';

const detector = create({ locales: [en] });

const result = detector.detect('John Smith', { fieldType: 'name' });
console.log(result.label);  // "clean"
console.log(result.score);  // ~0.08
```

That's it. The detector tokenizes the input, runs 8 scorers against the English locale models, and returns a score between 0 (clean) and 1 (gibberish).

## Understanding the Result

```ts
const result = detector.detect('rahul xyzqwe', { fieldType: 'name' });

// Top-level verdict
result.score;   // 0.418 — aggregate score
result.label;   // "suspicious"

// What pakhad inferred about the input
result.fieldType.provided;  // "name" (what you passed)
result.fieldType.inferred;  // "name" (what pakhad detected)

// Locale information
result.locale.script;       // "Latin"
result.locale.candidates;   // ["en"]
result.locale.matched;      // { "rahul": "en", "xyzqwe": "en" }

// Per-token breakdown — this is where the detail lives
for (const token of result.tokens) {
  console.log(`${token.text}: ${token.label} (${token.score})`);
  // "rahul": clean (0.096) — known name in the name list
  // "xyzqwe": gibberish (0.685) — Markov model flags it

  for (const scorer of token.scorers) {
    console.log(`  ${scorer.name}: score=${scorer.score} confidence=${scorer.confidence}`);
  }
}

// Diagnostics
result.warnings;    // [] or ["field_type_mismatch"]
result.durationMs;  // 0.03
result.version;     // "0.1.0"
```

## Field Types

Pakhad scores differently depending on the field type. You can provide it explicitly or let pakhad infer it:

```ts
// Explicit
detector.detect('user@example.com', { fieldType: 'email' });

// Auto-inferred (pakhad detects this is an email)
detector.detect('user@example.com');
```

Supported field types: `name`, `email`, `username`, `sentence`, `address`, `freetext`.

Auto-inference rules:
- Contains `@` and `.` after `@` -- `email`
- Single token, alphanumeric with `_` or digits, 3-30 chars -- `username`
- 1-4 alphabetic tokens, each 2+ chars -- `name`
- 5+ tokens or contains common stopwords -- `sentence`
- Numbers + address keywords (street, ave, apt) -- `address`
- Fallback -- `freetext`

If the provided field type disagrees with the inferred type, pakhad adds `"field_type_mismatch"` to warnings.

## Multi-Language Detection

```ts
import { create } from '@pakhad/core';
import en from '@pakhad/locale-en';
import indiaLocales from '@pakhad/locale-in';

const detector = create({
  locales: [en, ...indiaLocales],
  defaults: { locale: 'auto' },
});

// English name — uses English models
detector.detect('John Smith');

// Indian name — uses Indian locale models
detector.detect('Rahul Sharma');
```

You can also import individual Indian locales:

```ts
import { hi, mr, ta } from '@pakhad/locale-in';

const detector = create({ locales: [en, hi, mr, ta] });
```

Available Indian locales: `hi` (Hindi), `mr` (Marathi), `ta` (Tamil), `te` (Telugu), `kn` (Kannada), `ml` (Malayalam), `bn` (Bengali), `gu` (Gujarati), `pa` (Punjabi).

## Forcing a Locale

```ts
// Only use English models
detector.detect(input, { locale: 'en' });

// Only use Hindi models
detector.detect(input, { locale: 'in-hi' });

// Try Hindi and Marathi
detector.detect(input, { locale: ['in-hi', 'in-mr'] });
```

## Custom Thresholds

The default thresholds are `suspicious: 0.3` and `gibberish: 0.65`. Adjust them based on your tolerance:

```ts
// Strict (flags more inputs)
detector.detect(input, {
  thresholds: { suspicious: 0.2, gibberish: 0.4 },
});

// Lenient (only flags obvious gibberish)
detector.detect(input, {
  thresholds: { suspicious: 0.5, gibberish: 0.8 },
});
```

## Disabling or Reweighting Scorers

```ts
// Disable the keyboard walk scorer
detector.detect(input, {
  scorers: { keyboard_walk: { enabled: false } },
});

// Give the Markov model more weight
detector.detect(input, {
  scorers: { markov: { weight: 0.5 } },
});
```

## Custom Scorers

Register your own scorer to add domain-specific detection logic:

```ts
detector.registerScorer({
  name: 'domain_blocklist',
  defaultWeight: 0.3,
  score(token, ctx) {
    const blocked = ['test', 'fake', 'dummy'];
    if (blocked.includes(token.toLowerCase())) {
      return { score: 0.8, confidence: 1.0, details: { reason: 'blocklisted' } };
    }
    // Return confidence 0 to stay silent (no opinion)
    return { score: 0, confidence: 0 };
  },
});
```

A scorer with `confidence: 0` is silenced -- it doesn't affect the score at all. Use this for scorers that only have an opinion on specific tokens.

## Standalone Utilities

The tokenizer and field-type inference are exported for direct use:

```ts
import { tokenize, inferFieldType } from '@pakhad/core';

const tokens = tokenize('CamelCase123');
// [{ text: "Camel", start: 0, end: 5 },
//  { text: "Case", start: 5, end: 9 },
//  { text: "123", start: 9, end: 12 }]

const fieldType = inferFieldType('user@example.com', tokenize('user@example.com'));
// "email"
```

## Building Custom Models

If you have your own name database or need a locale pakhad doesn't ship:

```ts
import { MarkovModel, BloomFilter } from '@pakhad/train';

// Train from your data
const names = ['your', 'name', 'list', ...];
const markov = MarkovModel.train(names, 3);
const nameList = BloomFilter.fromItems(names, 0.001);

// Use as a locale
import { create } from '@pakhad/core';
const detector = create({
  locales: [{
    id: 'custom',
    script: 'Latin',
    markov,
    nameList,
    metadata: {
      typicalTokenLength: { min: 2, max: 15, mean: 6 },
    },
  }],
});
```

Or use the CLI:

```bash
pakhad-train markov --input names.txt --order 3 --output markov.bin
pakhad-train namelist --input names.txt --fpr 0.001 --output names.bloom
```

See [training-pipeline.md](training-pipeline.md) for the full end-to-end workflow.

## Next Steps

- [API Reference](api.md) -- full API documentation
- [Scorer Reference](scorer-reference.md) -- how each scorer works
- [Locale Guide](locale-guide.md) -- building custom locale packs
- [Training Pipeline](training-pipeline.md) -- corpus to production models
- [Train CLI Reference](train-cli.md) -- CLI command reference
- [Troubleshooting](troubleshooting.md) -- common issues and solutions
